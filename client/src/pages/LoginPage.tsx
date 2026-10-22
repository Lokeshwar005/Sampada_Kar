import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Sparkles, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Badge } from '../components/common/Badge.js';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, quickDemoLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res.data?.success) {
        login(res.data.token, res.data.user);
        redirectByRole(res.data.user.role);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role: string) => {
    if (role === 'ADMIN') navigate('/admin');
    else if (role === 'WARD_OFFICER') navigate('/officer');
    else navigate('/citizen');
  };

  const handleDemoSelect = async (role: 'CITIZEN' | 'SENIOR' | 'OFFICER' | 'ADMIN') => {
    setLoading(true);
    setError(null);
    try {
      await quickDemoLogin(role);
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'OFFICER') navigate('/officer');
      else navigate('/citizen');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <img src="/emblem.svg" alt="Emblem" className="w-12 h-12 mx-auto drop-shadow-sm" />
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Log In to Sampada Kar
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official Municipal Property Tax & Revenue Access
          </p>
        </div>

        {/* 1-Click Demo Login Box */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Instant Demo Persona Logins</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoSelect('CITIZEN')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 hover:border-amber-400 text-left transition shadow-xs cursor-pointer"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                Rajesh Verma
              </span>
              <span className="text-[10px] text-slate-500">Citizen (General)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('SENIOR')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 hover:border-amber-400 text-left transition shadow-xs cursor-pointer"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                Saraswati Devi
              </span>
              <span className="text-[10px] text-slate-500">Senior Citizen (10% Rebate)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('OFFICER')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 hover:border-amber-400 text-left transition shadow-xs cursor-pointer"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                Sunil Sharma
              </span>
              <span className="text-[10px] text-slate-500">Ward Officer (W-01/02)</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('ADMIN')}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 hover:border-amber-400 text-left transition shadow-xs cursor-pointer"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                Vikramaditya
              </span>
              <span className="text-[10px] text-slate-500">Municipal Commissioner</span>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Email Address or 10-Digit Mobile Number
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9876543210 or user@example.com"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
            Don't have a citizen account yet?{' '}
            <Link to="/register" className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">
              Register as Citizen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
