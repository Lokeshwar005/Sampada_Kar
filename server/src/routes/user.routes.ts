import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/auditLogger.js';

export const userRouter = Router();

// Module 16: User Management (Admin Only)
// List users
userRouter.get(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { role, search, status } = req.query;
      const where: any = {};

      if (role && typeof role === 'string' && role !== 'ALL') {
        where.role = role;
      }

      if (status === 'BLOCKED') {
        where.isBlocked = true;
      } else if (status === 'ACTIVE') {
        where.isBlocked = false;
      }

      if (search && typeof search === 'string' && search.trim() !== '') {
        const q = search.trim();
        where.OR = [
          { fullName: { contains: q } },
          { email: { contains: q } },
          { mobile: { contains: q } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          mobile: true,
          role: true,
          isSeniorCitizen: true,
          isBlocked: true,
          createdAt: true,
          _count: {
            select: {
              properties: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, count: users.length, users });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
    }
  }
);

// Toggle Block/Unblock (Never Delete as per municipal governance requirements)
userRouter.patch(
  '/:id/status',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;

      if (typeof isBlocked !== 'boolean') {
        res.status(400).json({ success: false, message: 'isBlocked must be boolean true or false.' });
        return;
      }

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if (targetUser.role === 'ADMIN') {
        res.status(400).json({ success: false, message: 'Super Admin account cannot be blocked.' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isBlocked },
        select: {
          id: true,
          fullName: true,
          email: true,
          mobile: true,
          role: true,
          isBlocked: true,
        },
      });

      await recordAuditLog({
        req,
        action: isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
        entityType: 'User',
        entityId: id,
        details: `${isBlocked ? 'Blocked' : 'Unblocked'} account for ${targetUser.fullName} (${targetUser.email})`,
      });

      res.json({
        success: true,
        message: `User ${updated.fullName} has been ${isBlocked ? 'suspended/blocked' : 'unblocked/restored'}.`,
        user: updated,
      });
    } catch (error) {
      console.error('Toggle user block status error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user status.' });
    }
  }
);
