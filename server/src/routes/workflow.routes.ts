import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js';
import { calculatePropertyTax } from '../tax/taxEngine.js';
import { recordAuditLog } from '../utils/auditLogger.js';
import { sendNotification } from '../utils/notificationHelper.js';
import { emitBroadcast, emitToUser } from '../services/socket.js';

export const workflowRouter = Router();

// =============================================================
// MODULE 10: PROPERTY TRANSFER REQUESTS
// =============================================================

// 1. Citizen submits transfer request
const createTransferSchema = z.object({
  propertyId: z.string(),
  newOwnerName: z.string().min(2),
  newOwnerMobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a 10-digit Indian mobile number'),
  newOwnerEmail: z.string().email().optional(),
  transferType: z.enum(['SALE', 'GIFT', 'INHERITANCE']),
  deedNumber: z.string().min(2),
  deedDate: z.string(),
  supportingDocRef: z.string().optional(),
});

workflowRouter.post('/transfers', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parseResult = createTransferSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation error',
      });
      return;
    }

    const data = parseResult.data;

    const property = await prisma.property.findFirst({
      where: { OR: [{ id: data.propertyId }, { propertyId: data.propertyId }] },
    });

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found.' });
      return;
    }

    if (user.role === 'CITIZEN' && property.ownerId !== user.id) {
      res.status(403).json({ success: false, message: 'You can only request transfer for your own property.' });
      return;
    }

    const transferCount = await prisma.transferRequest.count();
    const applicationNumber = `TRF-2026-${(transferCount + 1).toString().padStart(4, '0')}`;

    const transfer = await prisma.transferRequest.create({
      data: {
        applicationNumber,
        propertyId: property.id,
        currentOwnerId: user.id,
        newOwnerName: data.newOwnerName,
        newOwnerMobile: data.newOwnerMobile,
        newOwnerEmail: data.newOwnerEmail || null,
        transferType: data.transferType,
        deedNumber: data.deedNumber,
        deedDate: new Date(data.deedDate),
        supportingDocRef: data.supportingDocRef || null,
        status: 'PENDING',
      },
      include: { property: true },
    });

    // Mark property status as PENDING_TRANSFER
    await prisma.property.update({
      where: { id: property.id },
      data: { status: 'PENDING_TRANSFER' },
    });

    await recordAuditLog({
      req,
      action: 'SUBMIT_TRANSFER_REQUEST',
      entityType: 'TransferRequest',
      entityId: transfer.id,
      details: `Submitted mutation/transfer application ${applicationNumber} for ${property.propertyId} to ${data.newOwnerName}`,
    });

    // Notify Ward Officers of this ward
    emitBroadcast('transfer:submitted', {
      applicationNumber,
      propertyId: property.propertyId,
      ward: property.wardNumber,
    });

    res.status(201).json({
      success: true,
      message: `Property transfer application ${applicationNumber} submitted successfully. Pending Ward Officer verification.`,
      transfer,
    });
  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit transfer request.' });
  }
});

// 2. List Transfers
workflowRouter.get('/transfers', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const where: any = {};

    if (user.role === 'CITIZEN') {
      where.currentOwnerId = user.id;
    } else if (user.role === 'WARD_OFFICER') {
      where.property = { wardNumber: { in: user.assignedWards } };
    }

    const transfers = await prisma.transferRequest.findMany({
      where,
      include: {
        property: true,
        currentOwner: { select: { fullName: true, mobile: true, email: true } },
        officer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: transfers.length, transfers });
  } catch (error) {
    console.error('List transfers error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve transfer requests.' });
  }
});

// 3. Officer/Admin Review Transfer (Approve/Reject)
// "on approval close previous owner's history row and open the new one; rejection needs a reason"
workflowRouter.patch(
  '/transfers/:id/review',
  authenticateToken,
  requireRole('WARD_OFFICER', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { action, rejectionReason } = req.body; // action: 'APPROVE' | 'REJECT'

      if (!['APPROVE', 'REJECT'].includes(action)) {
        res.status(400).json({ success: false, message: "Action must be 'APPROVE' or 'REJECT'." });
        return;
      }

      if (action === 'REJECT' && (!rejectionReason || rejectionReason.trim().length < 5)) {
        res.status(400).json({
          success: false,
          message: 'A detailed reason is mandatory when rejecting a transfer application.',
        });
        return;
      }

      const transfer = await prisma.transferRequest.findUnique({
        where: { id },
        include: { property: true, currentOwner: true },
      });

      if (!transfer) {
        res.status(404).json({ success: false, message: 'Transfer application not found.' });
        return;
      }

      if (user.role === 'WARD_OFFICER' && !user.assignedWards.includes(transfer.property.wardNumber)) {
        res.status(403).json({ success: false, message: 'Access denied outside your assigned wards.' });
        return;
      }

      if (transfer.status !== 'PENDING') {
        res.status(400).json({
          success: false,
          message: `Application already reviewed with status: ${transfer.status}`,
        });
        return;
      }

      if (action === 'APPROVE') {
        // Find or create User for new owner if email/mobile exists or create new citizen account
        let newOwner = await prisma.user.findFirst({
          where: {
            OR: [{ mobile: transfer.newOwnerMobile }, { email: transfer.newOwnerEmail || 'none@none.com' }],
          },
        });

        if (!newOwner) {
          // Auto create user for new owner with default password
          const defaultPasswordHash = transfer.currentOwner.passwordHash; // safe clone or default
          newOwner = await prisma.user.create({
            data: {
              fullName: transfer.newOwnerName,
              mobile: transfer.newOwnerMobile,
              email: transfer.newOwnerEmail || `citizen.${transfer.newOwnerMobile}@sampadakar.in`,
              passwordHash: defaultPasswordHash,
              role: 'CITIZEN',
            },
          });
        }

        const now = new Date();

        // 1. Close previous owner's history row
        const openHistory = await prisma.ownershipHistory.findFirst({
          where: { propertyId: transfer.propertyId, endDate: null },
          orderBy: { startDate: 'desc' },
        });

        if (openHistory) {
          await prisma.ownershipHistory.update({
            where: { id: openHistory.id },
            data: { endDate: now },
          });
        }

        // 2. Open new history row
        await prisma.ownershipHistory.create({
          data: {
            propertyId: transfer.propertyId,
            ownerName: transfer.newOwnerName,
            ownerMobile: transfer.newOwnerMobile,
            ownershipType: transfer.transferType,
            startDate: now,
            documentRef: transfer.deedNumber,
            transferReason: `Transfer approved under ${transfer.applicationNumber}`,
          },
        });

        // 3. Update Property Owner
        await prisma.property.update({
          where: { id: transfer.propertyId },
          data: {
            ownerId: newOwner.id,
            status: 'ACTIVE',
          },
        });

        // 4. Update Transfer Record
        const updatedTransfer = await prisma.transferRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewedByOfficerId: user.id,
          },
        });

        await recordAuditLog({
          req,
          action: 'APPROVE_TRANSFER',
          entityType: 'TransferRequest',
          entityId: transfer.id,
          details: `Approved transfer of ${transfer.property.propertyId} from ${transfer.currentOwner.fullName} to ${transfer.newOwnerName}. Ownership history updated.`,
        });

        await sendNotification({
          recipientUserId: transfer.currentOwnerId,
          title: 'Ownership Transfer Approved',
          message: `Application ${transfer.applicationNumber} has been approved. Ownership of ${transfer.property.propertyId} is now transferred to ${transfer.newOwnerName}.`,
          type: 'SUCCESS',
        });

        emitBroadcast('workflow:updated', { type: 'TRANSFER', status: 'APPROVED' });

        res.json({
          success: true,
          message: 'Transfer application approved. Property ownership history successfully updated.',
          transfer: updatedTransfer,
        });
      } else {
        // REJECT
        const updatedTransfer = await prisma.transferRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason,
            reviewedByOfficerId: user.id,
          },
        });

        await prisma.property.update({
          where: { id: transfer.propertyId },
          data: { status: 'ACTIVE' },
        });

        await recordAuditLog({
          req,
          action: 'REJECT_TRANSFER',
          entityType: 'TransferRequest',
          entityId: transfer.id,
          details: `Rejected transfer ${transfer.applicationNumber}: ${rejectionReason}`,
        });

        await sendNotification({
          recipientUserId: transfer.currentOwnerId,
          title: 'Ownership Transfer Rejected',
          message: `Application ${transfer.applicationNumber} was rejected by Officer. Reason: ${rejectionReason}`,
          type: 'ALERT',
        });

        emitBroadcast('workflow:updated', { type: 'TRANSFER', status: 'REJECTED' });

        res.json({
          success: true,
          message: 'Transfer application rejected with documented reason.',
          transfer: updatedTransfer,
        });
      }
    } catch (error) {
      console.error('Review transfer error:', error);
      res.status(500).json({ success: false, message: 'Failed to review transfer application.' });
    }
  }
);

// =============================================================
// MODULE 11: REASSESSMENT REQUESTS
// =============================================================

// 1. Citizen submits reassessment request
const createReassessmentSchema = z.object({
  propertyId: z.string(),
  proposedArea: z.number().positive(),
  proposedType: z.string(),
  reason: z.string().min(5),
});

workflowRouter.post('/reassessments', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parseResult = createReassessmentSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation error',
      });
      return;
    }

    const data = parseResult.data;
    const property = await prisma.property.findFirst({
      where: { OR: [{ id: data.propertyId }, { propertyId: data.propertyId }] },
      include: { owner: true },
    });

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found.' });
      return;
    }

    if (user.role === 'CITIZEN' && property.ownerId !== user.id) {
      res.status(403).json({ success: false, message: 'You can only request reassessment for your own property.' });
      return;
    }

    const taxSetting = await prisma.taxSetting.findFirstOrThrow({ where: { isActive: true } });

    // Existing tax preview
    const oldTaxBreakdown = calculatePropertyTax(property, property.owner, taxSetting);

    // Proposed tax preview
    const newTaxBreakdown = calculatePropertyTax(
      {
        ...property,
        builtUpAreaSqFt: data.proposedArea,
        propertyType: data.proposedType,
      },
      property.owner,
      taxSetting
    );

    const reassessmentCount = await prisma.reassessmentRequest.count();
    const applicationNumber = `REA-2026-${(reassessmentCount + 1).toString().padStart(4, '0')}`;

    const request = await prisma.reassessmentRequest.create({
      data: {
        applicationNumber,
        propertyId: property.id,
        citizenId: user.id,
        existingArea: property.builtUpAreaSqFt,
        proposedArea: data.proposedArea,
        existingType: property.propertyType,
        proposedType: data.proposedType,
        reason: data.reason,
        existingEstimatedTax: oldTaxBreakdown.totalPayable,
        proposedEstimatedTax: newTaxBreakdown.totalPayable,
        status: 'PENDING',
      },
      include: { property: true },
    });

    await prisma.property.update({
      where: { id: property.id },
      data: { status: 'PENDING_REASSESSMENT' },
    });

    await recordAuditLog({
      req,
      action: 'SUBMIT_REASSESSMENT',
      entityType: 'ReassessmentRequest',
      entityId: request.id,
      details: `Reassessment request ${applicationNumber} for ${property.propertyId}: Area ${property.builtUpAreaSqFt} -> ${data.proposedArea} sq ft, Tax ₹${oldTaxBreakdown.totalPayable} -> ₹${newTaxBreakdown.totalPayable}`,
    });

    emitBroadcast('reassessment:submitted', {
      applicationNumber,
      propertyId: property.propertyId,
      ward: property.wardNumber,
    });

    res.status(201).json({
      success: true,
      message: `Reassessment application ${applicationNumber} submitted. Existing: ₹${oldTaxBreakdown.totalPayable}, Proposed: ₹${newTaxBreakdown.totalPayable}.`,
      request,
    });
  } catch (error) {
    console.error('Create reassessment error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit reassessment request.' });
  }
});

// 2. List Reassessments
workflowRouter.get('/reassessments', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const where: any = {};

    if (user.role === 'CITIZEN') {
      where.citizenId = user.id;
    } else if (user.role === 'WARD_OFFICER') {
      where.property = { wardNumber: { in: user.assignedWards } };
    }

    const requests = await prisma.reassessmentRequest.findMany({
      where,
      include: {
        property: true,
        citizen: { select: { fullName: true, mobile: true } },
        officer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error('List reassessments error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve reassessments.' });
  }
});

// 3. Officer/Admin Review Reassessment (Approve/Reject)
workflowRouter.patch(
  '/reassessments/:id/review',
  authenticateToken,
  requireRole('WARD_OFFICER', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { action, rejectionReason } = req.body;

      if (!['APPROVE', 'REJECT'].includes(action)) {
        res.status(400).json({ success: false, message: "Action must be 'APPROVE' or 'REJECT'." });
        return;
      }

      if (action === 'REJECT' && (!rejectionReason || rejectionReason.trim().length < 5)) {
        res.status(400).json({
          success: false,
          message: 'A detailed reason is mandatory when rejecting a reassessment application.',
        });
        return;
      }

      const request = await prisma.reassessmentRequest.findUnique({
        where: { id },
        include: { property: true, citizen: true },
      });

      if (!request) {
        res.status(404).json({ success: false, message: 'Reassessment request not found.' });
        return;
      }

      if (user.role === 'WARD_OFFICER' && !user.assignedWards.includes(request.property.wardNumber)) {
        res.status(403).json({ success: false, message: 'Access denied outside your assigned wards.' });
        return;
      }

      if (request.status !== 'PENDING') {
        res.status(400).json({
          success: false,
          message: `Application already reviewed with status: ${request.status}`,
        });
        return;
      }

      if (action === 'APPROVE') {
        // Update property measurements
        await prisma.property.update({
          where: { id: request.propertyId },
          data: {
            builtUpAreaSqFt: request.proposedArea,
            propertyType: request.proposedType,
            status: 'ACTIVE',
          },
        });

        const updated = await prisma.reassessmentRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewedByOfficerId: user.id,
          },
        });

        await recordAuditLog({
          req,
          action: 'APPROVE_REASSESSMENT',
          entityType: 'ReassessmentRequest',
          entityId: request.id,
          details: `Approved reassessment for ${request.property.propertyId}: Area changed to ${request.proposedArea} sq ft (${request.proposedType})`,
        });

        await sendNotification({
          recipientUserId: request.citizenId,
          title: 'Reassessment Application Approved',
          message: `Application ${request.applicationNumber} for property ${request.property.propertyId} approved. Area updated to ${request.proposedArea} sq ft.`,
          type: 'SUCCESS',
        });

        emitBroadcast('workflow:updated', { type: 'REASSESSMENT', status: 'APPROVED' });

        res.json({
          success: true,
          message: 'Reassessment approved and property registry updated.',
          request: updated,
        });
      } else {
        const updated = await prisma.reassessmentRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason,
            reviewedByOfficerId: user.id,
          },
        });

        await prisma.property.update({
          where: { id: request.propertyId },
          data: { status: 'ACTIVE' },
        });

        await recordAuditLog({
          req,
          action: 'REJECT_REASSESSMENT',
          entityType: 'ReassessmentRequest',
          entityId: request.id,
          details: `Rejected reassessment ${request.applicationNumber}: ${rejectionReason}`,
        });

        await sendNotification({
          recipientUserId: request.citizenId,
          title: 'Reassessment Application Rejected',
          message: `Application ${request.applicationNumber} was rejected. Reason: ${rejectionReason}`,
          type: 'ALERT',
        });

        emitBroadcast('workflow:updated', { type: 'REASSESSMENT', status: 'REJECTED' });

        res.json({
          success: true,
          message: 'Reassessment application rejected.',
          request: updated,
        });
      }
    } catch (error) {
      console.error('Review reassessment error:', error);
      res.status(500).json({ success: false, message: 'Failed to review reassessment.' });
    }
  }
);

// =============================================================
// MODULE 8: GRIEVANCE REDRESSAL SYSTEM
// =============================================================

// 1. Citizen raises grievance
const createGrievanceSchema = z.object({
  propertyId: z.string().optional(),
  wardNumber: z.string().min(2),
  category: z.enum([
    'BILLING_ISSUE',
    'INCORRECT_MEASUREMENT',
    'PAYMENT_FAILURE',
    'NAME_CORRECTION',
    'OTHER',
  ]),
  subject: z.string().min(5),
  description: z.string().min(10),
});

workflowRouter.post('/grievances', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parseResult = createGrievanceSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation error',
      });
      return;
    }

    const data = parseResult.data;

    let propDbId: string | null = null;
    if (data.propertyId) {
      const prop = await prisma.property.findFirst({
        where: { OR: [{ id: data.propertyId }, { propertyId: data.propertyId }] },
      });
      if (prop) propDbId = prop.id;
    }

    const count = await prisma.grievance.count();
    const ticketNumber = `GRV-2026-${(count + 1).toString().padStart(4, '0')}`;

    // Auto-assign to ward officer of that ward if one exists
    const assignment = await prisma.wardOfficerAssignment.findFirst({
      where: { wardNumber: data.wardNumber },
    });

    const grievance = await prisma.grievance.create({
      data: {
        ticketNumber,
        citizenId: user.id,
        propertyId: propDbId,
        wardNumber: data.wardNumber,
        category: data.category,
        subject: data.subject,
        description: data.description,
        status: 'OPEN',
        assignedOfficerId: assignment ? assignment.officerId : null,
      },
    });

    await recordAuditLog({
      req,
      action: 'RAISE_GRIEVANCE',
      entityType: 'Grievance',
      entityId: grievance.id,
      details: `Raised grievance ticket ${ticketNumber} (${data.category}) for ${data.wardNumber}: "${data.subject}"`,
    });

    if (assignment) {
      await sendNotification({
        recipientUserId: assignment.officerId,
        title: 'New Grievance Ticket Assigned',
        message: `Ticket ${ticketNumber} assigned to Ward ${data.wardNumber}: "${data.subject}"`,
        type: 'INFO',
        link: `/officer/grievances`,
      });
    }

    emitBroadcast('grievance:created', {
      ticketNumber,
      ward: data.wardNumber,
      category: data.category,
    });

    res.status(201).json({
      success: true,
      message: `Grievance ticket ${ticketNumber} raised successfully. Track status on your dashboard.`,
      grievance,
    });
  } catch (error) {
    console.error('Create grievance error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit grievance.' });
  }
});

// 2. List Grievances (Scoped by Role)
workflowRouter.get('/grievances', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const where: any = {};

    if (user.role === 'CITIZEN') {
      where.citizenId = user.id;
    } else if (user.role === 'WARD_OFFICER') {
      where.wardNumber = { in: user.assignedWards };
    }

    const grievances = await prisma.grievance.findMany({
      where,
      include: {
        citizen: { select: { fullName: true, mobile: true, email: true } },
        officer: { select: { fullName: true } },
        property: { select: { propertyId: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: grievances.length, grievances });
  } catch (error) {
    console.error('List grievances error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve grievances.' });
  }
});

// 3. Officer/Admin reply and update status (OPEN -> IN_PROGRESS -> RESOLVED)
workflowRouter.patch(
  '/grievances/:id/reply',
  authenticateToken,
  requireRole('WARD_OFFICER', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status, remarks } = req.body;

      if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status.' });
        return;
      }

      const grievance = await prisma.grievance.findUnique({
        where: { id },
        include: { citizen: true },
      });

      if (!grievance) {
        res.status(404).json({ success: false, message: 'Grievance ticket not found.' });
        return;
      }

      if (user.role === 'WARD_OFFICER' && !user.assignedWards.includes(grievance.wardNumber)) {
        res.status(403).json({ success: false, message: 'Access denied outside assigned wards.' });
        return;
      }

      const updated = await prisma.grievance.update({
        where: { id },
        data: {
          status,
          officerRemarks: remarks || grievance.officerRemarks,
          assignedOfficerId: user.id,
          resolvedAt: status === 'RESOLVED' ? new Date() : grievance.resolvedAt,
        },
      });

      await recordAuditLog({
        req,
        action: 'UPDATE_GRIEVANCE_STATUS',
        entityType: 'Grievance',
        entityId: grievance.id,
        details: `Updated grievance ${grievance.ticketNumber} to status '${status}'. Remarks: ${remarks || 'None'}`,
      });

      // Notify citizen on status change
      await sendNotification({
        recipientUserId: grievance.citizenId,
        title: `Grievance ${grievance.ticketNumber} Status: ${status}`,
        message: `Your grievance ticket has been marked as ${status}.${remarks ? ` Officer remarks: "${remarks}"` : ''}`,
        type: status === 'RESOLVED' ? 'SUCCESS' : 'INFO',
        link: `/grievances`,
      });

      emitBroadcast('workflow:updated', { type: 'GRIEVANCE', status });

      res.json({
        success: true,
        message: `Grievance status updated to ${status}. Citizen notified.`,
        grievance: updated,
      });
    } catch (error) {
      console.error('Reply grievance error:', error);
      res.status(500).json({ success: false, message: 'Failed to update grievance.' });
    }
  }
);
