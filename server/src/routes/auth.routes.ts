import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/auditLogger.js';
import { sendNotification } from '../utils/notificationHelper.js';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sampada_kar_super_secret_jwt_key_2026_dev';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must have at least 2 characters'),
    email: z.string().email('Invalid email address'),
    mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    passwordConfirm: z.string(),
    isSeniorCitizen: z.boolean().optional().default(false),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Mobile number is required'),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post('/register', async (req, res): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation error',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { fullName, email, mobile, password, isSeniorCitizen } = parseResult.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { mobile }],
      },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message:
          existingUser.email === email
            ? 'An account with this email already exists.'
            : 'An account with this mobile number already exists.',
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        mobile,
        passwordHash,
        role: 'CITIZEN',
        isSeniorCitizen: Boolean(isSeniorCitizen),
      },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    await recordAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user.id,
      details: `Citizen registered: ${user.fullName} (${user.mobile})${isSeniorCitizen ? ' [Senior Citizen Flagged]' : ''}`,
    });

    await sendNotification({
      recipientUserId: user.id,
      title: 'Welcome to Sampada Kar',
      message: 'Your citizen account has been successfully created. You can now link properties and pay municipal taxes online.',
      type: 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: 'Citizen registered successfully',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isSeniorCitizen: user.isSeniorCitizen,
        assignedWards: [],
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

authRouter.post('/login', async (req, res): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: parseResult.error.errors[0]?.message || 'Validation error',
      });
      return;
    }

    const { identifier, password } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { mobile: identifier }],
      },
      include: { wardAssignments: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended by the Municipal Corporation administration.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email/mobile or password.' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    const assignedWards = user.wardAssignments.map((w) => w.wardNumber);

    await recordAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: `User logged in from portal as ${user.role}`,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isSeniorCitizen: user.isSeniorCitizen,
        assignedWards,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

authRouter.get('/me', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  res.json({
    success: true,
    user: req.user,
  });
});
