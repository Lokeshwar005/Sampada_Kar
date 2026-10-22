import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, ShieldAlert } from 'lucide-react';
import { api } from '../services/api.js';
import { DemandNotice } from '../types/index.js';

export const DemandNoticeView: React.FC = () => {
  const { noticeNumber } = useParams<{ noticeNumber: string }>();
  const [notice, setNotice] = useState<DemandNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (noticeNumber) {
      api
        .get(`/defaulters/notice/${noticeNumber}`)
        .then((res) => {
          if (res.data?.success) {
            setNotice(res.data.notice);
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Notice not found');
        })
        .finally(() => setLoading(false));
    }
  }, [noticeNumber]);

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading Statutory Demand Notice...</div>;
  }

  if (error || !notice) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-rose-600 font-bold">{error || 'Demand notice not found'}</p>
        <Link to="/" className="text-blue-600 hover:underline text-xs">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Portal
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save Formal Notice (PDF)
        </button>
      </div>

      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-3xl border-2 border-rose-300 shadow-xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
        <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6 relative z-10">
          <img src="/emblem.svg" alt="Emblem" className="w-16 h-16 mx-auto" />
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
            Municipal Corporation
          </h1>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">
            OFFICE OF THE MUNICIPAL REVENUE COMMISSIONER
          </p>
          <div className="inline-block px-4 py-1.5 bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-md mt-1">
            FORM NO. 12 – STATUTORY DEMAND NOTICE (UNDER SECTION 132)
          </div>
        </div>

        <div className="flex justify-between py-4 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Notice Reference
            </span>
            <span className="font-mono font-bold text-rose-700 text-sm">
              {notice.noticeNumber}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Issue Date
            </span>
            <span className="font-semibold">
              {new Date(notice.issueDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-rose-600 uppercase font-bold block">
              Statutory 15-Day Deadline
            </span>
            <span className="font-bold text-rose-700 text-sm">
              {new Date(notice.deadlineDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="py-4 space-y-3 text-xs leading-relaxed">
          <p className="font-bold text-slate-900">
            To: <br />
            {notice.recipient?.fullName} <br />
            Property: {notice.property?.propertyId} (Ward {notice.property?.wardNumber}) <br />
            Address: {notice.property?.address}
          </p>

          <p className="pt-2">
            TAKE NOTICE that whereas the sum of <strong>₹{notice.totalDue.toLocaleString('en-IN')}</strong>{' '}
            is due and payable by you to the Municipal Corporation on account of outstanding Municipal
            Property Tax and accrued statutory penal interest for Assessment Year {notice.assessmentYear}.
          </p>

          {/* Dues breakdown table */}
          <table className="w-full text-left border border-slate-200 mt-2 font-mono">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
              <tr>
                <th className="p-2 border">Demand Head</th>
                <th className="p-2 border text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border font-sans">Unpaid Current Assessment Year Tax</td>
                <td className="p-2 border text-right">₹{notice.unpaidTax.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td className="p-2 border font-sans">Accrued Late Penalties</td>
                <td className="p-2 border text-right">₹{notice.accruedPenalty.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td className="p-2 border font-sans">Previous Financial Years Arrears Ledger</td>
                <td className="p-2 border text-right font-bold text-rose-600">
                  ₹{notice.arrears.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="bg-rose-50 font-black text-sm">
                <td className="p-2 border font-sans">TOTAL STATUTORY SUM DUE</td>
                <td className="p-2 border text-right text-rose-700">
                  ₹{notice.totalDue.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="p-4 bg-rose-50 border-l-4 border-rose-600 rounded-r-xl space-y-1 text-rose-900">
            <p className="font-bold">MANDATORY COMPLIANCE DIRECTIVE:</p>
            <p className="text-[11px]">
              You are hereby commanded to discharge the aforesaid sum of ₹{notice.totalDue.toLocaleString('en-IN')} within <strong>15 days</strong> from the receipt of this notice, failing which warrant of distress and attachment proceedings against the movable and immovable property shall be initiated under Section 134 of the Municipal Corporations Act without further intimation.
            </p>
          </div>
        </div>

        <div className="pt-10 flex items-center justify-between text-xs">
          <div className="text-[10px] text-slate-500 font-mono">
            Generated via Sampada Kar Municipal Portal
          </div>
          <div className="text-right space-y-1">
            <div className="w-40 h-10 border-b border-slate-400 flex items-center justify-center italic text-slate-800 font-serif font-bold text-xs">
              [ Seal of Revenue Officer ]
            </div>
            <p className="font-bold text-slate-900 text-xs">Ward Revenue Officer</p>
            <p className="text-[10px] text-slate-500">Municipal Corporation</p>
          </div>
        </div>
      </div>
    </div>
  );
};
