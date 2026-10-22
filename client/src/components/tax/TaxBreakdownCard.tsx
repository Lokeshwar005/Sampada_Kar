import React from 'react';
import { TaxBreakdown } from '../../types/index.js';
import { CheckCircle2, AlertCircle, Award, Calendar, Percent, ShieldCheck } from 'lucide-react';

interface TaxBreakdownCardProps {
  breakdown: TaxBreakdown;
  compact?: boolean;
}

export const TaxBreakdownCard: React.FC<TaxBreakdownCardProps> = ({
  breakdown,
  compact = false,
}) => {
  if (breakdown.isExempt) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-emerald-900 dark:text-emerald-200">
        <div className="flex items-center gap-2 font-bold text-base">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Statutorily Exempt Property</span>
        </div>
        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
          Reason: {breakdown.exemptionReason || 'Municipal Exemption Clause'}
        </p>
        <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Tax Payable</span>
          <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">₹0.00</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Statutory Tax Calculation Breakdown
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Rate: ₹{breakdown.ratePerSqFt}/sq ft
        </span>
      </div>

      <div className="p-4 space-y-2 text-xs">
        {/* 1. Base Tax */}
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-300">
            Base Tax ({breakdown.builtUpAreaSqFt} sq ft × ₹{breakdown.ratePerSqFt})
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            ₹{breakdown.baseTax.toLocaleString('en-IN')}
          </span>
        </div>

        {/* 2. Age Discount */}
        {breakdown.ageDiscountAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Age Discount ({breakdown.ageBandLabel} – {breakdown.ageDiscountPercent}%)
            </span>
            <span className="font-semibold">
              - ₹{breakdown.ageDiscountAmount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {/* 3. Net Tax */}
        <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-200 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>Net Tax (Base − Age Discount)</span>
          <span>₹{breakdown.netTax.toLocaleString('en-IN')}</span>
        </div>

        {/* 4. Early Bird Rebate */}
        {breakdown.earlyRebateAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Early Bird Rebate ({breakdown.earlyBirdRebatePercent}% of net tax)
            </span>
            <span className="font-semibold">
              - ₹{breakdown.earlyRebateAmount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {/* 5. Senior Citizen Rebate */}
        {breakdown.seniorRebateAmount > 0 && (
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Senior Citizen Concession ({breakdown.seniorCitizenRebatePercent}% of net tax)
            </span>
            <span className="font-semibold">
              - ₹{breakdown.seniorRebateAmount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {/* 6. Late Payment Penalty */}
        {breakdown.latePenaltyAmount > 0 && (
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Late Penalty ({breakdown.monthsLate} mo @ {breakdown.latePenaltyPercent}%)
            </span>
            <span className="font-semibold">
              + ₹{breakdown.latePenaltyAmount.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {/* 7. Arrears & Arrear Penalty */}
        {breakdown.arrearsAmount > 0 && (
          <>
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span>Previous Unpaid Arrears</span>
              <span className="font-semibold">
                + ₹{breakdown.arrearsAmount.toLocaleString('en-IN')}
              </span>
            </div>
            {breakdown.arrearsPenaltyAmount > 0 && (
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                <span>Statutory Arrears Interest (18% p.a.)</span>
                <span className="font-semibold">
                  + ₹{breakdown.arrearsPenaltyAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </>
        )}

        {/* Final Payable */}
        <div className="pt-2 mt-2 border-t-2 border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Total Net Amount Payable
            </p>
            <p className="text-[10px] text-slate-400">FY 2026-2027 Assessment</p>
          </div>
          <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400">
            ₹{breakdown.totalPayable.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
};
