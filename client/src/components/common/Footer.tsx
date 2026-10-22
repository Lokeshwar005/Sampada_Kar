import React from 'react';
import { ShieldCheck, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: About Portal */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src="/emblem.svg" alt="Emblem" className="w-8 h-8" />
              <span className="font-bold text-white text-base">सम्पदा कर – Sampada Kar</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              An official municipal property tax assessment, billing, and grievance portal.
              Enabling transparent citizen governance and direct municipal revenue reconciliation.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
              <ShieldCheck className="w-4 h-4" /> 256-Bit SSL Encrypted & RBI Gateway Compliant
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="font-semibold text-white uppercase tracking-wider mb-3 text-xs">
              Citizen Services
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <Link to="/" className="hover:text-white transition">
                  Quick Tax Assessment Lookup
                </Link>
              </li>
              <li>
                <Link to="/citizen" className="hover:text-white transition">
                  Pay Annual Property Tax
                </Link>
              </li>
              <li>
                <Link to="/citizen" className="hover:text-white transition">
                  Quarterly Instalment Scheme
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">
                  Senior Citizen Rebate Guidelines
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">
                  Tax Calculation Formula & Rates
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Statutory & Assistance */}
          <div>
            <h4 className="font-semibold text-white uppercase tracking-wider mb-3 text-xs">
              Statutory Information
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>Section 132 Municipal Corporations Act</li>
              <li>Early-Bird 5% Rebate Scheme 2026-27</li>
              <li>Senior Citizen 10% Concession Rules</li>
              <li>Demand Notices & Defaulter Enforcement</li>
              <li>Grievance Redressal Citizen Charter</li>
            </ul>
          </div>

          {/* Col 4: Helpline & Office */}
          <div className="space-y-2.5">
            <h4 className="font-semibold text-white uppercase tracking-wider mb-3 text-xs">
              Municipal Corporation Helpdesk
            </h4>
            <p className="flex items-center gap-2 text-slate-400">
              <Phone className="w-3.5 h-3.5 text-blue-400" /> Toll-Free: 1800-233-0455 (9 AM - 6 PM)
            </p>
            <p className="flex items-center gap-2 text-slate-400">
              <Mail className="w-3.5 h-3.5 text-blue-400" /> revenue.helpdesk@sampadakar.gov.in
            </p>
            <p className="flex items-start gap-2 text-slate-400 leading-tight">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              Mahanagar Palika Bhawan, Revenue Block B, Civic Center, India
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-3">
          <p>
            © {new Date().getFullYear()} Municipal Corporation. All rights reserved. Designed for Digital India Public Services.
          </p>
          <div className="flex gap-4">
            <span className="hover:text-slate-300">Privacy Policy</span>
            <span className="hover:text-slate-300">Terms of Service</span>
            <span className="hover:text-slate-300">Hyperlink Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
