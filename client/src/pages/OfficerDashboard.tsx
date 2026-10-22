import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Users,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Property,
  Grievance,
  TransferRequest,
  ReassessmentRequest,
  DemandNotice,
} from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import { Link } from 'react-router-dom';

export const OfficerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'PROPERTIES' | 'DEFAULTERS' | 'TRANSFERS' | 'REASSESSMENTS' | 'GRIEVANCES' | 'NOTICES'
  >('PROPERTIES');

  const [properties, setProperties] = useState<Property[]>([]);
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [reassessments, setReassessments] = useState<ReassessmentRequest[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [notices, setNotices] = useState<DemandNotice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [wardFilter, setWardFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection modal state
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    type: 'TRANSFER' | 'REASSESSMENT';
    id: string;
    action: 'APPROVE' | 'REJECT';
    reason: string;
  }>({ isOpen: false, type: 'TRANSFER', id: '', action: 'APPROVE', reason: '' });

  // Grievance reply state
  const [replyModal, setReplyModal] = useState<{
    isOpen: boolean;
    id: string;
    ticketNumber: string;
    status: string;
    remarks: string;
  }>({ isOpen: false, id: '', ticketNumber: '', status: 'IN_PROGRESS', remarks: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [propRes, defRes, trfRes, reaRes, grvRes, notRes] = await Promise.all([
        api.get('/properties', { params: { ward: wardFilter, type: typeFilter, search: searchQuery } }),
        api.get('/defaulters'),
        api.get('/workflows/transfers'),
        api.get('/workflows/reassessments'),
        api.get('/workflows/grievances'),
        api.get('/defaulters/notices'),
      ]);

      if (propRes.data?.success) setProperties(propRes.data.properties || []);
      if (defRes.data?.success) setDefaulters(defRes.data.defaulters || []);
      if (trfRes.data?.success) setTransfers(trfRes.data.transfers || []);
      if (reaRes.data?.success) setReassessments(reaRes.data.requests || []);
      if (grvRes.data?.success) setGrievances(grvRes.data.grievances || []);
      if (notRes.data?.success) setNotices(notRes.data.notices || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [wardFilter, typeFilter]);

  const handleIssueNotice = async (propertyId: string) => {
    if (!confirm('Issue statutory demand notice with 15-day compliance deadline to this property?'))
      return;
    try {
      const res = await api.post('/defaulters/issue-notice', { propertyId });
      if (res.data?.success) {
        alert(
          `Demand Notice ${res.data.demandNotice.noticeNumber} generated with 15-day deadline!`
        );
        loadData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to issue notice.');
    }
  };

  const handleReviewAction = async () => {
    const { type, id, action, reason } = reviewModal;
    if (action === 'REJECT' && reason.trim().length < 5) {
      alert('Please provide a mandatory justification/reason for rejection.');
      return;
    }

    try {
      const endpoint =
        type === 'TRANSFER'
          ? `/workflows/transfers/${id}/review`
          : `/workflows/reassessments/${id}/review`;

      const res = await api.patch(endpoint, { action, rejectionReason: reason });
      if (res.data?.success) {
        alert(res.data.message);
        setReviewModal({ ...reviewModal, isOpen: false, reason: '' });
        loadData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Review action failed.');
    }
  };

  const handleReplyGrievance = async () => {
    try {
      const res = await api.patch(`/workflows/grievances/${replyModal.id}/reply`, {
        status: replyModal.status,
        remarks: replyModal.remarks,
      });
      if (res.data?.success) {
        alert('Grievance status updated and citizen notified.');
        setReplyModal({ ...replyModal, isOpen: false, remarks: '' });
        loadData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to reply to grievance.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Officer Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Ward Officer Desk: {user?.fullName}
            </span>
            <Badge variant="primary" size="md">
              Ward Officer
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Assigned Jurisdictions:</span>
            {user?.assignedWards.map((w) => (
              <Badge key={w} variant="info" size="sm">
                Ward {w}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Pending Approvals
            </span>
            <span className="text-xl font-extrabold text-amber-600">
              {transfers.filter((t) => t.status === 'PENDING').length +
                reassessments.filter((r) => r.status === 'PENDING').length}
            </span>
          </div>
          <div className="border-l border-slate-300 dark:border-slate-700 pl-4">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Active Defaulters
            </span>
            <span className="text-xl font-extrabold text-rose-600">
              {defaulters.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
        {[
          { key: 'PROPERTIES', label: `Ward Register (${properties.length})` },
          { key: 'DEFAULTERS', label: `Defaulters & Arrears (${defaulters.length})` },
          { key: 'TRANSFERS', label: `Transfers (${transfers.length})` },
          { key: 'REASSESSMENTS', label: `Reassessments (${reassessments.length})` },
          { key: 'GRIEVANCES', label: `Grievances (${grievances.length})` },
          { key: 'NOTICES', label: `Demand Notices (${notices.length})` },
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

      {/* TAB 1: WARD PROPERTY REGISTER */}
      {activeTab === 'PROPERTIES' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                placeholder="Search Property ID, Owner name or mobile..."
                className="w-full px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-500">Property Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              >
                <option value="ALL">All Categories</option>
                <option value="RESIDENTIAL">Residential</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="INDUSTRIAL">Industrial</option>
                <option value="INSTITUTIONAL">Institutional</option>
                <option value="AGRICULTURAL">Agricultural</option>
              </select>
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Property ID</th>
                    <th className="px-5 py-3">Ward</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Area (Sq Ft)</th>
                    <th className="px-5 py-3">Calculated Tax</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {properties.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold font-mono text-blue-700 dark:text-blue-400">
                        {p.propertyId}
                      </td>
                      <td className="px-5 py-3.5">{p.wardNumber}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold">{p.owner?.fullName}</p>
                        <p className="text-[10px] text-slate-400">{p.owner?.mobile}</p>
                      </td>
                      <td className="px-5 py-3.5">{p.propertyType}</td>
                      <td className="px-5 py-3.5">{p.builtUpAreaSqFt} sq ft</td>
                      <td className="px-5 py-3.5 font-bold">
                        ₹{p.taxBreakdown?.totalPayable.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5">
                        {p.isPaid ? (
                          <Badge variant="success" size="sm">
                            PAID
                          </Badge>
                        ) : p.hasArrears ? (
                          <Badge variant="danger" size="sm">
                            ARREARS
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            PENDING
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEFAULTERS & DEMAND NOTICES */}
      {activeTab === 'DEFAULTERS' && (
        <div className="space-y-4">
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
            <div>
              <p className="font-bold text-sm">Defaulter Recovery Desk (Assigned Wards)</p>
              <p className="text-[11px] mt-0.5">
                Issue statutory demand notices under Section 132 with strict 15-day compliance deadlines.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Property ID</th>
                    <th className="px-5 py-3">Owner Contact</th>
                    <th className="px-5 py-3">Ward</th>
                    <th className="px-5 py-3">Arrears Period</th>
                    <th className="px-5 py-3">Arrears Amount</th>
                    <th className="px-5 py-3">Total Due (incl Penalty)</th>
                    <th className="px-5 py-3 text-right">Statutory Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {defaulters.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-mono font-bold text-blue-700 dark:text-blue-400">
                        {d.propertyId}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold">{d.owner?.fullName}</p>
                        <p className="text-[10px] text-slate-400">{d.owner?.mobile}</p>
                      </td>
                      <td className="px-5 py-3.5">{d.wardNumber}</td>
                      <td className="px-5 py-3.5 font-medium">{d.arrearsYears || 'Previous FY'}</td>
                      <td className="px-5 py-3.5 font-bold text-rose-600">
                        ₹{d.arrearsAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-slate-900 dark:text-white">
                        ₹{d.taxBreakdown?.totalPayable.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleIssueNotice(d.id)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs shadow-sm transition"
                        >
                          Issue Demand Notice (15-Day)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFERS REVIEW */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Ownership Transfer / Mutation Verification
          </h3>
          <p className="text-[11px] text-slate-500">
            Verify registered sale/gift deed numbers. On approval, the previous owner's history row is closed and the new owner row is initiated.
          </p>

          <div className="space-y-4">
            {transfers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No transfer applications in your assigned wards.</p>
            ) : (
              transfers.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">
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
                      size="md"
                    >
                      {t.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Current Owner</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.currentOwner?.fullName} ({t.currentOwner?.mobile})
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">New Owner</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.newOwnerName} ({t.newOwnerMobile})
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Deed Info</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.transferType} • {t.deedNumber}
                      </p>
                    </div>
                  </div>

                  {t.rejectionReason && (
                    <p className="text-rose-600 dark:text-rose-400 font-semibold">
                      Reason: {t.rejectionReason}
                    </p>
                  )}

                  {t.status === 'PENDING' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          setReviewModal({
                            isOpen: true,
                            type: 'TRANSFER',
                            id: t.id,
                            action: 'APPROVE',
                            reason: '',
                          })
                        }
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                      >
                        Approve Transfer
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReviewModal({
                            isOpen: true,
                            type: 'TRANSFER',
                            id: t.id,
                            action: 'REJECT',
                            reason: '',
                          })
                        }
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs"
                      >
                        Reject (Requires Reason)
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REASSESSMENTS REVIEW */}
      {activeTab === 'REASSESSMENTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Area & Usage Reassessment Applications
          </h3>

          <div className="space-y-4">
            {reassessments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No reassessment applications in your assigned wards.</p>
            ) : (
              reassessments.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">
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
                      size="md"
                    >
                      {r.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Property</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {r.property?.propertyId} (Citizen: {r.citizen?.fullName})
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Area Change</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {r.existingArea} sq ft → {r.proposedArea} sq ft ({r.proposedType})
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Tax Impact</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        ₹{r.existingEstimatedTax} → ₹{r.proposedEstimatedTax}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    <span className="font-bold">Citizen Stated Reason:</span> {r.reason}
                  </p>

                  {r.rejectionReason && (
                    <p className="text-rose-600 dark:text-rose-400 font-semibold">
                      Reason: {r.rejectionReason}
                    </p>
                  )}

                  {r.status === 'PENDING' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          setReviewModal({
                            isOpen: true,
                            type: 'REASSESSMENT',
                            id: r.id,
                            action: 'APPROVE',
                            reason: '',
                          })
                        }
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                      >
                        Approve Reassessment
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setReviewModal({
                            isOpen: true,
                            type: 'REASSESSMENT',
                            id: r.id,
                            action: 'REJECT',
                            reason: '',
                          })
                        }
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs"
                      >
                        Reject (Requires Reason)
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: GRIEVANCES REDRESSAL */}
      {activeTab === 'GRIEVANCES' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Ward Grievances Redressal & Citizen Replies
          </h3>

          <div className="space-y-4">
            {grievances.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No grievances logged in your assigned wards.</p>
            ) : (
              grievances.map((g) => (
                <div
                  key={g.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">
                      {g.ticketNumber} • Ward {g.wardNumber}
                    </span>
                    <Badge
                      variant={
                        g.status === 'RESOLVED'
                          ? 'success'
                          : g.status === 'IN_PROGRESS'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {g.status}
                    </Badge>
                  </div>

                  <p className="font-bold text-slate-800 dark:text-slate-100">{g.subject}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {g.description}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Complainant: {g.citizen?.fullName} ({g.citizen?.mobile})
                  </p>

                  {g.officerRemarks && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] text-blue-900 dark:text-blue-300">
                      <span className="font-bold block">Previous Officer Remarks:</span>
                      {g.officerRemarks}
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setReplyModal({
                          isOpen: true,
                          id: g.id,
                          ticketNumber: g.ticketNumber,
                          status: g.status,
                          remarks: g.officerRemarks || '',
                        })
                      }
                      className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs"
                    >
                      Update Status & Reply to Citizen
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: DEMAND NOTICES */}
      {activeTab === 'NOTICES' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Statutory Demand Notices Issued
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Notice No.</th>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Issue Date</th>
                  <th className="px-5 py-3">15-Day Deadline</th>
                  <th className="px-5 py-3">Total Due</th>
                  <th className="px-5 py-3 text-right">Print Notice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {notices.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-700 dark:text-blue-400">
                      {n.noticeNumber}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{n.property?.propertyId}</td>
                    <td className="px-5 py-3.5">{n.recipient?.fullName}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(n.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-rose-600">
                      {new Date(n.deadlineDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-extrabold">
                      ₹{n.totalDue.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/notice/${n.noticeNumber}`}
                        target="_blank"
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 font-semibold rounded-lg text-xs"
                      >
                        Print Notice
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Rejection Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {reviewModal.action === 'APPROVE' ? 'Approve Application' : 'Reject Application'}
            </h3>
            <p className="text-xs text-slate-500">
              {reviewModal.action === 'APPROVE'
                ? 'Confirming approval will immediately execute ownership and registry updates.'
                : 'A formal reason is required. This will be transmitted to the citizen and recorded in the audit log.'}
            </p>

            {reviewModal.action === 'REJECT' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Mandatory Rejection Justification
                </label>
                <textarea
                  rows={3}
                  value={reviewModal.reason}
                  onChange={(e) => setReviewModal({ ...reviewModal, reason: e.target.value })}
                  placeholder="e.g. Deed registration stamp seal illegible; physical verification mismatched..."
                  className="w-full text-xs p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                ></textarea>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModal({ ...reviewModal, isOpen: false })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewAction}
                className={`px-4 py-2 text-white font-semibold rounded-xl text-xs ${
                  reviewModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grievance Reply Modal */}
      {replyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Update Ticket {replyModal.ticketNumber}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Set Status</label>
                <select
                  value={replyModal.status}
                  onChange={(e) => setReplyModal({ ...replyModal, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="OPEN">Open (Pending Inspection)</option>
                  <option value="IN_PROGRESS">In Progress (Field Work / Hearing Scheduled)</option>
                  <option value="RESOLVED">Resolved (Action Completed)</option>
                  <option value="REJECTED">Rejected (Ineligible)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Officer Remarks to Citizen</label>
                <textarea
                  rows={3}
                  value={replyModal.remarks}
                  onChange={(e) => setReplyModal({ ...replyModal, remarks: e.target.value })}
                  placeholder="Detail findings, scheduled visit time, or reason for resolution..."
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplyModal({ ...replyModal, isOpen: false })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReplyGrievance}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl text-xs"
              >
                Send Official Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
