import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js';
import { calculatePropertyTax } from '../tax/taxEngine.js';
import { recordAuditLog } from '../utils/auditLogger.js';
import { sendNotification } from '../utils/notificationHelper.js';
import { emitBroadcast } from '../services/socket.js';

export const propertyRouter = Router();

// Helper to get active tax setting
async function getActiveTaxSetting() {
  const setting = await prisma.taxSetting.findFirst({
    where: { isActive: true },
  });
  if (!setting) {
    throw new Error('No active tax setting found.');
  }
  return setting;
}

// -------------------------------------------------------------
// MODULE 1: PUBLIC LOOKUP & STATS (NO LOGIN REQUIRED)
// -------------------------------------------------------------

// 1. "Check Your Tax" by Property ID
propertyRouter.get('/public/lookup/:propertyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const property = await prisma.property.findUnique({
      where: { propertyId: propertyId.trim().toUpperCase() },
      include: {
        owner: {
          select: {
            fullName: true,
            isSeniorCitizen: true,
          },
        },
        payments: {
          where: { assessmentYear: 2026, status: 'SUCCESS' },
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: `Property ID "${propertyId}" not found in municipal register. Please verify the ID on your previous bill or registry document.`,
      });
      return;
    }

    const taxSetting = await getActiveTaxSetting();
    const taxBreakdown = calculatePropertyTax(property, property.owner, taxSetting);

    const isPaid = property.payments.length > 0;

    res.json({
      success: true,
      property: {
        id: property.id,
        propertyId: property.propertyId,
        wardNumber: property.wardNumber,
        address: property.address,
        propertyType: property.propertyType,
        builtUpAreaSqFt: property.builtUpAreaSqFt,
        constructionYear: property.constructionYear,
        isExempt: property.isExempt,
        exemptionReason: property.exemptionReason,
        hasArrears: property.hasArrears,
        arrearsAmount: property.arrearsAmount,
        ownerName: property.owner.fullName,
        isSeniorCitizen: property.owner.isSeniorCitizen,
        isPaid,
        latestReceipt: isPaid ? property.payments[0].receiptNumber : null,
      },
      taxBreakdown,
    });
  } catch (error) {
    console.error('Public tax lookup error:', error);
    res.status(500).json({ success: false, message: 'Failed to look up property tax.' });
  }
});

// 2. Public Live Home Stats
propertyRouter.get('/public/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const [totalProperties, totalPayments, totalCitizens] = await Promise.all([
      prisma.property.count(),
      prisma.payment.aggregate({
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.user.count({ where: { role: 'CITIZEN' } }),
    ]);

    const activeTaxSetting = await prisma.taxSetting.findFirst({
      where: { isActive: true },
    });

    res.json({
      success: true,
      stats: {
        totalRegisteredProperties: totalProperties,
        totalTaxCollected: totalPayments._sum.totalAmount || 0,
        totalTransactions: totalPayments._count,
        registeredCitizens: totalCitizens,
        currentFinancialYear: activeTaxSetting?.financialYear || '2026-2027',
        earlyBirdRebatePercent: activeTaxSetting?.earlyBirdRebatePercent || 5,
        seniorCitizenRebatePercent: activeTaxSetting?.seniorCitizenRebatePercent || 10,
        dueDate: activeTaxSetting?.dueDate || '2026-12-31',
        earlyBirdCutoffDate: activeTaxSetting?.earlyBirdCutoffDate || '2026-11-30',
      },
    });
  } catch (error) {
    console.error('Public stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve portal stats.' });
  }
});

// -------------------------------------------------------------
// LIVE TAX PREVIEW (Instant computation without saving)
// -------------------------------------------------------------
propertyRouter.post('/preview-tax', async (req: Request, res: Response): Promise<void> => {
  try {
    const { builtUpAreaSqFt, propertyType, constructionYear, isExempt, exemptionReason, isSeniorCitizen } =
      req.body;

    const taxSetting = await getActiveTaxSetting();
    const taxBreakdown = calculatePropertyTax(
      {
        builtUpAreaSqFt: Number(builtUpAreaSqFt) || 0,
        propertyType: propertyType || 'RESIDENTIAL',
        constructionYear: Number(constructionYear) || new Date().getFullYear(),
        isExempt: Boolean(isExempt),
        exemptionReason,
      },
      { isSeniorCitizen: Boolean(isSeniorCitizen) },
      taxSetting
    );

    res.json({ success: true, taxBreakdown });
  } catch (error) {
    console.error('Tax preview error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate tax preview.' });
  }
});

// -------------------------------------------------------------
// MODULE 3: AUTHENTICATED PROPERTY REGISTER CRUD & ROLE ISOLATION
// -------------------------------------------------------------

// List Properties (Scoped by Role)
propertyRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { ward, type, status, search, exemptOnly } = req.query;

    const where: any = {};

    // 1. Enforce Role Isolation
    if (user.role === 'CITIZEN') {
      where.ownerId = user.id;
    } else if (user.role === 'WARD_OFFICER') {
      // Must only see properties in assigned wards
      where.wardNumber = { in: user.assignedWards };
    }
    // ADMIN has full access (no base filter)

    // 2. Apply Optional Filters
    if (ward && typeof ward === 'string' && ward !== 'ALL') {
      // If ward officer, check they are assigned to this ward
      if (user.role === 'WARD_OFFICER' && !user.assignedWards.includes(ward)) {
        res.status(403).json({
          success: false,
          message: `Access denied. Ward ${ward} is not assigned to you.`,
        });
        return;
      }
      where.wardNumber = ward;
    }

    if (type && typeof type === 'string' && type !== 'ALL') {
      where.propertyType = type;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (exemptOnly === 'true') {
      where.isExempt = true;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { propertyId: { contains: q } },
        { address: { contains: q } },
        { owner: { fullName: { contains: q } } },
        { owner: { mobile: { contains: q } } },
      ];
    }

    const properties = await prisma.property.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            isSeniorCitizen: true,
          },
        },
        payments: {
          where: { assessmentYear: 2026, status: 'SUCCESS' },
          orderBy: { paidAt: 'desc' },
        },
        instalments: {
          where: { financialYear: '2026-2027' },
          orderBy: { partNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const taxSetting = await getActiveTaxSetting();

    // Compute live dynamic tax for each property
    const enriched = properties.map((prop) => {
      const taxBreakdown = calculatePropertyTax(prop, prop.owner, taxSetting);
      const isPaid = prop.payments.length > 0;
      return {
        ...prop,
        isPaid,
        taxBreakdown,
        latestPayment: isPaid ? prop.payments[0] : null,
      };
    });

    res.json({ success: true, count: enriched.length, properties: enriched });
  } catch (error) {
    console.error('List properties error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve properties.' });
  }
});

// Get Single Property Details with History & Computations
propertyRouter.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const property = await prisma.property.findFirst({
      where: {
        OR: [{ id }, { propertyId: id }],
      },
      include: {
        owner: true,
        ownershipHistory: { orderBy: { startDate: 'desc' } },
        payments: { orderBy: { paidAt: 'desc' } },
        instalments: { orderBy: { partNumber: 'asc' } },
        demandNotices: { orderBy: { issueDate: 'desc' } },
        grievances: { orderBy: { createdAt: 'desc' } },
        transfers: { orderBy: { createdAt: 'desc' } },
        reassessments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found.' });
      return;
    }

    // Role Guard Check
    if (user.role === 'CITIZEN' && property.ownerId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only view details of your own property.',
      });
      return;
    }

    if (user.role === 'WARD_OFFICER' && !user.assignedWards.includes(property.wardNumber)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Property in ward ${property.wardNumber} is not in your assigned jurisdiction.`,
      });
      return;
    }

    const taxSetting = await getActiveTaxSetting();
    const taxBreakdown = calculatePropertyTax(property, property.owner, taxSetting);

    res.json({
      success: true,
      property: {
        ...property,
        isPaid: property.payments.some((p) => p.assessmentYear === 2026 && p.status === 'SUCCESS'),
        taxBreakdown,
      },
    });
  } catch (error) {
    console.error('Get property detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch property details.' });
  }
});

// Create New Property
const createPropertySchema = z.object({
  propertyId: z.string().min(3),
  wardNumber: z.string().min(2),
  address: z.string().min(5),
  propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'INSTITUTIONAL', 'AGRICULTURAL']),
  builtUpAreaSqFt: z.number().positive(),
  constructionYear: z.number().int().min(1850).max(new Date().getFullYear()),
  isExempt: z.boolean().optional().default(false),
  exemptionReason: z.string().optional(),
  ownerId: z.string().optional(), // If citizen registering their own property, auto-injected
});

propertyRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parseResult = createPropertySchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation error',
      });
      return;
    }

    const data = parseResult.data;

    // Determine ownerId
    let ownerId = user.id;
    if (user.role === 'ADMIN' || user.role === 'WARD_OFFICER') {
      if (data.ownerId) {
        ownerId = data.ownerId;
      }
    }

    // If Ward Officer, ensure ward is assigned to them
    if (user.role === 'WARD_OFFICER' && !user.assignedWards.includes(data.wardNumber)) {
      res.status(403).json({
        success: false,
        message: `Cannot register property in ward ${data.wardNumber}. You are only assigned to [${user.assignedWards.join(', ')}].`,
      });
      return;
    }

    const existing = await prisma.property.findUnique({
      where: { propertyId: data.propertyId },
    });
    if (existing) {
      res.status(409).json({
        success: false,
        message: `Property ID ${data.propertyId} already exists in registry.`,
      });
      return;
    }

    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      res.status(404).json({ success: false, message: 'Owner user not found.' });
      return;
    }

    const property = await prisma.property.create({
      data: {
        propertyId: data.propertyId,
        ownerId,
        wardNumber: data.wardNumber,
        address: data.address,
        propertyType: data.propertyType,
        builtUpAreaSqFt: data.builtUpAreaSqFt,
        constructionYear: data.constructionYear,
        isExempt: Boolean(data.isExempt),
        exemptionReason: data.exemptionReason || null,
        status: 'ACTIVE',
      },
      include: { owner: true },
    });

    // Create Initial Ownership History
    await prisma.ownershipHistory.create({
      data: {
        propertyId: property.id,
        ownerName: owner.fullName,
        ownerMobile: owner.mobile,
        ownershipType: 'PURCHASE',
        startDate: new Date(),
        documentRef: `REG-${property.propertyId}`,
        transferReason: 'New Registration',
      },
    });

    await recordAuditLog({
      req,
      action: 'CREATE_PROPERTY',
      entityType: 'Property',
      entityId: property.id,
      details: `Registered new property ${property.propertyId} in ${property.wardNumber} (${property.propertyType}, ${property.builtUpAreaSqFt} sq ft)`,
    });

    emitBroadcast('property:created', { propertyId: property.propertyId, ward: property.wardNumber });

    res.status(201).json({
      success: true,
      message: 'Property successfully added to municipal register.',
      property,
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ success: false, message: 'Failed to create property.' });
  }
});

// Update Property Details (Officer or Admin)
propertyRouter.put(
  '/:id',
  authenticateToken,
  requireRole('WARD_OFFICER', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const existing = await prisma.property.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Property not found.' });
        return;
      }

      if (user.role === 'WARD_OFFICER' && !user.assignedWards.includes(existing.wardNumber)) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You cannot modify properties outside your assigned wards.',
        });
        return;
      }

      const { address, propertyType, builtUpAreaSqFt, constructionYear, isExempt, exemptionReason } =
        req.body;

      const updated = await prisma.property.update({
        where: { id },
        data: {
          address: address !== undefined ? address : existing.address,
          propertyType: propertyType !== undefined ? propertyType : existing.propertyType,
          builtUpAreaSqFt:
            builtUpAreaSqFt !== undefined ? Number(builtUpAreaSqFt) : existing.builtUpAreaSqFt,
          constructionYear:
            constructionYear !== undefined ? Number(constructionYear) : existing.constructionYear,
          isExempt: isExempt !== undefined ? Boolean(isExempt) : existing.isExempt,
          exemptionReason: exemptionReason !== undefined ? exemptionReason : existing.exemptionReason,
        },
      });

      await recordAuditLog({
        req,
        action: 'UPDATE_PROPERTY',
        entityType: 'Property',
        entityId: updated.id,
        details: `Updated details for property ${updated.propertyId}`,
      });

      res.json({ success: true, message: 'Property updated successfully.', property: updated });
    } catch (error) {
      console.error('Update property error:', error);
      res.status(500).json({ success: false, message: 'Failed to update property.' });
    }
  }
);
