import { prisma } from '../db/prisma.js';
import { emitToRole, emitToUser, emitBroadcast } from '../services/socket.js';

export interface SendNotificationParams {
  recipientUserId?: string | null;
  targetRole?: 'CITIZEN' | 'WARD_OFFICER' | 'ADMIN' | null;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  link?: string | null;
}

export async function sendNotification(params: SendNotificationParams): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        recipientUserId: params.recipientUserId || null,
        targetRole: params.targetRole || null,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        link: params.link || null,
      },
    });

    if (params.recipientUserId) {
      emitToUser(params.recipientUserId, 'notification:new', notification);
    } else if (params.targetRole) {
      emitToRole(params.targetRole, 'notification:new', notification);
    } else {
      emitBroadcast('notification:new', notification);
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
