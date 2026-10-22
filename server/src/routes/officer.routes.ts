import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/auditLogger.js';

export const officerRouter = Router();

// List all officers with ward assignments and coverage view - Module 15
officerRouter.get(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const officers = await prisma.user.findMany({
        where: { role: 'WARD_OFFICER' },
        include: {
          wardAssignments: true,
        },
        orderBy: { fullName: 'asc' },
      });

      // Ward coverage analysis across all standard wards (W-01 to W-05)
      const allWards = ['W-01', 'W-02', 'W-03', 'W-04', 'W-05'];
      const wardCoverage: Record<string, { assignedOfficers: string[]; propertyCount: number }> = {};

      for (const w of allWards) {
        wardCoverage[w] = { assignedOfficers: [], propertyCount: 0 };
      }

      // Count properties per ward
      const propCounts = await prisma.property.groupBy({
        by: ['wardNumber'],
        _count: true,
      });

      for (const pc of propCounts) {
        if (wardCoverage[pc.wardNumber]) {
          wardCoverage[pc.wardNumber].propertyCount = pc._count;
        } else {
          wardCoverage[pc.wardNumber] = { assignedOfficers: [], propertyCount: pc._count };
        }
      }

      for (const off of officers) {
        for (const wa of off.wardAssignments) {
          if (wardCoverage[wa.wardNumber]) {
            wardCoverage[wa.wardNumber].assignedOfficers.push(off.fullName);
          }
        }
      }

      res.json({ success: true, officers, wardCoverage });
    } catch (error) {
      console.error('List officers error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve officers.' });
    }
  }
);

// Create new Ward Officer and assign wards
const createOfficerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  password: z.string().min(6),
  assignedWards: z.array(z.string()).min(1, 'Assign at least one ward'),
});

officerRouter.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parseResult = createOfficerSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          message: parseResult.error.errors[0]?.message || 'Validation error',
        });
        return;
      }

      const { fullName, email, mobile, password, assignedWards } = parseResult.data;

      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { mobile }] },
      });
      if (existing) {
        res.status(409).json({ success: false, message: 'User with this email or mobile already exists.' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const officer = await prisma.user.create({
        data: {
          fullName,
          email,
          mobile,
          passwordHash,
          role: 'WARD_OFFICER',
        },
      });

      // Create Ward Assignments
      for (const ward of assignedWards) {
        await prisma.wardOfficerAssignment.create({
          data: {
            officerId: officer.id,
            wardNumber: ward,
          },
        });
      }

      await recordAuditLog({
        req,
        action: 'CREATE_WARD_OFFICER',
        entityType: 'User',
        entityId: officer.id,
        details: `Created Ward Officer ${fullName} (${mobile}) assigned to wards: ${assignedWards.join(', ')}`,
      });

      res.status(201).json({
        success: true,
        message: 'Ward Officer created and wards assigned successfully.',
        officer: {
          ...officer,
          assignedWards,
        },
      });
    } catch (error) {
      console.error('Create officer error:', error);
      res.status(500).json({ success: false, message: 'Failed to create ward officer.' });
    }
  }
);

// Update Ward Assignments for an Officer
officerRouter.put(
  '/:id/wards',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { assignedWards } = req.body;

      if (!Array.isArray(assignedWards) || assignedWards.length === 0) {
        res.status(400).json({ success: false, message: 'assignedWards array cannot be empty.' });
        return;
      }

      const officer = await prisma.user.findUnique({ where: { id } });
      if (!officer || officer.role !== 'WARD_OFFICER') {
        res.status(404).json({ success: false, message: 'Ward officer not found.' });
        return;
      }

      // Delete old assignments and create new ones
      await prisma.wardOfficerAssignment.deleteMany({ where: { officerId: id } });

      for (const ward of assignedWards) {
        await prisma.wardOfficerAssignment.create({
          data: { officerId: id, wardNumber: ward },
        });
      }

      await recordAuditLog({
        req,
        action: 'UPDATE_OFFICER_WARDS',
        entityType: 'User',
        entityId: id,
        details: `Updated ward assignments for ${officer.fullName}: ${assignedWards.join(', ')}`,
      });

      res.json({
        success: true,
        message: 'Ward assignments updated successfully.',
        assignedWards,
      });
    } catch (error) {
      console.error('Update officer wards error:', error);
      res.status(500).json({ success: false, message: 'Failed to update ward assignments.' });
    }
  }
);
