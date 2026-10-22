import React, { useState, useEffect } from 'react';
import {
  Shield,
  TrendingUp,
  Building,
  Users,
  Settings,
  History,
  FileSpreadsheet,
  Download,
  AlertOctagon,
  Percent,
  CheckCircle2,
  Lock,
  Unlock,
  PlusCircle,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { TaxSetting, User, AuditLogItem } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'KPIS' | 'TAX_SETTINGS' | 'ARCHIVE' | 'OFFICERS' | 'USERS' | 'AUDIT_LOG'
  >('KPIS');

  const [kpis, setKpis] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [activeTaxSetting, setActiveTaxSetting] = useState<TaxSetting | null>(null);
  const [taxArchive, setTaxArchive] = useState<TaxSetting[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [wardCoverage, setWardCoverage] = useState<any>({});
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Officer form
  const [newOfficerForm, setNewOfficerForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: 'OfficerPassword@123',
    assignedWards: ['W-01'],
  });

  // Rates edit state
  const [rateForm, setRateForm] = useState<any>(null);
  const [savingRates, setSavingRates] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [repRes, rateRes, archRes, offRes, usrRes, audRes] = await Promise.all([
        api.get('/reports/dashboard'),
        api.get('/tax-settings/current'),
        api.get('/tax-settings/archive'),
        api.get('/officers'),
        api.get('/users'),
        api.get('/audit-logs'),
      ]);

      if (repRes.data?.success) {
        setKpis(repRes.data.kpis);
        setCharts(repRes.data.charts);
      }
      if (rateRes.data?.success) {
        setActiveTaxSetting(rateRes.data.taxSetting);
        setRateForm(rateRes.data.taxSetting);
      }
      if (archRes.data?.success) setTaxArchive(archRes.data.archive || []);
      if (offRes.data?.success) {
        setOfficers(offRes.data.officers || []);
        setWardCoverage(offRes.data.wardCoverage || {});
      }
      if (usrRes.data?.success) setUsersList(usrRes.data.users || []);
      if (audRes.data?.success) setAuditLogs(audRes.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRates(true);
    try {
      const res = await api.put('/tax-settings/current', rateForm);
      if (res.data?.success) {
        alert('Tax parameters updated! All properties dynamically reassessed.');
        loadAdminData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update rates.');
    } finally {
      setSavingRates(false);
    }
  };

  const handleToggleUserBlock = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await api.patch(`/users/${userId}/status`, { isBlocked: !currentStatus });
      if (res.data?.success) {
        alert(res.data.message);
        loadAdminData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/officers', newOfficerForm);
      if (res.data?.success) {
        alert('Ward Officer successfully created and wards allocated!');
        setNewOfficerForm({
          fullName: '',
          email: '',
          mobile: '',
          password: 'OfficerPassword@123',
          assignedWards: ['W-01'],
        });
        loadAdminData();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create officer.');
    }
  };

  const handleExportCSV = () => {
    window.open('/api/reports/export-csv', '_blank');
  };

  const handleExportAuditCSV = () => {
    window.open('/api/audit-logs/export-csv', '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Municipal Corporation Admin Control Center
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Commissioner & Chief Revenue Officer Console • Single Source of Truth
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Property Tax Ledger (CSV)
          </button>
          <button
            onClick={handleExportAuditCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Audit CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
        {[
          { key: 'KPIS', label: '8 Municipal KPI Metrics & Charts' },
          { key: 'TAX_SETTINGS', label: 'Tax Rates & Age Bands (Single Source)' },
          { key: 'ARCHIVE', label: `Year-Wise Archive (${taxArchive.length} FYs)` },
          { key: 'OFFICERS', label: `Ward Officers (${officers.length}) & Coverage` },
          { key: 'USERS', label: `User Management (${usersList.length})` },
          { key: 'AUDIT_LOG', label: `Audit Log (${auditLogs.length})` },
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

      {/* TAB 1: 8 KPIS & CHARTS */}
      {activeTab === 'KPIS' && kpis && (
        <div className="space-y-8">
          {/* 8 KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                1. Total Properties Registered
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {kpis.totalProperties}
              </h3>
              <p className="text-[10px] text-slate-500">Across Wards W-01 to W-05</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                2. Total Tax Assessed
              </span>
              <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400">
                ₹{kpis.totalAssessed.toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-slate-500">FY 2026-2027 Gross Demand</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                3. Total Revenue Realized
              </span>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{kpis.totalCollected.toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-emerald-600 font-semibold">Credited to Municipal Bank</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                4. Total Outstanding / Pending
              </span>
              <h3 className="text-2xl font-black text-amber-600">
                ₹{kpis.totalPending.toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-slate-500">Subject to statutory notice</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                5. Total Defaulters
              </span>
              <h3 className="text-2xl font-black text-rose-600">
                {kpis.totalDefaulters} Properties
              </h3>
              <p className="text-[10px] text-slate-500">Previous FY unpaid</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                6. Total Arrears Balance
              </span>
              <h3 className="text-2xl font-black text-rose-700 dark:text-rose-400">
                ₹{kpis.totalArrears.toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-rose-600 font-medium">18% p.a. interest accruing</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                7. Collection Efficiency
              </span>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {kpis.collectionEfficiency}%
              </h3>
              <p className="text-[10px] text-slate-500">Collected vs Total Assessed</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                8. Grievance Resolution
              </span>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {kpis.grievanceResolutionRate}%
              </h3>
              <p className="text-[10px] text-slate-500">Resolved vs Total Filed</p>
            </div>
          </div>

          {/* Visual Charts & Split Bars */}
          {charts && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ward Collection Breakdown */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Collection & Demand by Ward
                </h3>
                <div className="space-y-3">
                  {charts.wardCollectionChart.map((wc: any) => {
                    const pct = wc.assessed > 0 ? Math.min(100, Math.round((wc.collected / wc.assessed) * 100)) : 0;
                    return (
                      <div key={wc.ward} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span>Ward {wc.ward} ({wc.properties} props)</span>
                          <span className="font-mono">
                            ₹{wc.collected.toLocaleString('en-IN')} / ₹{wc.assessed.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{pct}% collected</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Property Type Distribution */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" /> Revenue Split by Property Type
                </h3>
                <div className="space-y-3">
                  {charts.propertyTypeChart.map((pt: any) => (
                    <div
                      key={pt.type}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{pt.type}</p>
                        <p className="text-[10px] text-slate-400">{pt.count} properties registered</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-blue-700 dark:text-blue-400">
                          ₹{pt.assessed.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-emerald-600">
                          Paid: ₹{pt.collected.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paid vs Pending Count */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-purple-600" /> Real-time Paid vs Pending Distribution
                </h3>
                <div className="space-y-4 pt-2">
                  {charts.paymentStatusChart.map((st: any) => (
                    <div
                      key={st.name}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1 text-xs"
                    >
                      <div className="flex justify-between font-bold">
                        <span className={st.name === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}>
                          {st.name} Properties
                        </span>
                        <span>{st.count}</span>
                      </div>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                        ₹{st.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TAX SETTINGS (RATES & SINGLE SOURCE OF TRUTH) */}
      {activeTab === 'TAX_SETTINGS' && rateForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Tax Engine Settings (FY {rateForm.financialYear})
              </h3>
              <p className="text-xs text-slate-500">
                Single source of truth. As tax is dynamically computed, modifying rates immediately reassesses all properties.
              </p>
            </div>
            <Badge variant="warning" size="md">
              Dynamic Reassessment Engine
            </Badge>
          </div>

          <form onSubmit={handleUpdateRates} className="space-y-6 text-xs">
            {/* Base Rates Per Sq Ft */}
            <div className="space-y-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                1. Base Rate per Sq Ft by Category (INR)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Residential</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rateForm.residentialRate}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, residentialRate: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Commercial</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rateForm.commercialRate}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, commercialRate: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Industrial</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rateForm.industrialRate}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, industrialRate: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Institutional</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rateForm.institutionalRate}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, institutionalRate: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Agricultural</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rateForm.agriculturalRate}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, agriculturalRate: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Age Band Discounts */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                2. Age Band Depreciation Discounts (%)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">0 to 5 Years</label>
                  <input
                    type="number"
                    value={rateForm.ageBand0to5}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, ageBand0to5: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">6 to 15 Years</label>
                  <input
                    type="number"
                    value={rateForm.ageBand6to15}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, ageBand6to15: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">16 to 30 Years</label>
                  <input
                    type="number"
                    value={rateForm.ageBand16to30}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, ageBand16to30: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Above 30 Years</label>
                  <input
                    type="number"
                    value={rateForm.ageBandAbove30}
                    onChange={(e) =>
                      setRateForm({ ...rateForm, ageBandAbove30: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Rebates, Penalties and Dates */}
            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                3. Statutory Rebates, Penalties & Deadlines
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Early Bird Rebate (%)</label>
                  <input
                    type="number"
                    value={rateForm.earlyBirdRebatePercent}
                    onChange={(e) =>
                      setRateForm({
                        ...rateForm,
                        earlyBirdRebatePercent: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Senior Citizen Rebate (%)</label>
                  <input
                    type="number"
                    value={rateForm.seniorCitizenRebatePercent}
                    onChange={(e) =>
                      setRateForm({
                        ...rateForm,
                        seniorCitizenRebatePercent: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Monthly Late Penalty (%)</label>
                  <input
                    type="number"
                    value={rateForm.latePaymentPenaltyMonthlyPercent}
                    onChange={(e) =>
                      setRateForm({
                        ...rateForm,
                        latePaymentPenaltyMonthlyPercent: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingRates}
                className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {savingRates ? 'Reassessing Municipal Database...' : 'Save & Reassess All Properties'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: YEAR-WISE ARCHIVE (2022 to current) */}
      {activeTab === 'ARCHIVE' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Year-Wise Municipal Tax Schedule Archive (2022 – Present)
            </h3>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Print Schedule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Financial Year</th>
                  <th className="px-5 py-3">Residential Rate</th>
                  <th className="px-5 py-3">Commercial Rate</th>
                  <th className="px-5 py-3">Industrial Rate</th>
                  <th className="px-5 py-3">Early Bird Rebate</th>
                  <th className="px-5 py-3">Senior Rebate</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {taxArchive.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold font-mono text-blue-700 dark:text-blue-400">
                      {a.financialYear}
                    </td>
                    <td className="px-5 py-3.5 font-semibold">₹{a.residentialRate}/sq ft</td>
                    <td className="px-5 py-3.5 font-semibold">₹{a.commercialRate}/sq ft</td>
                    <td className="px-5 py-3.5 font-semibold">₹{a.industrialRate}/sq ft</td>
                    <td className="px-5 py-3.5 text-emerald-600 font-semibold">{a.earlyBirdRebatePercent}%</td>
                    <td className="px-5 py-3.5 text-purple-600 font-semibold">{a.seniorCitizenRebatePercent}%</td>
                    <td className="px-5 py-3.5">
                      {a.isActive ? (
                        <Badge variant="success" size="sm">
                          CURRENT ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          ARCHIVED
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: OFFICERS & WARD COVERAGE */}
      {activeTab === 'OFFICERS' && (
        <div className="space-y-6">
          {/* Ward Coverage Map / Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Ward Coverage & Administrative Allocation Analysis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {['W-01', 'W-02', 'W-03', 'W-04', 'W-05'].map((w) => {
                const cov = wardCoverage[w] || { assignedOfficers: [], propertyCount: 0 };
                const isCovered = cov.assignedOfficers.length > 0;
                return (
                  <div
                    key={w}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      isCovered
                        ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
                        : 'bg-rose-50/50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-blue-900 dark:text-blue-300">{w}</span>
                      <Badge variant={isCovered ? 'primary' : 'danger'} size="sm">
                        {isCovered ? 'Covered' : 'Unallocated'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {cov.propertyCount} properties registered
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                      Officers: {cov.assignedOfficers.join(', ') || 'None assigned'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Officers Table & Add Officer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Create Ward Officer
              </h3>

              <form onSubmit={handleCreateOfficer} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newOfficerForm.fullName}
                    onChange={(e) =>
                      setNewOfficerForm({ ...newOfficerForm, fullName: e.target.value })
                    }
                    placeholder="e.g. Officer Mahesh Patil"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={newOfficerForm.email}
                    onChange={(e) =>
                      setNewOfficerForm({ ...newOfficerForm, email: e.target.value })
                    }
                    placeholder="e.g. mahesh.patil@sampadakar.gov.in"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newOfficerForm.mobile}
                    onChange={(e) =>
                      setNewOfficerForm({
                        ...newOfficerForm,
                        mobile: e.target.value.replace(/\D/g, ''),
                      })
                    }
                    placeholder="9876543219"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Assign Wards (Comma separated)</label>
                  <input
                    type="text"
                    required
                    value={newOfficerForm.assignedWards.join(', ')}
                    onChange={(e) =>
                      setNewOfficerForm({
                        ...newOfficerForm,
                        assignedWards: e.target.value
                          .split(',')
                          .map((w) => w.trim().toUpperCase())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g. W-03, W-05"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm transition"
                >
                  Create & Allocate Wards
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Active Ward Revenue Officers
              </h3>
              <div className="space-y-3">
                {officers.map((off) => (
                  <div
                    key={off.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{off.fullName}</p>
                      <p className="text-[11px] text-slate-500">{off.email} • {off.mobile}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {off.wardAssignments.map((wa: any) => (
                        <Badge key={wa.id} variant="info" size="sm">
                          {wa.wardNumber}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: USER MANAGEMENT (BLOCK / UNBLOCK, NEVER DELETE) */}
      {activeTab === 'USERS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Municipal User Management (Statutory Soft-Control)
              </h3>
              <p className="text-[11px] text-slate-500">
                Per municipal legal policy, accounts are never deleted; suspended accounts are soft-blocked to maintain complete auditability.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">User Name</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Senior Status</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">
                      {u.fullName}
                    </td>
                    <td className="px-5 py-3.5">
                      <p>{u.email}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{u.mobile}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold">{u.role}</td>
                    <td className="px-5 py-3.5">
                      {u.isSeniorCitizen ? (
                        <Badge variant="success" size="sm">
                          Senior Citizen
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.isBlocked ? (
                        <Badge variant="danger" size="sm">
                          SUSPENDED
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          ACTIVE
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleToggleUserBlock(u.id, u.isBlocked)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${
                            u.isBlocked
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {u.isBlocked ? 'Restore Account' : 'Suspend Account'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOG (FILTERABLE WITH CSV EXPORT) */}
      {activeTab === 'AUDIT_LOG' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              System State-Change Audit Trail
            </h3>
            <button
              onClick={handleExportAuditCSV}
              className="px-3 py-1.5 bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs"
            >
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User & Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{log.userName}</p>
                      <Badge variant="neutral" size="sm">
                        {log.userRole}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">{log.entityType}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                      {log.details}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[10px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
