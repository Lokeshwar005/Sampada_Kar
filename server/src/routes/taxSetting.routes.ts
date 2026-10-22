import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/auditLogger.js';
import { emitBroadcast } from '../services/socket.js';

export const taxSettingRouter = Router();

// GET current active tax setting (Public or Authenticated)
taxSettingRouter.get('/current', async (req: Request, res: Response): Promise<void> => {
  try {
    const setting = await prisma.taxSetting.findFirst({
      where: { isActive: true },
    });

    if (!setting) {
      res.status(404).json({ success: false, message: 'No active tax setting found.' });
      return;
    }

    res.json({ success: true, taxSetting: setting });
  } catch (error) {
    console.error('Get active tax setting error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active tax rates.' });
  }
});

// GET year-wise tax archive (2022 to current) - Module 19
taxSettingRouter.get('/archive', async (req: Request, res: Response): Promise<void> => {
  try {
    const archive = await prisma.taxSetting.findMany({
      orderBy: { financialYear: 'desc' },
    });

    res.json({ success: true, archive });
  } catch (error) {
    console.error('Get tax archive error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tax archive.' });
  }
});

// GET exempt property categories and currently exempted properties list - Module 12
taxSettingRouter.get('/exempt-categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const exemptProperties = await prisma.property.findMany({
      where: { isExempt: true },
      include: {
        owner: {
          select: { fullName: true },
        },
      },
      orderBy: { wardNumber: 'asc' },
    });

    const standardExemptions = [
      {
        category: 'Places of Public Worship',
        description: 'Temples, Mosques, Churches, Gurudwaras used exclusively for religious worship.',
        clause: 'Section 132(1)(a) Municipal Corporations Act',
      },
      {
        category: 'Municipal & Government Schools',
        description: 'Primary, secondary, and higher secondary institutions operated by local or state govt.',
        clause: 'Section 132(1)(b) Municipal Corporations Act',
      },
      {
        category: 'Public Health Centers & Hospitals',
        description: 'Civil dispensaries, maternity wards, and charitable hospitals offering free care.',
        clause: 'Section 132(1)(c) Municipal Corporations Act',
      },
      {
        category: 'War Widows & Gallantry Awardees',
        description: 'Single residential dwelling unit owned and occupied by Param Vir Chakra / Ashok Chakra recipients or widows.',
        clause: 'Section 132(2) Municipal Rules',
      },
    ];

    res.json({
      success: true,
      standardExemptions,
      exemptProperties,
      totalExemptCount: exemptProperties.length,
    });
  } catch (error) {
    console.error('Get exempt categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exemption records.' });
  }
});

// UPDATE active tax settings (ADMIN ONLY) - Module 4
taxSettingRouter.put(
  '/current',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const active = await prisma.taxSetting.findFirst({
        where: { isActive: true },
      });

      if (!active) {
        res.status(404).json({ success: false, message: 'No active tax setting found to update.' });
        return;
      }

      const {
        residentialRate,
        commercialRate,
        industrialRate,
        institutionalRate,
        agriculturalRate,
        ageBand0to5,
        ageBand6to15,
        ageBand16to30,
        ageBandAbove30,
        earlyBirdRebatePercent,
        seniorCitizenRebatePercent,
        latePaymentPenaltyMonthlyPercent,
        maxPenaltyPercentCap,
        arrearPenaltyPercent,
        dueDate,
        earlyBirdCutoffDate,
      } = req.body;

      const updated = await prisma.taxSetting.update({
        where: { id: active.id },
        data: {
          residentialRate: residentialRate !== undefined ? Number(residentialRate) : active.residentialRate,
          commercialRate: commercialRate !== undefined ? Number(commercialRate) : active.commercialRate,
          industrialRate: industrialRate !== undefined ? Number(industrialRate) : active.industrialRate,
          institutionalRate: institutionalRate !== undefined ? Number(institutionalRate) : active.institutionalRate,
          agriculturalRate: agriculturalRate !== undefined ? Number(agriculturalRate) : active.agriculturalRate,
          ageBand0to5: ageBand0to5 !== undefined ? Number(ageBand0to5) : active.ageBand0to5,
          ageBand6to15: ageBand6to15 !== undefined ? Number(ageBand6to15) : active.ageBand6to15,
          ageBand16to30: ageBand16to30 !== undefined ? Number(ageBand16to30) : active.ageBand16to30,
          ageBandAbove30: ageBandAbove30 !== undefined ? Number(ageBandAbove30) : active.ageBandAbove30,
          earlyBirdRebatePercent:
            earlyBirdRebatePercent !== undefined ? Number(earlyBirdRebatePercent) : active.earlyBirdRebatePercent,
          seniorCitizenRebatePercent:
            seniorCitizenRebatePercent !== undefined
              ? Number(seniorCitizenRebatePercent)
              : active.seniorCitizenRebatePercent,
          latePaymentPenaltyMonthlyPercent:
            latePaymentPenaltyMonthlyPercent !== undefined
              ? Number(latePaymentPenaltyMonthlyPercent)
              : active.latePaymentPenaltyMonthlyPercent,
          maxPenaltyPercentCap:
            maxPenaltyPercentCap !== undefined ? Number(maxPenaltyPercentCap) : active.maxPenaltyPercentCap,
          arrearPenaltyPercent:
            arrearPenaltyPercent !== undefined ? Number(arrearPenaltyPercent) : active.arrearPenaltyPercent,
          dueDate: dueDate ? new Date(dueDate) : active.dueDate,
          earlyBirdCutoffDate: earlyBirdCutoffDate ? new Date(earlyBirdCutoffDate) : active.earlyBirdCutoffDate,
        },
      });

      await recordAuditLog({
        req,
        action: 'UPDATE_TAX_RATES',
        entityType: 'TaxSetting',
        entityId: updated.id,
        details: `Updated FY ${updated.financialYear} tax parameters. Res: ₹${updated.residentialRate}, Comm: ₹${updated.commercialRate}, Ind: ₹${updated.industrialRate}, Rebate: ${updated.earlyBirdRebatePercent}%, Penalty: ${updated.latePaymentPenaltyMonthlyPercent}%/mo`,
      });

      // Notify clients to refresh tax computations live
      emitBroadcast('tax-settings:updated', updated);

      res.json({
        success: true,
        message: 'Tax settings updated successfully. All property taxes reassessed in real time.',
        taxSetting: updated,
      });
    } catch (error) {
      console.error('Update tax settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to update tax settings.' });
    }
  }
);
