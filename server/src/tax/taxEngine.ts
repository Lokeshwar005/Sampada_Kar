export interface TaxEnginePropertyInput {
  builtUpAreaSqFt: number;
  propertyType: string;
  constructionYear: number;
  isExempt?: boolean;
  exemptionReason?: string | null;
  hasArrears?: boolean;
  arrearsAmount?: number;
}

export interface TaxEngineOwnerInput {
  isSeniorCitizen?: boolean;
}

export interface TaxSettingInput {
  residentialRate: number;
  commercialRate: number;
  industrialRate: number;
  institutionalRate: number;
  agriculturalRate: number;
  ageBand0to5: number;
  ageBand6to15: number;
  ageBand16to30: number;
  ageBandAbove30: number;
  earlyBirdRebatePercent: number;
  seniorCitizenRebatePercent: number;
  latePaymentPenaltyMonthlyPercent: number;
  maxPenaltyPercentCap: number;
  arrearPenaltyPercent: number;
  dueDate: Date | string;
  earlyBirdCutoffDate: Date | string;
}

export interface TaxCalculationOptions {
  asOfDate?: Date;
  assessmentYear?: number;
  forceEarlyRebate?: boolean;
  monthsLate?: number;
}

export interface TaxBreakdown {
  ratePerSqFt: number;
  builtUpAreaSqFt: number;
  baseTax: number;
  propertyAgeYears: number;
  ageBandLabel: string;
  ageDiscountPercent: number;
  ageDiscountAmount: number;
  netTax: number;
  isExempt: boolean;
  exemptionReason?: string | null;
  isEarlyBirdEligible: boolean;
  earlyBirdRebatePercent: number;
  earlyRebateAmount: number;
  isSeniorCitizenEligible: boolean;
  seniorCitizenRebatePercent: number;
  seniorRebateAmount: number;
  monthsLate: number;
  latePenaltyPercent: number;
  latePenaltyAmount: number;
  arrearsAmount: number;
  arrearsPenaltyAmount: number;
  totalPayable: number;
  calculationDate: string;
}

/**
 * Single source of truth for Municipal Property Tax Calculation.
 * All amounts are rounded to 2 decimal places (or integer for display).
 */
export function calculatePropertyTax(
  property: TaxEnginePropertyInput,
  owner: TaxEngineOwnerInput = {},
  taxSetting: TaxSettingInput,
  options: TaxCalculationOptions = {}
): TaxBreakdown {
  const asOf = options.asOfDate ? new Date(options.asOfDate) : new Date();
  const currentYear = options.assessmentYear || asOf.getFullYear();

  // 1. If property is exempt, total is zero immediately
  if (property.isExempt) {
    return {
      ratePerSqFt: 0,
      builtUpAreaSqFt: property.builtUpAreaSqFt,
      baseTax: 0,
      propertyAgeYears: Math.max(0, currentYear - property.constructionYear),
      ageBandLabel: 'Exempt',
      ageDiscountPercent: 0,
      ageDiscountAmount: 0,
      netTax: 0,
      isExempt: true,
      exemptionReason: property.exemptionReason || 'Municipal Exemption',
      isEarlyBirdEligible: false,
      earlyBirdRebatePercent: 0,
      earlyRebateAmount: 0,
      isSeniorCitizenEligible: false,
      seniorCitizenRebatePercent: 0,
      seniorRebateAmount: 0,
      monthsLate: 0,
      latePenaltyPercent: 0,
      latePenaltyAmount: 0,
      arrearsAmount: 0,
      arrearsPenaltyAmount: 0,
      totalPayable: 0,
      calculationDate: asOf.toISOString(),
    };
  }

  // 2. Determine rate by property type
  const normType = (property.propertyType || 'RESIDENTIAL').toUpperCase();
  let rate = taxSetting.residentialRate;
  if (normType === 'COMMERCIAL') {
    rate = taxSetting.commercialRate;
  } else if (normType === 'INDUSTRIAL') {
    rate = taxSetting.industrialRate;
  } else if (normType === 'INSTITUTIONAL') {
    rate = taxSetting.institutionalRate;
  } else if (normType === 'AGRICULTURAL') {
    rate = taxSetting.agriculturalRate;
  }

  // Base Tax = area * rate
  const baseTax = Math.round(property.builtUpAreaSqFt * rate * 100) / 100;

  // 3. Property Age & Age Discount
  const propertyAge = Math.max(0, currentYear - property.constructionYear);
  let ageDiscountPercent = 0;
  let ageBandLabel = '0 to 5 Years (New)';

  if (propertyAge <= 5) {
    ageDiscountPercent = taxSetting.ageBand0to5;
    ageBandLabel = '0 to 5 Years';
  } else if (propertyAge <= 15) {
    ageDiscountPercent = taxSetting.ageBand6to15;
    ageBandLabel = '6 to 15 Years';
  } else if (propertyAge <= 30) {
    ageDiscountPercent = taxSetting.ageBand16to30;
    ageBandLabel = '16 to 30 Years';
  } else {
    ageDiscountPercent = taxSetting.ageBandAbove30;
    ageBandLabel = 'Above 30 Years (Vintage)';
  }

  const ageDiscountAmount = Math.round(baseTax * (ageDiscountPercent / 100) * 100) / 100;
  const netTax = Math.max(0, Math.round((baseTax - ageDiscountAmount) * 100) / 100);

  // 4. Early Bird Rebate
  const earlyBirdCutoff = new Date(taxSetting.earlyBirdCutoffDate);
  const isEarlyBirdEligible = options.forceEarlyRebate ?? (asOf <= earlyBirdCutoff);
  const earlyRebateAmount = isEarlyBirdEligible
    ? Math.round(netTax * (taxSetting.earlyBirdRebatePercent / 100) * 100) / 100
    : 0;

  // 5. Senior Citizen Rebate (applied to residential properties)
  const isSeniorEligible = Boolean(owner.isSeniorCitizen);
  const seniorRebateAmount = isSeniorEligible
    ? Math.round(netTax * (taxSetting.seniorCitizenRebatePercent / 100) * 100) / 100
    : 0;

  // 6. Late Penalty
  const dueDate = new Date(taxSetting.dueDate);
  let monthsLate = 0;
  if (options.monthsLate !== undefined) {
    monthsLate = Math.max(0, options.monthsLate);
  } else if (asOf > dueDate) {
    const diffMs = asOf.getTime() - dueDate.getTime();
    // Rough monthly calculation: 30 days per month, ceiling of overdue period
    monthsLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
  }

  // If late penalty applies, early rebate is disabled
  const effectiveEarlyRebate = monthsLate > 0 ? 0 : earlyRebateAmount;

  let latePenaltyPercent = 0;
  let latePenaltyAmount = 0;
  if (monthsLate > 0) {
    latePenaltyPercent = Math.min(
      monthsLate * taxSetting.latePaymentPenaltyMonthlyPercent,
      taxSetting.maxPenaltyPercentCap
    );
    latePenaltyAmount = Math.round(netTax * (latePenaltyPercent / 100) * 100) / 100;
  }

  // 7. Arrears and Arrears Penalty
  const arrearsAmount = property.hasArrears && property.arrearsAmount ? property.arrearsAmount : 0;
  const arrearsPenaltyAmount = arrearsAmount > 0
    ? Math.round(arrearsAmount * (taxSetting.arrearPenaltyPercent / 100) * 100) / 100
    : 0;

  // 8. Total Payable
  // total = net - early_rebate - senior_rebate + late_penalty + arrears + arrears_penalty
  const totalPayable = Math.max(
    0,
    Math.round(
      (netTax - effectiveEarlyRebate - seniorRebateAmount + latePenaltyAmount + arrearsAmount + arrearsPenaltyAmount) *
        100
    ) / 100
  );

  return {
    ratePerSqFt: rate,
    builtUpAreaSqFt: property.builtUpAreaSqFt,
    baseTax,
    propertyAgeYears: propertyAge,
    ageBandLabel,
    ageDiscountPercent,
    ageDiscountAmount,
    netTax,
    isExempt: false,
    exemptionReason: null,
    isEarlyBirdEligible: monthsLate === 0 && isEarlyBirdEligible,
    earlyBirdRebatePercent: isEarlyBirdEligible ? taxSetting.earlyBirdRebatePercent : 0,
    earlyRebateAmount: effectiveEarlyRebate,
    isSeniorCitizenEligible: isSeniorEligible,
    seniorCitizenRebatePercent: isSeniorEligible ? taxSetting.seniorCitizenRebatePercent : 0,
    seniorRebateAmount,
    monthsLate,
    latePenaltyPercent,
    latePenaltyAmount,
    arrearsAmount,
    arrearsPenaltyAmount,
    totalPayable,
    calculationDate: asOf.toISOString(),
  };
}

/**
 * Split tax into equal instalments with exact rounding on the last part.
 */
export function calculateInstalmentBreakdown(
  totalPayable: number,
  parts: 2 | 4,
  baseDate: Date = new Date()
): Array<{ partNumber: number; totalParts: number; amount: number; dueDate: string }> {
  const basePart = Math.floor((totalPayable / parts) * 100) / 100;
  const allocated = Math.round(basePart * (parts - 1) * 100) / 100;
  const lastPart = Math.round((totalPayable - allocated) * 100) / 100;

  const instalments = [];
  for (let i = 1; i <= parts; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1) * 3); // 3 months apart
    instalments.push({
      partNumber: i,
      totalParts: parts,
      amount: i === parts ? lastPart : basePart,
      dueDate: dueDate.toISOString(),
    });
  }
  return instalments;
}
