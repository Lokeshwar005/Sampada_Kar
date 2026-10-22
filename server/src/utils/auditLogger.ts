import { prisma } from '../db/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { emitBroadcast } from '../services/socket.js';

export interface CreateAuditLogParams {
  req?: AuthRequest;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  ipAddress?: string;
}

export async function recordAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const userId = params.req?.user?.id || params.userId || null;
    const userName = params.req?.user?.fullName || params.userName || 'System';
    const userRole = params.req?.user?.role || params.userRole || 'SYSTEM';
    const ipAddress =
      params.ipAddress ||
      (params.req?.headers['x-forwarded-for'] as string) ||
      params.req?.socket?.remoteAddress ||
      '127.0.0.1';

    const log = await prisma.auditLog.create({
      data: {
        userId,
        userName,
        userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      },
    });

    // Real-time broadcast for admin live audit feed
    emitBroadcast('audit:new', log);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
