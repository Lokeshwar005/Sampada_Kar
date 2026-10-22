import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

export const notificationRouter = Router();

// Module 14: Notification System
// List notifications for current user (matching user ID or role)
notificationRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { recipientUserId: user.id },
          { targetRole: user.role },
          { AND: [{ recipientUserId: null }, { targetRole: null }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
});

// Mark single notification as read
notificationRouter.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

// Mark all notifications as read
notificationRouter.patch('/mark-all-read', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    await prisma.notification.updateMany({
      where: {
        OR: [
          { recipientUserId: user.id },
          { targetRole: user.role },
        ],
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read.' });
  }
});
