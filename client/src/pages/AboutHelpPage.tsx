import React from 'react';
import { HelpCircle, Calculator, CheckCircle2, AlertTriangle, Phone, Mail, MapPin } from 'lucide-react';
import { Badge } from '../components/common/Badge.js';

export const AboutHelpPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Title */}
      <div className="text-center space-y-3">
        <Badge variant="primary" size="md">
          Municipal Citizen Assistance
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          Property Tax Guidelines & Worked Example
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Learn how property taxes are assessed, the statutory formula used, and how rebates and penalties are calculated under the Municipal Corporations Act.
        </p>
      </div>

      {/* Verified Worked Tax Example */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Official Municipal Worked Tax Example
          </h2>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            Consider a typical residential property with <strong>1,500 sq ft</strong> built-up area constructed in <strong>2006</strong> (Age: 20 years during FY 2026-27 assessment).
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono space-y-2">
            <div className="flex justify-between">
              <span>1. Base Tax = 1,500 sq ft × ₹8.00/sq ft (Residential Rate)</span>
              <span className="font-bold">₹12,000.00</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>2. Age Discount = 20% (for 16-30 years band)</span>
              <span className="font-bold">- ₹2,400.00</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 dark:border-slate-600 pt-1 font-bold">
              <span>3. Net Municipal Tax = Base − Age Discount</span>
              <span>₹9,600.00</span>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-600 space-y-2">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>4A. Early Bird Rebate = 5% of Net Tax (Paid before cutoff)</span>
                <span className="font-bold">- ₹480.00</span>
              </div>
              <div className="flex justify-between font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                <span>Net Total with Early Rebate:</span>
                <span>₹9,120.00</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Words: <em>Rupees Nine Thousand One Hundred Twenty Only</em>
              </p>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-600 space-y-2">
              <div className="flex justify-between text-rose-600 dark:text-rose-400">
                <span>4B. If Paid 1 Month Late = 2% Monthly Penalty on Net Tax</span>
                <span className="font-bold">+ ₹192.00</span>
              </div>
              <div className="flex justify-between font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                <span>Net Total 1 Month Late:</span>
                <span>₹9,792.00</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Words: <em>Rupees Nine Thousand Seven Hundred Ninety Two Only</em>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" /> Frequently Asked Questions (FAQ)
        </h2>

        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Who qualifies for the Senior Citizen Rebate?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Citizens aged 60 years or older who own and reside in their primary residential property are eligible for an additional 10% rebate on net municipal property tax.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              How does the Quarterly Instalment scheme work?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Citizens can opt to split annual tax dues into 2 or 4 quarterly instalments scheduled 3 months apart. Rounding is applied to the final instalment, and each instalment generates an individual official receipt.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              What happens if tax remains unpaid after the due date?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              A monthly late penalty of 2% (capped at 24%) accrues. If the full year expires unpaid, the property enters the Defaulters Ledger with 18% annual arrears interest, and a statutory Demand Notice with a 15-day compliance deadline is issued.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              How do I apply for ownership transfer / mutation?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Citizens can submit an online transfer application with their registered deed number. The assigned Ward Officer reviews the registry documents; upon approval, previous ownership history is closed and the new owner record is activated.
            </p>
          </div>
        </div>
      </div>

      {/* Contact & Citizen Helpdesk */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-3xl border border-blue-200 dark:border-blue-900 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-blue-900 dark:text-blue-200">
        <div className="space-y-1">
          <h3 className="font-bold text-sm">Need Additional Assistance?</h3>
          <p className="text-blue-700 dark:text-blue-300">
            Contact the Municipal Revenue Helpdesk or visit your local Ward Office during business hours (10:00 AM – 5:00 PM).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <a
            href="tel:18002330455"
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl text-center shadow-xs"
          >
            Toll Free: 1800-233-0455
          </a>
        </div>
      </div>
    </div>
  );
};
