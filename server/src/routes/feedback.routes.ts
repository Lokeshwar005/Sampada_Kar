import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/auditLogger.js';

export const feedbackRouter = Router();

const createFeedbackSchema = z.object({
  referenceType: z.enum(['PAYMENT', 'GRIEVANCE', 'GENERAL']),
  referenceId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comments: z.string().optional(),
});

// Submit Feedback (Citizen or Any logged in user)
feedbackRouter.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parseResult = createFeedbackSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation error',
      });
      return;
    }

    const { referenceType, referenceId, rating, comments } = parseResult.data;

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        referenceType,
        referenceId: referenceId || null,
        rating,
        comments: comments || null,
      },
    });

    await recordAuditLog({
      req,
      action: 'SUBMIT_FEEDBACK',
      entityType: 'Feedback',
      entityId: feedback.id,
      details: `Submitted ${rating}-star feedback for ${referenceType} ${referenceId || ''}`,
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your valuable feedback! It helps improve municipal public services.',
      feedback,
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback.' });
  }
});

// List Feedback (Public summary or Officer/Admin)
feedbackRouter.get('/', async (req, res): Promise<void> => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalRatings = feedbacks.length;
    const avgRating =
      totalRatings > 0
        ? Math.round(
            (feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalRatings) * 10
          ) / 10
        : 5.0;

    res.json({
      success: true,
      avgRating,
      totalCount: totalRatings,
      feedbacks,
    });
  } catch (error) {
    console.error('List feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve feedback.' });
  }
});
