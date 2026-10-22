import { Router, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js';
import { calculatePropertyTax } from '../tax/taxEngine.js';

export const reportRouter = Router();

// GET Reports Dashboard Data (8 KPIs + Charts data)
reportRouter.get(
  '/dashboard',
  authenticateToken,
  requireRole('WARD_OFFICER', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const propertyWhere: any = {};
      const paymentWhere: any = { assessmentYear: 2026, status: 'SUCCESS' };

      if (user.role === 'WARD_OFFICER') {
        propertyWhere.wardNumber = { in: user.assignedWards };
        paymentWhere.property = { wardNumber: { in: user.assignedWards } };
      }

      const [properties, payments, grievances, taxSetting] = await Promise.all([
        prisma.property.findMany({
          where: propertyWhere,
          include: {
            owner: true,
            payments: { where: { assessmentYear: 2026, status: 'SUCCESS' } },
          },
        }),
        prisma.payment.findMany({
          where: paymentWhere,
          include: { property: true },
        }),
        prisma.grievance.findMany({
          where: user.role === 'WARD_OFFICER' ? { wardNumber: { in: user.assignedWards } } : {},
        }),
        prisma.taxSetting.findFirstOrThrow({ where: { isActive: true } }),
      ]);

      // 1. Compute KPIs
      const totalProperties = properties.length;
      let totalAssessed = 0;
      let totalPaidCount = 0;
      let totalPendingCount = 0;
      let totalDefaulters = 0;
      let totalArrears = 0;

      // Groupings for charts
      const wardMap: Record<string, { ward: string; collected: number; assessed: number; properties: number }> = {};
      const typeMap: Record<string, { type: string; count: number; assessed: number; collected: number }> = {};

      for (const p of properties) {
        const breakdown = calculatePropertyTax(p, p.owner, taxSetting);
        totalAssessed += breakdown.totalPayable;

        if (p.hasArrears) {
          totalDefaulters++;
          totalArrears += p.arrearsAmount;
        }

        const isPaid = p.payments.length > 0;
        if (isPaid) {
          totalPaidCount++;
        } else {
          totalPendingCount++;
        }

        // Ward aggregation
        const w = p.wardNumber;
        if (!wardMap[w]) {
          wardMap[w] = { ward: w, collected: 0, assessed: 0, properties: 0 };
        }
        wardMap[w].properties++;
        wardMap[w].assessed += breakdown.totalPayable;

        // Type aggregation
        const t = p.propertyType;
        if (!typeMap[t]) {
          typeMap[t] = { type: t, count: 0, assessed: 0, collected: 0 };
        }
        typeMap[t].count++;
        typeMap[t].assessed += breakdown.totalPayable;
      }

      // Add collected to wardMap and typeMap
      let totalCollected = 0;
      for (const pay of payments) {
        totalCollected += pay.totalAmount;
        const w = pay.property.wardNumber;
        if (wardMap[w]) {
          wardMap[w].collected += pay.totalAmount;
        }
        const t = pay.property.propertyType;
        if (typeMap[t]) {
          typeMap[t].collected += pay.totalAmount;
        }
      }

      const totalPending = Math.max(0, totalAssessed - totalCollected);
      const collectionEfficiency =
        totalAssessed > 0 ? Math.round((totalCollected / totalAssessed) * 1000) / 10 : 0;

      const totalGrievances = grievances.length;
      const resolvedGrievances = grievances.filter((g) => g.status === 'RESOLVED').length;
      const grievanceResolutionRate =
        totalGrievances > 0 ? Math.round((resolvedGrievances / totalGrievances) * 1000) / 10 : 100;

      // 8 KPI Cards
      const kpis = {
        totalProperties,
        totalAssessed,
        totalCollected,
        totalPending,
        totalDefaulters,
        totalArrears,
        collectionEfficiency,
        grievanceResolutionRate,
      };

      // Charts data
      const wardCollectionChart = Object.values(wardMap).sort((a, b) => a.ward.localeCompare(b.ward));
      const propertyTypeChart = Object.values(typeMap);
      const paymentStatusChart = [
        { name: 'Paid', count: totalPaidCount, amount: totalCollected },
        { name: 'Pending', count: totalPendingCount, amount: totalPending },
      ];

      res.json({
        success: true,
        kpis,
        charts: {
          wardCollectionChart,
          propertyTypeChart,
          paymentStatusChart,
        },
      });
    } catch (error) {
      console.error('Reports dashboard error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate report metrics.' });
    }
  }
);

// CSV Export Endpoint
reportRouter.get(
  '/export-csv',
  authenticateToken,
  requireRole('WARD_OFFICER', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const where: any = {};
      if (user.role === 'WARD_OFFICER') {
        where.wardNumber = { in: user.assignedWards };
      }

      const properties = await prisma.property.findMany({
        where,
        include: {
          owner: true,
          payments: { where: { assessmentYear: 2026, status: 'SUCCESS' } },
        },
        orderBy: { propertyId: 'asc' },
      });

      const taxSetting = await prisma.taxSetting.findFirstOrThrow({ where: { isActive: true } });

      let csv = 'Property ID,Ward,Owner Name,Mobile,Property Type,Built-up Area (SqFt),Age (Yrs),Base Tax (INR),Net Tax (INR),Total Payable (INR),Status,Receipt No,Arrears (INR)\n';

      for (const p of properties) {
        const breakdown = calculatePropertyTax(p, p.owner, taxSetting);
        const isPaid = p.payments.length > 0;
        const receiptNo = isPaid ? p.payments[0].receiptNumber : 'N/A';
        const status = isPaid ? 'PAID' : p.hasArrears ? 'OVERDUE' : 'PENDING';

        csv += `"${p.propertyId}","${p.wardNumber}","${p.owner.fullName}","${p.owner.mobile}","${p.propertyType}",${p.builtUpAreaSqFt},${breakdown.propertyAgeYears},${breakdown.baseTax},${breakdown.netTax},${breakdown.totalPayable},"${status}","${receiptNo}",${p.arrearsAmount}\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sampada_kar_tax_report.csv"');
      res.status(200).send(csv);
    } catch (error) {
      console.error('Export CSV error:', error);
      res.status(500).json({ success: false, message: 'Failed to export CSV.' });
    }
  }
);
