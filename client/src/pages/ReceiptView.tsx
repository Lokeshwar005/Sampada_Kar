import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { Payment } from '../types/index.js';

export const ReceiptView: React.FC = () => {
  const { receiptNumber } = useParams<{ receiptNumber: string }>();
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (receiptNumber) {
      api
        .get(`/payments/receipt/${receiptNumber}`)
        .then((res) => {
          if (res.data?.success) {
            setReceipt(res.data.receipt);
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Receipt not found');
        })
        .finally(() => setLoading(false));
    }
  }, [receiptNumber]);

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading Official Municipal Receipt...</div>;
  }

  if (error || !receipt) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-rose-600 font-bold">{error || 'Receipt not found'}</p>
        <Link to="/" className="text-blue-600 hover:underline text-xs">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Action Bar (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Portal
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Official Municipal Tax Receipt Document */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-3xl border-2 border-slate-300 shadow-xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
        {/* Subtle Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <img src="/emblem.svg" alt="Watermark" className="w-96 h-96" />
        </div>

        {/* Header */}
        <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6 relative z-10">
          <img src="/emblem.svg" alt="Emblem" className="w-16 h-16 mx-auto" />
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
            Municipal Corporation
          </h1>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">
            सम्पत्ति कर विभाग • Property Tax & Revenue Department
          </p>
          <div className="inline-block px-4 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-md mt-1">
            Official Property Tax Payment Receipt (FY {receipt.financialYear})
          </div>
        </div>

        {/* Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Receipt Number
            </span>
            <span className="font-mono font-bold text-sm text-blue-800">
              {receipt.receiptNumber}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Transaction Date & Time
            </span>
            <span className="font-semibold">
              {new Date(receipt.paidAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
              Payment Mode
            </span>
            <span className="font-mono font-semibold">
              {receipt.paymentMode}
            </span>
          </div>
        </div>

        {/* Property & Taxpayer Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
              Property Details
            </span>
            <p className="font-bold text-sm text-slate-900">
              Property ID: {receipt.property?.propertyId}
            </p>
            <p className="text-slate-700">Ward: {receipt.property?.wardNumber}</p>
            <p className="text-slate-700">Category: {receipt.property?.propertyType}</p>
            <p className="text-slate-600 leading-tight mt-0.5">
              Address: {receipt.property?.address}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">
              Payer Information
            </span>
            <p className="font-bold text-sm text-slate-900">
              Name: {receipt.payer?.fullName || receipt.property?.owner?.fullName}
            </p>
            <p className="text-slate-700">
              Mobile: {receipt.payer?.mobile || receipt.property?.owner?.mobile}
            </p>
            <p className="text-slate-700">
              Email: {receipt.payer?.email || receipt.property?.owner?.email}
            </p>
            <p className="text-slate-600 font-mono text-[11px] mt-0.5">
              Transaction ID: {receipt.transactionId}
            </p>
          </div>
        </div>

        {/* Itemized Line-by-Line Table */}
        <div className="py-4 border-b border-slate-200 text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 text-[10px] uppercase font-bold">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="py-2 font-sans">
                  Base Annual Property Tax ({receipt.property?.builtUpAreaSqFt} sq ft)
                </td>
                <td className="py-2 text-right font-bold">
                  ₹{receipt.baseTax.toLocaleString('en-IN')}
                </td>
              </tr>
              {receipt.ageDiscountAmount > 0 && (
                <tr className="text-emerald-700">
                  <td className="py-2 font-sans">Age Depreciation Band Discount</td>
                  <td className="py-2 text-right">
                    - ₹{receipt.ageDiscountAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              <tr className="font-sans font-semibold border-t border-slate-200">
                <td className="py-2">Net Municipal Tax</td>
                <td className="py-2 text-right font-mono">
                  ₹{receipt.netTax.toLocaleString('en-IN')}
                </td>
              </tr>
              {receipt.earlyRebateAmount > 0 && (
                <tr className="text-emerald-700">
                  <td className="py-2 font-sans">Early Bird 5% Payment Concession</td>
                  <td className="py-2 text-right">
                    - ₹{receipt.earlyRebateAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              {receipt.seniorRebateAmount > 0 && (
                <tr className="text-purple-700">
                  <td className="py-2 font-sans">Senior Citizen 10% Statutory Rebate</td>
                  <td className="py-2 text-right">
                    - ₹{receipt.seniorRebateAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              {receipt.latePenaltyAmount > 0 && (
                <tr className="text-rose-700">
                  <td className="py-2 font-sans">Statutory Late Payment Penalty</td>
                  <td className="py-2 text-right">
                    + ₹{receipt.latePenaltyAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              {receipt.arrearsAmount > 0 && (
                <tr className="text-amber-700">
                  <td className="py-2 font-sans">Previous Financial Year Arrears</td>
                  <td className="py-2 text-right">
                    + ₹{receipt.arrearsAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-900 font-sans font-black text-sm">
                <td className="py-3">TOTAL AMOUNT RECEIVED</td>
                <td className="py-3 text-right font-mono text-base text-blue-900">
                  ₹{receipt.totalAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Amount in Words */}
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="font-bold text-slate-600 block text-[10px] uppercase">
              Amount in Words:
            </span>
            <span className="font-bold text-slate-900 italic">
              {receipt.amountInWords}
            </span>
          </div>
        </div>

        {/* Footer Signatures & QR Code */}
        <div className="pt-6 flex items-center justify-between text-xs">
          {/* QR Code Graphic placeholder */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 border-2 border-slate-800 p-1 flex items-center justify-center font-mono text-[9px] text-center font-bold">
              VERIFIED QR PORTAL
            </div>
            <div className="text-[10px] text-slate-500">
              <p>Digitally signed & authenticated.</p>
              <p>Verify at: portal.sampadakar.gov.in</p>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="w-36 h-10 border-b border-slate-400 flex items-center justify-center italic text-blue-900 font-serif font-bold text-xs">
              [ Digitally Signed ]
            </div>
            <p className="font-bold text-slate-800 text-[11px]">Authorized Signatory</p>
            <p className="text-[10px] text-slate-500">Municipal Corporation Revenue Cell</p>
          </div>
        </div>
      </div>
    </div>
  );
};
