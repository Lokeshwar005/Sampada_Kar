import React, { useState, useEffect } from 'react';
import {
  Search,
  Building,
  ShieldCheck,
  TrendingUp,
  Receipt,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../services/api.js';
import { TaxBreakdownCard } from '../components/tax/TaxBreakdownCard.js';
import { Badge } from '../components/common/Badge.js';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const [propertyIdInput, setPropertyIdInput] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<any>({
    totalRegisteredProperties: 20,
    totalTaxCollected: 16320,
    totalTransactions: 2,
    registeredCitizens: 4,
    currentFinancialYear: '2026-2027',
    earlyBirdRebatePercent: 5,
    dueDate: '2026-12-31',
  });

  useEffect(() => {
    // Fetch live public stats
    api.get('/properties/public/stats').then((res) => {
      if (res.data?.success) {
        setStats(res.data.stats);
      }
    }).catch(() => {});
  }, []);

  const handleLookup = async (idToSearch?: string) => {
    const id = (idToSearch || propertyIdInput).trim();
    if (!id) return;

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const res = await api.get(`/properties/public/lookup/${encodeURIComponent(id)}`);
      if (res.data?.success) {
        setSearchResult(res.data);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          `Property ID "${id}" was not found. Please verify the ID or check the demo samples below.`
      );
    } finally {
      setLoading(false);
    }
  };

  const sampleLookups = [
    { label: 'Standard Worked Example (1,500 sq ft)', id: 'PROP-W01-1001' },
    { label: 'Senior Citizen Home (10% Rebate)', id: 'PROP-W01-1002' },
    { label: 'Exempt Mandir & Trust (₹0 Tax)', id: 'PROP-W01-TEMPLE' },
    { label: 'Defaulter with Past Arrears', id: 'PROP-W01-DEF01' },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-indigo-950 to-slate-900 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-blue-900">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-800/60 border border-blue-600/40 text-blue-200 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>FY {stats.currentFinancialYear} Property Tax Assessment Active</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Municipal Property Tax & Revenue Portal
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Transparent self-assessment, instant digital receipts, quarterly instalment options,
            and swift grievance resolution for citizens and ward officers.
          </p>

          {/* MODULE 1: Public "Check Your Tax" Lookup Card */}
          <div className="max-w-2xl mx-auto mt-8 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-center gap-2">
              <Search className="w-4 h-4 text-blue-600" /> Quick Tax Assessment & Arrears Lookup (No Login Required)
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookup();
              }}
              className="flex flex-col sm:flex-row gap-2 mt-3"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={propertyIdInput}
                  onChange={(e) => setPropertyIdInput(e.target.value)}
                  placeholder="Enter Municipal Property ID (e.g. PROP-W01-1001)"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Check Tax'}
              </button>
            </form>

            {/* Quick Demo Lookup Chips */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Try Demo Properties:</span>
              {sampleLookups.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setPropertyIdInput(s.id);
                    handleLookup(s.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 text-[11px] font-medium transition cursor-pointer"
                >
                  {s.id}
                </button>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Search Result Display */}
            {searchResult && (
              <div className="mt-6 text-left border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-lg text-slate-900 dark:text-white">
                        {searchResult.property.propertyId}
                      </span>
                      <Badge variant="primary" size="sm">
                        Ward {searchResult.property.wardNumber}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {searchResult.property.propertyType}
                      </Badge>
                      {searchResult.property.isSeniorCitizen && (
                        <Badge variant="success" size="sm">
                          Senior Citizen Owner
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {searchResult.property.address} • Owner: {searchResult.property.ownerName}
                    </p>
                  </div>

                  <div className="text-right">
                    {searchResult.property.isPaid ? (
                      <div>
                        <Badge variant="success" size="md">
                          TAX PAID FOR FY 2026-27
                        </Badge>
                        {searchResult.property.latestReceipt && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono mt-1">
                            Receipt: {searchResult.property.latestReceipt}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge variant="warning" size="md">
                        PAYMENT PENDING
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Line-by-Line Breakdown */}
                <TaxBreakdownCard breakdown={searchResult.taxBreakdown} />

                {/* Direct Action Link */}
                <div className="flex justify-end pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-md transition"
                  >
                    Log In to Pay or Download Receipt <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Live Portal KPI Counters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Registered Properties
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {stats.totalRegisteredProperties}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Total Revenue Collected
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                ₹{Number(stats.totalTaxCollected).toLocaleString('en-IN')}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Digital Receipts Issued
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {stats.totalTransactions}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Early Bird Rebate
              </p>
              <h3 className="text-2xl font-extrabold text-amber-600">
                {stats.earlyBirdRebatePercent}% OFF
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
          <Badge variant="primary" size="md">
            Citizen Governance
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Modern Digital Property Tax Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Replacing cumbersome paper registers and physical demand notices with transparent,
            audited workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Instant Online Assessment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Transparent rate cards by category (Residential ₹8, Commercial ₹15, Industrial ₹18).
              Age discounts automatically applied by construction year.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Quarterly Instalment Schemes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Flexibility to pay annual taxes in 2 or 4 equal quarterly parts with automatic
              rounding and individual official receipts for each part.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Transfer & Reassessment Workflows
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Submit mutation of ownership (sale, gift, inheritance) and area reassessment online.
              Ward officers review and maintain historic ownership ledgers.
            </p>
          </div>
        </div>
      </section>

      {/* Tax Engine Formula Highlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Single Source of Truth Formula
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Deterministic, Fair & Audited Tax Calculations
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Base Tax = Area × Rate. Net Tax = Base − Age Discount.
              Total = Net − Early Rebate (5%) − Senior Citizen Rebate (10%) + Late Penalty (2%/mo) + Arrears.
            </p>
            <div className="pt-2">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                Explore Worked Example & Municipal Rate Schedule <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 text-xs space-y-2 w-full lg:w-80 shrink-0 font-mono text-slate-200">
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider pb-1 border-b border-slate-700">
              Verified Benchmark
            </div>
            <div className="flex justify-between">
              <span>1,500 sq ft @ ₹8:</span>
              <span className="font-bold">₹12,000</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>20% Age Discount:</span>
              <span>-₹2,400</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-1">
              <span>Net Tax:</span>
              <span className="font-bold">₹9,600</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>5% Early Rebate:</span>
              <span>-₹480</span>
            </div>
            <div className="flex justify-between font-bold text-blue-400 border-t border-slate-700 pt-1 text-sm">
              <span>Payable:</span>
              <span>₹9,120</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
