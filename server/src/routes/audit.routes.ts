import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js';

export const auditRouter = Router();

// Module 17: Audit Log Viewer (Admin Only)
auditRouter.get(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { action, role, entityType, search } = req.query;
      const where: any = {};

      if (action && typeof action === 'string' && action !== 'ALL') {
        where.action = action;
      }

      if (role && typeof role === 'string' && role !== 'ALL') {
        where.userRole = role;
      }

      if (entityType && typeof entityType === 'string' && entityType !== 'ALL') {
        where.entityType = entityType;
      }

      if (search && typeof search === 'string' && search.trim() !== '') {
        const q = search.trim();
        where.OR = [
          { userName: { contains: q } },
          { details: { contains: q } },
          { action: { contains: q } },
        ];
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 150, // latest 150 records
      });

      res.json({ success: true, count: logs.length, logs });
    } catch (error) {
      console.error('List audit logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
    }
  }
);

// CSV Export for Audit Trail
auditRouter.get(
  '/export-csv',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
      });

      let csv = 'Log ID,Timestamp,User Name,Role,Action,Entity Type,Entity ID,Details,IP Address\n';

      for (const log of logs) {
        const cleanDetails = (log.details || '').replace(/"/g, '""');
        csv += `"${log.id}","${log.timestamp.toISOString()}","${log.userName || 'System'}","${log.userRole || 'SYSTEM'}","${log.action}","${log.entityType}","${log.entityId || ''}","${cleanDetails}","${log.ipAddress || ''}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sampada_kar_audit_log.csv"');
      res.status(200).send(csv);
    } catch (error) {
      console.error('Export audit CSV error:', error);
      res.status(500).json({ success: false, message: 'Failed to export audit logs CSV.' });
    }
  }
);
