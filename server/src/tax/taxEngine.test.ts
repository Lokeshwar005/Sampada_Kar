import { describe, it, expect } from 'vitest';
import { calculatePropertyTax, calculateInstalmentBreakdown, TaxSettingInput } from './taxEngine.js';
import { amountToIndianWords } from '../utils/numberToWords.js';

describe('Tax Engine Core Tests', () => {
  const sampleTaxSetting: TaxSettingInput = {
    residentialRate: 8.0,
    commercialRate: 15.0,
    industrialRate: 18.0,
    institutionalRate: 10.0,
    agriculturalRate: 3.0,
    ageBand0to5: 0.0,
    ageBand6to15: 10.0,
    ageBand16to30: 20.0,
    ageBandAbove30: 30.0,
    earlyBirdRebatePercent: 5.0,
    seniorCitizenRebatePercent: 10.0,
    latePaymentPenaltyMonthlyPercent: 2.0,
    maxPenaltyPercentCap: 24.0,
    arrearPenaltyPercent: 18.0,
    dueDate: new Date('2026-06-30T23:59:59Z'),
    earlyBirdCutoffDate: new Date('2026-05-31T23:59:59Z'),
  };

  it('passes the worked example with 5% early bird rebate: 1,500 sq ft @ ₹8 = ₹12,000; 20% age disc = ₹9,600; 5% early rebate -> ₹9,120', () => {
    // 1500 sq ft, residential, 20 years old (built 2006 for year 2026 assessment)
    const property = {
      builtUpAreaSqFt: 1500,
      propertyType: 'RESIDENTIAL',
      constructionYear: 2006, // Age = 20 years -> in 16 to 30 band -> 20% discount
    };

    const result = calculatePropertyTax(property, {}, sampleTaxSetting, {
      assessmentYear: 2026,
      forceEarlyRebate: true,
      monthsLate: 0,
    });

    expect(result.ratePerSqFt).toBe(8);
    expect(result.baseTax).toBe(12000);
    expect(result.propertyAgeYears).toBe(20);
    expect(result.ageDiscountPercent).toBe(20);
    expect(result.ageDiscountAmount).toBe(2400);
    expect(result.netTax).toBe(9600);
    expect(result.earlyRebateAmount).toBe(480);
    expect(result.totalPayable).toBe(9120);

    const words = amountToIndianWords(result.totalPayable);
    expect(words).toBe('Rupees Nine Thousand One Hundred Twenty Only');
  });

  it('passes the worked example with 1 month late penalty: 1,500 sq ft @ ₹8; net ₹9,600; 2% penalty ₹192 -> ₹9,792', () => {
    const property = {
      builtUpAreaSqFt: 1500,
      propertyType: 'RESIDENTIAL',
      constructionYear: 2006,
    };

    const result = calculatePropertyTax(property, {}, sampleTaxSetting, {
      assessmentYear: 2026,
      forceEarlyRebate: false,
      monthsLate: 1, // 1 month late -> 2% of 9600 = 192
    });

    expect(result.baseTax).toBe(12000);
    expect(result.netTax).toBe(9600);
    expect(result.earlyRebateAmount).toBe(0);
    expect(result.latePenaltyPercent).toBe(2);
    expect(result.latePenaltyAmount).toBe(192);
    expect(result.totalPayable).toBe(9792);

    const words = amountToIndianWords(result.totalPayable);
    expect(words).toBe('Rupees Nine Thousand Seven Hundred Ninety Two Only');
  });

  it('exempt properties result in ₹0 payable immediately regardless of size', () => {
    const exemptProperty = {
      builtUpAreaSqFt: 5000,
      propertyType: 'INSTITUTIONAL',
      constructionYear: 1990,
      isExempt: true,
      exemptionReason: 'Municipal Public School',
    };

    const result = calculatePropertyTax(exemptProperty, {}, sampleTaxSetting);
    expect(result.isExempt).toBe(true);
    expect(result.totalPayable).toBe(0);
  });

  it('applies senior citizen rebate for senior citizens on residential property', () => {
    const property = {
      builtUpAreaSqFt: 1000,
      propertyType: 'RESIDENTIAL',
      constructionYear: 2024, // 2 years old -> 0% age discount
    };

    // 1000 * 8 = 8000 base, 8000 net, 10% senior rebate = 800
    const result = calculatePropertyTax(property, { isSeniorCitizen: true }, sampleTaxSetting, {
      forceEarlyRebate: false,
      monthsLate: 0,
    });

    expect(result.baseTax).toBe(8000);
    expect(result.seniorCitizenRebatePercent).toBe(10);
    expect(result.seniorRebateAmount).toBe(800);
    expect(result.totalPayable).toBe(7200);
  });

  it('calculates 4-part instalment plan with rounding on last part', () => {
    // ₹9,792 split into 4 parts: 9792 / 4 = 2448 each
    const instalments = calculateInstalmentBreakdown(9792, 4);
    expect(instalments.length).toBe(4);
    const sum = instalments.reduce((acc, curr) => acc + curr.amount, 0);
    expect(sum).toBe(9792);

    // Test uneven split e.g. 10000 into 3 parts or 10001 into 4 parts
    const uneven = calculateInstalmentBreakdown(10001, 4);
    const unevenSum = uneven.reduce((acc, curr) => acc + curr.amount, 0);
    expect(unevenSum).toBe(10001);
  });
});
