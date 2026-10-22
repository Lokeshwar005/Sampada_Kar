import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  isSeniorCitizen: boolean;
  isBlocked: boolean;
  assignedWards: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'sampada_kar_super_secret_jwt_key_2026_dev';

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Token missing.' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { wardAssignments: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid token. User no longer exists.' });
      return;
    }

    if (user.isBlocked) {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended by the Municipal Corporation administration.',
      });
      return;
    }

    req.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      isSeniorCitizen: user.isSeniorCitizen,
      isBlocked: user.isBlocked,
      assignedWards: user.wardAssignments.map((wa) => wa.wardNumber),
    };

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Session expired or invalid token.' });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this action. Required: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}
