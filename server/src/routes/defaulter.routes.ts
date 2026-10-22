import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js';
import { calculatePropertyTax } from '../tax/taxEngine.js';
import { recordAuditLog } from '../utils/auditLogger.js';
import { sendNotification } from '../utils/notificationHelper.js';
import { emitBroadcast } from '../services/socket.js';

export const defaulterRouter = Router();

// -------------------------------------------------------------
// LIST DEFAULTERS (Properties with arrears or overdue unpaid taxes)
// -------------------------------------------------------------
defaulterRouter.get(
  '/',
  authenticateToken,
  requireRole('WARD_OFFICER', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const where: any = {
        hasArrears: true,
      };

      if (user.role === 'WARD_OFFICER') {
        where.wardNumber = { in: user.assignedWards };
      }

      const defaulters = await prisma.property.findMany({
        where,
        include: {
          owner: {
            select: { id: true, fullName: true, mobile: true, email: true, isSeniorCitizen: true },
          },
          demandNotices: {
            orderBy: { issueDate: 'desc' },
          },
        },
        orderBy: { arrearsAmount: 'desc' },
      });

      const taxSetting = await prisma.taxSetting.findFirstOrThrow({ where: { isActive: true } });

      const enriched = defaulters.map((prop) => {
        const taxBreakdown = calculatePropertyTax(prop, prop.owner, taxSetting);
        const latestNotice = prop.demandNotices.length > 0 ? prop.demandNotices[0] : null;

        return {
          ...prop,
          taxBreakdown,
          latestNotice,
          noticeCount: prop.demandNotices.length,
        };
      });

      res.json({ success: true, count: enriched.length, defaulters: enriched });
    } catch (error) {
      console.error('List defaulters error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve defaulters list.' });
    }
  }
);

// -------------------------------------------------------------
// ISSUE DEMAND NOTICE (WITH 15-DAY DEADLINE)
// -------------------------------------------------------------
defaulterRouter.post(
  '/issue-notice',
  authenticateToken,
  requireRole('WARD_OFFICER', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { propertyId } = req.body;

      const property = await prisma.property.findFirst({
        where: { OR: [{ id: propertyId }, { propertyId }] },
        include: { owner: true },
      });

      if (!property) {
        res.status(404).json({ success: false, message: 'Property not found.' });
        return;
      }

      if (user.role === 'WARD_OFFICER' && !user.assignedWards.includes(property.wardNumber)) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only issue notices in your assigned wards.',
        });
        return;
      }

      const taxSetting = await prisma.taxSetting.findFirstOrThrow({ where: { isActive: true } });
      const taxBreakdown = calculatePropertyTax(property, property.owner, taxSetting);

      // Generate Notice Number
      const noticeCount = await prisma.demandNotice.count({
        where: { assessmentYear: 2026 },
      });
      const noticeNumber = `DN-2026-${(noticeCount + 1).toString().padStart(4, '0')}`;

      const issueDate = new Date();
      const deadlineDate = new Date(issueDate);
      deadlineDate.setDate(deadlineDate.getDate() + 15); // Exactly 15 days deadline

      const demandNotice = await prisma.demandNotice.create({
        data: {
          noticeNumber,
          propertyId: property.id,
          recipientId: property.ownerId,
          issuedByOfficerId: user.id,
          financialYear: '2026-2027',
          assessmentYear: 2026,
          unpaidTax: taxBreakdown.netTax,
          accruedPenalty: taxBreakdown.latePenaltyAmount + taxBreakdown.arrearsPenaltyAmount,
          arrears: taxBreakdown.arrearsAmount,
          totalDue: taxBreakdown.totalPayable,
          issueDate,
          deadlineDate,
          status: 'ISSUED',
        },
        include: {
          property: true,
          recipient: true,
          officer: true,
        },
      });

      // Audit Log
      await recordAuditLog({
        req,
        action: 'ISSUE_DEMAND_NOTICE',
        entityType: 'DemandNotice',
        entityId: demandNotice.id,
        details: `Issued Statutory Demand Notice ${noticeNumber} to ${property.propertyId} (Total Due: ₹${taxBreakdown.totalPayable}, Deadline: ${deadlineDate.toISOString().split('T')[0]})`,
      });

      // Alert Citizen
      await sendNotification({
        recipientUserId: property.ownerId,
        title: 'Statutory Demand Notice Issued',
        message: `Demand Notice ${noticeNumber} issued for property ${property.propertyId}. Please clear total dues of ₹${taxBreakdown.totalPayable} within 15 days to avoid attachment or warrant proceedings.`,
        type: 'ALERT',
        link: `/notices/${noticeNumber}`,
      });

      emitBroadcast('notice:issued', {
        noticeNumber,
        propertyId: property.propertyId,
        totalDue: taxBreakdown.totalPayable,
        ward: property.wardNumber,
      });

      res.status(201).json({
        success: true,
        message: `Demand Notice ${noticeNumber} successfully generated with 15-day compliance deadline.`,
        demandNotice,
      });
    } catch (error) {
      console.error('Issue demand notice error:', error);
      res.status(500).json({ success: false, message: 'Failed to issue demand notice.' });
    }
  }
);

// -------------------------------------------------------------
// LIST NOTICES (Scoped by Role)
// -------------------------------------------------------------
defaulterRouter.get('/notices', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const where: any = {};

    if (user.role === 'CITIZEN') {
      where.recipientId = user.id;
    } else if (user.role === 'WARD_OFFICER') {
      where.property = { wardNumber: { in: user.assignedWards } };
    }

    const notices = await prisma.demandNotice.findMany({
      where,
      include: {
        property: true,
        recipient: {
          select: { fullName: true, mobile: true, email: true },
        },
        officer: {
          select: { fullName: true },
        },
      },
      orderBy: { issueDate: 'desc' },
    });

    res.json({ success: true, notices });
  } catch (error) {
    console.error('List notices error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve notices.' });
  }
});

// -------------------------------------------------------------
// GET SINGLE DEMAND NOTICE FOR PRINT/PDF
// -------------------------------------------------------------
defaulterRouter.get('/notice/:noticeNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { noticeNumber } = req.params;

    const notice = await prisma.demandNotice.findUnique({
      where: { noticeNumber: noticeNumber.toUpperCase() },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        recipient: true,
        officer: true,
      },
    });

    if (!notice) {
      res.status(404).json({ success: false, message: 'Demand notice not found.' });
      return;
    }

    res.json({ success: true, notice });
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve notice.' });
  }
});
