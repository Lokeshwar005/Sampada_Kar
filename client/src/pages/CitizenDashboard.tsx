import React, { useState, useEffect } from 'react';
import {
  Building2,
  CreditCard,
  History,
  FileText,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Send,
  Sparkles,
  MessageSquare,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Property, Payment, Grievance, TransferRequest, ReassessmentRequest } from '../types/index.js';
import { TaxBreakdownCard } from '../components/tax/TaxBreakdownCard.js';
import { PaymentModal } from '../components/payment/PaymentModal.js';
import { FeedbackModal } from '../components/feedback/FeedbackModal.js';
import { Badge } from '../components/common/Badge.js';
import { Link } from 'react-router-dom';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'PROPERTIES' | 'INSTALMENTS' | 'RECEIPTS' | 'GRIEVANCES' | 'TRANSFERS' | 'REASSESSMENT'
  >('PROPERTIES');

  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [reassessments, setReassessments] = useState<ReassessmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedPropertyForPay, setSelectedPropertyForPay] = useState<Property | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: 'PAYMENT' | 'GRIEVANCE';
    refId?: string;
  }>({ isOpen: false, type: 'PAYMENT' });

  // Grievance form state
  const [grievanceForm, setGrievanceForm] = useState({
    propertyId: '',
    wardNumber: 'W-01',
    category: 'BILLING_ISSUE',
    subject: '',
    description: '',
  });
  const [submittingGrievance, setSubmittingGrievance] = useState(false);

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    propertyId: '',
    newOwnerName: '',
    newOwnerMobile: '',
    newOwnerEmail: '',
    transferType: 'SALE',
    deedNumber: '',
    deedDate: new Date().toISOString().split('T')[0],
  });
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Reassessment form state
  const [reassessmentForm, setReassessmentForm] = useState({
    propertyId: '',
    proposedArea: 0,
    proposedType: 'RESIDENTIAL',
    reason: '',
  });
  const [reassessmentTaxPreview, setReassessmentTaxPreview] = useState<any>(null);
  const [submittingReassessment, setSubmittingReassessment] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [propRes, payRes, grvRes, trfRes, reaRes] = await Promise.all([
        api.get('/properties'),
        api.get('/payments'),
        api.get('/workflows/grievances'),
        api.get('/workflows/transfers'),
        api.get('/workflows/reassessments'),
      ]);

      if (propRes.data?.success) setProperties(propRes.data.properties || []);
      if (payRes.data?.success) setPayments(payRes.data.payments || []);
      if (grvRes.data?.success) setGrievances(grvRes.data.grievances || []);
      if (trfRes.data?.success) setTransfers(trfRes.data.transfers || []);
      if (reaRes.data?.success) setReassessments(reaRes.data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Live tax preview calculation for reassessment
  useEffect(() => {
    if (reassessmentForm.proposedArea > 0) {
      api
        .post('/properties/preview-tax', {
          builtUpAreaSqFt: reassessmentForm.proposedArea,
          propertyType: reassessmentForm.proposedType,
          isSeniorCitizen: user?.isSeniorCitizen,
        })
        .then((res) => {
          if (res.data?.success) setReassessmentTaxPreview(res.data.taxBreakdown);
        })
        .catch(() => {});
    }
  }, [reassessmentForm.proposedArea, reassessmentForm.proposedType]);

  const handleCreateInstalmentPlan = async (propertyId: string, parts: 2 | 4) => {
    try {
      const res = await api.post('/payments/create-instalment-plan', { propertyId, parts });
      if (res.data?.success) {
        alert(`${parts}-part instalment plan active. View under 'Quarterly Instalments' tab.`);
        loadAllData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create instalment plan.');
    }
  };

  const handlePayInstalment = async (instalmentId: string) => {
    try {
      const res = await api.post('/payments/pay-instalment', { instalmentId });
      if (res.data?.success) {
        alert(`Instalment paid successfully! Receipt: ${res.data.receiptNumber}`);
        loadAllData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to pay instalment.');
    }
  };

  const handleGrievanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingGrievance(true);
    try {
      const res = await api.post('/workflows/grievances', grievanceForm);
      if (res.data?.success) {
        alert(`Grievance ticket ${res.data.grievance.ticketNumber} registered successfully!`);
        setGrievanceForm({
          propertyId: '',
          wardNumber: 'W-01',
          category: 'BILLING_ISSUE',
          subject: '',
          description: '',
        });
        loadAllData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to submit grievance.');
    } finally {
      setSubmittingGrievance(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTransfer(true);
    try {
      const res = await api.post('/workflows/transfers', transferForm);
      if (res.data?.success) {
        alert(
          `Transfer Application ${res.data.transfer.applicationNumber} registered. Forwarded to Ward Officer.`
        );
        loadAllData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to submit transfer.');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleReassessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReassessment(true);
    try {
      const res = await api.post('/workflows/reassessments', reassessmentForm);
      if (res.data?.success) {
        alert(
          `Reassessment Application ${res.data.request.applicationNumber} registered. Forwarded to Ward Officer.`
        );
        loadAllData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to submit reassessment.');
    } finally {
      setSubmittingReassessment(false);
    }
  };

  const totalDues = properties.reduce((acc, p) => acc + (p.isPaid ? 0 : p.taxBreakdown?.totalPayable || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Profile Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Citizen Portal: {user?.fullName}
            </span>
            {user?.isSeniorCitizen && (
              <Badge variant="success" size="md">
                <Award className="w-3.5 h-3.5 text-purple-600" /> Senior Citizen (10% Rebate)
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registered Mobile: {user?.mobile} • Email: {user?.email}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Total Outstanding Dues
            </span>
            <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400">
              ₹{totalDues.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
        {[
          { key: 'PROPERTIES', label: `My Properties (${properties.length})` },
          { key: 'RECEIPTS', label: `Receipts Archive (${payments.length})` },
          { key: 'GRIEVANCES', label: `Grievances (${grievances.length})` },
          { key: 'TRANSFERS', label: `Ownership Transfer (${transfers.length})` },
          { key: 'REASSESSMENT', label: `Reassessment Requests (${reassessments.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 font-semibold text-xs whitespace-nowrap border-b-2 transition cursor-pointer ${
              activeTab === tab.key
                ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PROPERTIES */}
      {activeTab === 'PROPERTIES' && (
        <div className="space-y-6">
          {properties.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
              No properties linked to your citizen account yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900 dark:text-white">
                          {property.propertyId}
                        </span>
                        <Badge variant="primary" size="sm">
                          {property.wardNumber}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          {property.propertyType}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {property.address}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Built-up Area: {property.builtUpAreaSqFt} sq ft • Built in {property.constructionYear}
                      </p>
                    </div>

                    <div>
                      {property.isPaid ? (
                        <Badge variant="success" size="md">
                          PAID
                        </Badge>
                      ) : property.hasArrears ? (
                        <Badge variant="danger" size="md">
                          ARREARS DUE
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="md">
                          PENDING
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Line-by-Line Breakdown Card */}
                  {property.taxBreakdown && (
                    <TaxBreakdownCard breakdown={property.taxBreakdown} />
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                    {property.isPaid ? (
                      <div className="flex items-center gap-2">
                        {property.latestPayment && (
                          <Link
                            to={`/receipt/${property.latestPayment.receiptNumber}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold text-xs rounded-xl transition"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Receipt ({property.latestPayment.receiptNumber})
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setFeedbackModal({
                              isOpen: true,
                              type: 'PAYMENT',
                              refId: property.latestPayment?.receiptNumber,
                            })
                          }
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold rounded-xl transition"
                        >
                          Rate Service
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 w-full justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedPropertyForPay(property)}
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" /> Pay Full Amount (₹
                          {property.taxBreakdown?.totalPayable.toLocaleString('en-IN')})
                        </button>

                        {/* Instalment options */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-[11px] text-slate-400">Instalments:</span>
                          <button
                            type="button"
                            onClick={() => handleCreateInstalmentPlan(property.id, 2)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium"
                          >
                            2 Parts
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateInstalmentPlan(property.id, 4)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium"
                          >
                            4 Parts (Quarterly)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Instalments if any */}
                  {property.instalments && property.instalments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Instalment Payment Schedule:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {property.instalments.map((inst) => (
                          <div
                            key={inst.id}
                            className={`p-2 rounded-xl border text-center text-xs space-y-1 ${
                              inst.status === 'PAID'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                            }`}
                          >
                            <p className="font-semibold">
                              Part {inst.partNumber} / {inst.totalParts}
                            </p>
                            <p className="font-extrabold text-sm">₹{inst.amount}</p>
                            <p className="text-[10px] text-slate-400">
                              Due: {new Date(inst.dueDate).toLocaleDateString()}
                            </p>
                            {inst.status === 'PAID' ? (
                              <Badge variant="success" size="sm">
                                Paid
                              </Badge>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePayInstalment(inst.id)}
                                className="w-full mt-1 px-2 py-1 bg-blue-700 text-white rounded-lg text-[10px] font-bold"
                              >
                                Pay Part
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEIPTS ARCHIVE */}
      {activeTab === 'RECEIPTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Official Tax Payment Receipts Archive
            </h3>
          </div>

          {payments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No payment receipts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3">Receipt No.</th>
                    <th className="px-6 py-3">Property ID</th>
                    <th className="px-6 py-3">Paid Date</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Payment Mode</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-3.5 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {p.receiptNumber}
                      </td>
                      <td className="px-6 py-3.5 font-medium">{p.property?.propertyId}</td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {new Date(p.paidAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5 font-bold">
                        ₹{p.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-3.5">{p.paymentMode}</td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          to={`/receipt/${p.receiptNumber}`}
                          target="_blank"
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 font-semibold rounded-lg text-xs"
                        >
                          Print / PDF
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GRIEVANCES */}
      {activeTab === 'GRIEVANCES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submit New Grievance */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" /> Lodge a Citizen Grievance
            </h3>

            <form onSubmit={handleGrievanceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Ward Number</label>
                <select
                  value={grievanceForm.wardNumber}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, wardNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="W-01">Ward 01</option>
                  <option value="W-02">Ward 02</option>
                  <option value="W-03">Ward 03</option>
                  <option value="W-04">Ward 04</option>
                  <option value="W-05">Ward 05</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Property (Optional)</label>
                <select
                  value={grievanceForm.propertyId}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, propertyId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="">-- General / Non-Property Issue --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.propertyId} - {p.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Category</label>
                <select
                  value={grievanceForm.category}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="BILLING_ISSUE">Billing or Rebate Calculation Issue</option>
                  <option value="INCORRECT_MEASUREMENT">Incorrect Measurement (Area Mismatch)</option>
                  <option value="PAYMENT_FAILURE">Payment Failure or Receipt Missing</option>
                  <option value="NAME_CORRECTION">Owner Name / Mobile Correction</option>
                  <option value="OTHER">Other Civic Grievance</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={grievanceForm.subject}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, subject: e.target.value })}
                  placeholder="Summary of issue"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  value={grievanceForm.description}
                  onChange={(e) => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                  placeholder="Elaborate your request with any relevant registration numbers..."
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingGrievance}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submittingGrievance ? 'Submitting...' : 'Register Grievance'}
              </button>
            </form>
          </div>

          {/* List of Grievance Tickets */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              My Grievance Redressal Tickets
            </h3>

            {grievances.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No grievances raised yet.</div>
            ) : (
              <div className="space-y-3">
                {grievances.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">
                          {g.ticketNumber}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {g.category.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Badge
                        variant={
                          g.status === 'RESOLVED'
                            ? 'success'
                            : g.status === 'IN_PROGRESS'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {g.status}
                      </Badge>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {g.subject}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {g.description}
                    </p>

                    {g.officerRemarks && (
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] text-emerald-800 dark:text-emerald-300">
                        <span className="font-bold block">Officer Remarks:</span>
                        {g.officerRemarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: OWNERSHIP TRANSFERS */}
      {activeTab === 'TRANSFERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Apply for Mutation / Transfer
            </h3>
            <p className="text-[11px] text-slate-500">
              Upon approval by the Ward Officer, historic ownership is closed and ownership transferred to the new owner.
            </p>

            <form onSubmit={handleTransferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Select Property</label>
                <select
                  required
                  value={transferForm.propertyId}
                  onChange={(e) => setTransferForm({ ...transferForm, propertyId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="">-- Choose property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.propertyId} ({p.address})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">New Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={transferForm.newOwnerName}
                  onChange={(e) => setTransferForm({ ...transferForm, newOwnerName: e.target.value })}
                  placeholder="e.g. Deepak Chawla"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">New Owner 10-Digit Mobile</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={transferForm.newOwnerMobile}
                  onChange={(e) =>
                    setTransferForm({
                      ...transferForm,
                      newOwnerMobile: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  placeholder="e.g. 9822334455"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Transfer Type</label>
                <select
                  value={transferForm.transferType}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, transferType: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="SALE">Sale Deed</option>
                  <option value="GIFT">Gift Deed</option>
                  <option value="INHERITANCE">Inheritance / Succession</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Registered Deed Number</label>
                <input
                  type="text"
                  required
                  value={transferForm.deedNumber}
                  onChange={(e) => setTransferForm({ ...transferForm, deedNumber: e.target.value })}
                  placeholder="e.g. DEED-2026-987"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <button
                type="submit"
                disabled={submittingTransfer}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submittingTransfer ? 'Submitting Application...' : 'Submit Transfer Application'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Transfer & Mutation Applications History
            </h3>
            {transfers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No transfer requests filed.</div>
            ) : (
              <div className="space-y-3">
                {transfers.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                        {t.applicationNumber}
                      </span>
                      <Badge
                        variant={
                          t.status === 'APPROVED'
                            ? 'success'
                            : t.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      Property: {t.property?.propertyId} • New Owner: {t.newOwnerName} ({t.newOwnerMobile})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Type: {t.transferType} • Deed: {t.deedNumber}
                    </p>
                    {t.rejectionReason && (
                      <p className="text-rose-600 dark:text-rose-400 font-semibold">
                        Rejection Reason: {t.rejectionReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: REASSESSMENT */}
      {activeTab === 'REASSESSMENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Request Area / Type Reassessment
            </h3>

            <form onSubmit={handleReassessmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Select Property</label>
                <select
                  required
                  value={reassessmentForm.propertyId}
                  onChange={(e) =>
                    setReassessmentForm({ ...reassessmentForm, propertyId: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="">-- Choose property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.propertyId} (Current: {p.builtUpAreaSqFt} sq ft)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Proposed Built-Up Area (sq ft)</label>
                <input
                  type="number"
                  required
                  min={50}
                  value={reassessmentForm.proposedArea || ''}
                  onChange={(e) =>
                    setReassessmentForm({
                      ...reassessmentForm,
                      proposedArea: Number(e.target.value),
                    })
                  }
                  placeholder="e.g. 1850"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Proposed Property Type</label>
                <select
                  value={reassessmentForm.proposedType}
                  onChange={(e) =>
                    setReassessmentForm({ ...reassessmentForm, proposedType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="RESIDENTIAL">Residential (₹8/sq ft)</option>
                  <option value="COMMERCIAL">Commercial (₹15/sq ft)</option>
                  <option value="INDUSTRIAL">Industrial (₹18/sq ft)</option>
                  <option value="INSTITUTIONAL">Institutional (₹10/sq ft)</option>
                  <option value="AGRICULTURAL">Agricultural (₹3/sq ft)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Reason for Reassessment</label>
                <textarea
                  required
                  rows={3}
                  value={reassessmentForm.reason}
                  onChange={(e) =>
                    setReassessmentForm({ ...reassessmentForm, reason: e.target.value })
                  }
                  placeholder="e.g. Added second floor extension with municipal permit..."
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                ></textarea>
              </div>

              {/* Dynamic Live Tax Preview */}
              {reassessmentTaxPreview && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1">
                  <span className="font-bold text-[11px] text-blue-900 dark:text-blue-300 block">
                    Estimated Revised Tax Preview:
                  </span>
                  <div className="flex justify-between font-mono">
                    <span>Base Tax:</span>
                    <span>₹{reassessmentTaxPreview.baseTax}</span>
                  </div>
                  <div className="flex justify-between font-mono font-bold text-blue-700 dark:text-blue-400">
                    <span>Total Revised Payable:</span>
                    <span>₹{reassessmentTaxPreview.totalPayable}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingReassessment}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submittingReassessment ? 'Submitting...' : 'Submit Reassessment'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Submitted Reassessment Applications
            </h3>
            {reassessments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No reassessments filed.</div>
            ) : (
              <div className="space-y-3">
                {reassessments.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                        {r.applicationNumber}
                      </span>
                      <Badge
                        variant={
                          r.status === 'APPROVED'
                            ? 'success'
                            : r.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      Property: {r.property?.propertyId} • Area: {r.existingArea} sq ft → {r.proposedArea} sq ft
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Existing Tax: ₹{r.existingEstimatedTax}</span>
                      <span>Proposed Tax: ₹{r.proposedEstimatedTax}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Reason: {r.reason}
                    </p>
                    {r.rejectionReason && (
                      <p className="text-rose-600 dark:text-rose-400 font-semibold">
                        Rejection Reason: {r.rejectionReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedPropertyForPay && (
        <PaymentModal
          property={selectedPropertyForPay}
          isOpen={!!selectedPropertyForPay}
          onClose={() => setSelectedPropertyForPay(null)}
          onPaymentSuccess={() => {
            loadAllData();
          }}
        />
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
        referenceType={feedbackModal.type}
        referenceId={feedbackModal.refId}
      />
    </div>
  );
};
