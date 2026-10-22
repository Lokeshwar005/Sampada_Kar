import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.routes.js';
import { propertyRouter } from './routes/property.routes.js';
import { taxSettingRouter } from './routes/taxSetting.routes.js';
import { paymentRouter } from './routes/payment.routes.js';
import { defaulterRouter } from './routes/defaulter.routes.js';
import { workflowRouter } from './routes/workflow.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { officerRouter } from './routes/officer.routes.js';
import { userRouter } from './routes/user.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { feedbackRouter } from './routes/feedback.routes.js';

export const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

// 1. Security & Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles & scripts for dev/reports
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: [corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Rate Limiting (100 requests per 15 minutes for public API stability)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' },
});
app.use('/api/', limiter);

// 3. Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    system: 'Sampada Kar Property Tax Management Portal API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 4. API Endpoints
app.use('/api/auth', authRouter);
app.use('/api/properties', propertyRouter);
app.use('/api/tax-settings', taxSettingRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/defaulters', defaulterRouter);
app.use('/api/workflows', workflowRouter);
app.use('/api/reports', reportRouter);
app.use('/api/officers', officerRouter);
app.use('/api/users', userRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/feedback', feedbackRouter);

// 5. Global Error Handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 6. 404 Route Catch-All
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found on Sampada Kar API server.`,
  });
});
