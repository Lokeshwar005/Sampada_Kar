import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { calculatePropertyTax, calculateInstalmentBreakdown } from '../tax/taxEngine.js';
import { amountToIndianWords } from '../utils/numberToWords.js';
import { recordAuditLog } from '../utils/auditLogger.js';
import { sendNotification } from '../utils/notificationHelper.js';
import { emitBroadcast, emitToUser } from '../services/socket.js';

export const paymentRouter = Router();

// Razorpay test client setup
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpayClient: Razorpay | null = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpayClient = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
}

// Generate unique receipt number like ST-2026-0001
async function generateReceiptNumber(year: number = 2026): Promise<string> {
  const count = await prisma.payment.count({
    where: { assessmentYear: year },
  });
  const nextSeq = (count + 1).toString().padStart(4, '0');
  return `ST-${year}-${nextSeq}`;
}

// -------------------------------------------------------------
// CREATE PAYMENT ORDER (Razorpay or Mock)
// -------------------------------------------------------------
paymentRouter.post('/create-order', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { propertyId, forceMock } = req.body;

    if (!propertyId) {
      res.status(400).json({ success: false, message: 'Property ID is required.' });
      return;
    }

    const property = await prisma.property.findFirst({
      where: {
        OR: [{ id: propertyId }, { propertyId }],
      },
      include: { owner: true },
    });

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found.' });
      return;
    }

    if (user.role === 'CITIZEN' && property.ownerId !== user.id) {
      res.status(403).json({ success: false, message: 'You can only pay tax for your own property.' });
      return;
    }

    const taxSetting = await prisma.taxSetting.findFirstOrThrow({ where: { isActive: true } });
    const taxBreakdown = calculatePropertyTax(property, property.owner, taxSetting);

    if (taxBreakdown.totalPayable <= 0) {
      res.status(400).json({
        success: false,
        message: 'Total payable tax is ₹0. No payment required (exempt or zero dues).',
      });
      return;
    }

    const amountInPaise = Math.round(taxBreakdown.totalPayable * 100);

    // If Razorpay keys are configured and mock not forced
    if (razorpayClient && !forceMock) {
      try {
        const order = await razorpayClient.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${property.propertyId.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`,
          notes: {
            propertyId: property.propertyId,
            payerId: user.id,
            payerName: user.fullName,
          },
        });

        res.json({
          success: true,
          mode: 'RAZORPAY',
          key: razorpayKeyId,
          orderId: order.id,
          amount: taxBreakdown.totalPayable,
          currency: 'INR',
          taxBreakdown,
        });
        return;
      } catch (rzpErr) {
        console.warn('Razorpay order creation failed, falling back to mock gateway:', rzpErr);
      }
    }

    // Mock Gateway Fallback
    const mockOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.json({
      success: true,
      mode: 'MOCK_GATEWAY',
      orderId: mockOrderId,
      amount: taxBreakdown.totalPayable,
      currency: 'INR',
      taxBreakdown,
      message: 'Using municipal test gateway simulator.',
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment.' });
  }
});

// -------------------------------------------------------------
// VERIFY SIGNATURE & FINALIZE PAYMENT (Receipt Generation)
// -------------------------------------------------------------
paymentRouter.post('/verify', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      propertyId,
      orderId,
      paymentId: txnId,
      signature,
      paymentMode = 'ONLINE_RAZORPAY',
      isMock = false,
    } = req.body;

    const property = await prisma.property.findFirst({
      where: {
        OR: [{ id: propertyId }, { propertyId }],
      },
      include: { owner: true },
    });

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found.' });
      return;
    }

    // Server-side Signature Verification for Razorpay
    if (!isMock && razorpayKeySecret && orderId && txnId && signature) {
      const generatedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${orderId}|${txnId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        res.status(400).json({ success: false, message: 'Invalid payment signature. Verification failed.' });
        return;
      }
    }

    const taxSetting = await prisma.taxSetting.findFirstOrThrow({ where: { isActive: true } });
    const taxBreakdown = calculatePropertyTax(property, property.owner, taxSetting);

    const receiptNumber = await generateReceiptNumber(2026);
    const amountInWords = amountToIndianWords(taxBreakdown.totalPayable);
    const finalTxnId = txnId || `TXN-SIM-${Date.now()}`;

    // Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        receiptNumber,
        propertyId: property.id,
        payerId: user.id,
        financialYear: '2026-2027',
        assessmentYear: 2026,
        baseTax: taxBreakdown.baseTax,
        ageDiscountAmount: taxBreakdown.ageDiscountAmount,
        netTax: taxBreakdown.netTax,
        earlyRebateAmount: taxBreakdown.earlyRebateAmount,
        seniorRebateAmount: taxBreakdown.seniorRebateAmount,
        latePenaltyAmount: taxBreakdown.latePenaltyAmount,
        arrearsAmount: taxBreakdown.arrearsAmount,
        arrearsPenaltyAmount: taxBreakdown.arrearsPenaltyAmount,
        totalAmount: taxBreakdown.totalPayable,
        paymentMode: isMock ? 'MOCK_GATEWAY' : paymentMode,
        transactionId: finalTxnId,
        orderId: orderId || null,
        paymentSignature: signature || null,
        status: 'SUCCESS',
        isInstalment: false,
        amountInWords,
        paidAt: new Date(),
      },
      include: {
        property: true,
        payer: true,
      },
    });

    // If property had arrears, clear arrears after payment
    if (property.hasArrears) {
      await prisma.property.update({
        where: { id: property.id },
        data: { hasArrears: false, arrearsAmount: 0, arrearsYears: null },
      });
    }

    // Write Audit Log
    await recordAuditLog({
      req,
      action: 'MAKE_PAYMENT',
      entityType: 'Payment',
      entityId: payment.id,
      details: `Paid ₹${payment.totalAmount} for ${property.propertyId}. Receipt: ${receiptNumber} (${amountInWords})`,
    });

    // Send Notification to Citizen & Officers
    await sendNotification({
      recipientUserId: user.id,
      title: 'Tax Payment Confirmed',
      message: `Receipt ${receiptNumber} issued for ₹${payment.totalAmount} on property ${property.propertyId}.`,
      type: 'SUCCESS',
      link: `/receipt/${receiptNumber}`,
    });

    // WebSocket live event
    emitBroadcast('payment:success', {
      receiptNumber,
      propertyId: property.propertyId,
      amount: payment.totalAmount,
      ward: property.wardNumber,
    });

    res.status(201).json({
      success: true,
      message: 'Payment verified and receipt generated successfully.',
      payment,
      receiptNumber,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
});

// -------------------------------------------------------------
// MODULE 13: INSTALMENT PLAN GENERATION & PAYMENT
// -------------------------------------------------------------
paymentRouter.post('/create-instalment-plan', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { propertyId, parts = 4 } = req.body;

    if (![2, 4].includes(parts)) {
      res.status(400).json({ success: false, message: 'Instalment plan must be 2 or 4 parts.' });
      return;
    }

    const property = await prisma.property.findFirst({
      where: { OR: [{ id: propertyId }, { propertyId }] },
      include: { owner: true },
    });

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found.' });
      return;
    }

    if (user.role === 'CITIZEN' && property.ownerId !== user.id) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    // Check if instalments already exist
    const existing = await prisma.paymentInstalment.findMany({
      where: { propertyId: property.id, financialYear: '2026-2027' },
    });
    if (existing.length > 0) {
      res.json({ success: true, message: 'Existing instalment plan retrieved.', instalments: existing });
      return;
    }

    const taxSetting = await prisma.taxSetting.findFirstOrThrow({ where: { isActive: true } });
    const taxBreakdown = calculatePropertyTax(property, property.owner, taxSetting);

    const partsPlan = calculateInstalmentBreakdown(taxBreakdown.totalPayable, parts as 2 | 4);

    const createdList = [];
    for (const part of partsPlan) {
      const rec = await prisma.paymentInstalment.create({
        data: {
          propertyId: property.id,
          payerId: user.id,
          financialYear: '2026-2027',
          partNumber: part.partNumber,
          totalParts: part.totalParts,
          amount: part.amount,
          dueDate: new Date(part.dueDate),
          status: 'PENDING',
        },
      });
      createdList.push(rec);
    }

    await recordAuditLog({
      req,
      action: 'CREATE_INSTALMENT_PLAN',
      entityType: 'PaymentInstalment',
      details: `Created ${parts}-part instalment plan for ${property.propertyId}`,
    });

    res.status(201).json({
      success: true,
      message: `${parts}-part instalment plan created successfully.`,
      instalments: createdList,
    });
  } catch (error) {
    console.error('Create instalment plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to create instalment plan.' });
  }
});

// Pay an individual instalment
paymentRouter.post('/pay-instalment', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { instalmentId, paymentMode = 'ONLINE_RAZORPAY' } = req.body;

    const instalment = await prisma.paymentInstalment.findUnique({
      where: { id: instalmentId },
      include: { property: { include: { owner: true } } },
    });

    if (!instalment) {
      res.status(404).json({ success: false, message: 'Instalment record not found.' });
      return;
    }

    if (instalment.status === 'PAID') {
      res.status(400).json({ success: false, message: 'This instalment has already been paid.' });
      return;
    }

    const receiptNumber = await generateReceiptNumber(2026);
    const amountInWords = amountToIndianWords(instalment.amount);
    const txnId = `TXN-INST-${Date.now()}`;

    // Create payment record for this instalment
    const payment = await prisma.payment.create({
      data: {
        receiptNumber,
        propertyId: instalment.propertyId,
        payerId: user.id,
        financialYear: instalment.financialYear,
        assessmentYear: 2026,
        baseTax: instalment.amount,
        ageDiscountAmount: 0,
        netTax: instalment.amount,
        totalAmount: instalment.amount,
        paymentMode,
        transactionId: txnId,
        status: 'SUCCESS',
        isInstalment: true,
        instalmentPlan: instalment.totalParts,
        amountInWords,
        paidAt: new Date(),
      },
    });

    // Update instalment
    const updatedInstalment = await prisma.paymentInstalment.update({
      where: { id: instalmentId },
      data: {
        status: 'PAID',
        receiptNumber,
        transactionId: txnId,
        paymentId: payment.id,
        paidAt: new Date(),
      },
    });

    await recordAuditLog({
      req,
      action: 'PAY_INSTALMENT',
      entityType: 'PaymentInstalment',
      entityId: instalment.id,
      details: `Paid instalment ${instalment.partNumber}/${instalment.totalParts} (₹${instalment.amount}) for ${instalment.property.propertyId}. Receipt: ${receiptNumber}`,
    });

    emitBroadcast('payment:success', {
      receiptNumber,
      propertyId: instalment.property.propertyId,
      amount: instalment.amount,
      isInstalment: true,
      partNumber: instalment.partNumber,
    });

    res.json({
      success: true,
      message: `Instalment ${instalment.partNumber} paid successfully.`,
      instalment: updatedInstalment,
      receiptNumber,
      payment,
    });
  } catch (error) {
    console.error('Pay instalment error:', error);
    res.status(500).json({ success: false, message: 'Failed to pay instalment.' });
  }
});

// -------------------------------------------------------------
// LIST PAYMENTS (Scoped by Role)
// -------------------------------------------------------------
paymentRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const where: any = {};

    if (user.role === 'CITIZEN') {
      where.payerId = user.id;
    } else if (user.role === 'WARD_OFFICER') {
      where.property = { wardNumber: { in: user.assignedWards } };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        property: true,
        payer: {
          select: { id: true, fullName: true, mobile: true, email: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    res.json({ success: true, payments });
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments.' });
  }
});

// -------------------------------------------------------------
// GET PRINTABLE RECEIPT DATA (Public by receipt number or auth)
// -------------------------------------------------------------
paymentRouter.get('/receipt/:receiptNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const { receiptNumber } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { receiptNumber: receiptNumber.toUpperCase() },
      include: {
        property: {
          include: {
            owner: {
              select: { fullName: true, mobile: true, email: true, isSeniorCitizen: true },
            },
          },
        },
        payer: {
          select: { fullName: true, mobile: true, email: true },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ success: false, message: 'Receipt not found.' });
      return;
    }

    res.json({ success: true, receipt: payment });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve receipt.' });
  }
});

// -------------------------------------------------------------
// RAZORPAY WEBHOOK HANDLER
// -------------------------------------------------------------
paymentRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'] as string;

    if (secret && signature) {
      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        res.status(400).json({ status: 'invalid_signature' });
        return;
      }
    }

    const event = req.body.event;
    console.log(`Razorpay webhook event received: ${event}`);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ status: 'error' });
  }
});
