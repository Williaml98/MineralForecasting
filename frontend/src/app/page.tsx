'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Modules', href: '#modules' },
  { label: 'Tech Stack', href: '#tech' },
];

const FEATURES = [
  {
    icon: '🧠',
    title: 'AI-Powered Forecasting',
    desc: 'Train ARIMA, Facebook Prophet, and LSTM neural network models on your mineral commodity data to generate accurate multi-horizon forecasts.',
  },
  {
    icon: '📊',
    title: 'Interactive Dashboards',
    desc: 'Role-specific dashboards with live charts, confidence intervals, geographic heat maps, and cross-mineral comparisons.',
  },
  {
    icon: '🔬',
    title: 'Data Preprocessing Pipeline',
    desc: 'Configurable pipelines for missing-value imputation, outlier detection, normalisation, and feature engineering with full data lineage.',
  },
  {
    icon: '🎯',
    title: 'Decision Support',
    desc: 'Scenario builder with 5 adjustable parameters, automated strategic recommendations, and early warning alerts for threshold breaches.',
  },
  {
    icon: '🔒',
    title: 'Role-Based Access Control',
    desc: 'Four distinct roles — Analyst, Strategist, Executive, Admin — each with precisely scoped access to modules and actions.',
  },
  {
    icon: '📋',
    title: 'Full Audit Trail',
    desc: 'Every login, data upload, model training, and scenario analysis is logged with timestamps and IP addresses for full traceability.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Ingest Your Data',
    desc: 'Upload CSV or Excel datasets, or pull live commodity prices from a public API. Validate, version, and preview before committing.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    step: '02',
    title: 'Preprocess & Engineer',
    desc: 'Run a 4-step pipeline: handle missing values, detect outliers, normalise features, and engineer rolling averages and lag variables.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    step: '03',
    title: 'Train & Compare Models',
    desc: 'Train ARIMA, Prophet, or LSTM models with configurable hyperparameters. Compare MAE, RMSE, and MAPE side-by-side and activate the best.',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    step: '04',
    title: 'Forecast & Decide',
    desc: 'Generate forecasts with confidence bands for up to 24 months. Run what-if scenarios and get automated strategic recommendations.',
    color: 'from-teal-500 to-teal-600',
  },
];

const MODULES = [
  { name: 'Data Management', icon: '🗄️', roles: 'Analyst · Admin', desc: 'Upload, validate, version, and preview mineral datasets.' },
  { name: 'Preprocessing Pipeline', icon: '⚙️', roles: 'Analyst · Admin', desc: 'Clean, transform, and prepare data for model training.' },
  { name: 'Forecasting Engine', icon: '🤖', roles: 'Analyst · Admin', desc: 'Train ARIMA, Prophet, and LSTM models; compare metrics.' },
  { name: 'Forecast Viewer', icon: '📈', roles: 'All roles', desc: 'Explore forecasts with interactive confidence interval charts.' },
  { name: 'Decision Support', icon: '💡', roles: 'All roles', desc: 'Scenario builder, recommendations, and early warnings.' },
  { name: 'Executive Dashboard', icon: '🖥️', roles: 'Executive · Admin', desc: 'High-level KPIs, alerts, and demand projections at a glance.' },
  { name: 'User Management', icon: '👥', roles: 'Admin only', desc: 'Create, deactivate, and assign roles to system users.' },
  { name: 'Audit Log', icon: '🛡️', roles: 'Admin only', desc: 'Searchable log of all system events with IP tracking.' },
];

const TECH_STACK = [
  { layer: 'Frontend', items: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'Recharts', 'TanStack Query'] },
  { layer: 'Backend', items: ['Spring Boot 3', 'Java 21', 'Spring Security', 'JWT', 'Flyway', 'Maven'] },
  { layer: 'ML Service', items: ['FastAPI', 'Python 3.11', 'ARIMA (statsmodels)', 'Prophet', 'LSTM (TensorFlow)', 'SHAP'] },
  { layer: 'Database', items: ['PostgreSQL 15', 'JPA / Hibernate', 'UUID primary keys'] },
];

/** Animated counter hook */
function useCounter(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const step = Math.ceil(target / (duration / 16));
    const interval = setInterval(() => {
      setCount((c) => {
        if (c + step >= target) { clearInterval(interval); return target; }
        return c + step;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);
  return count;
}

function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const count = useCounter(value);
  return (
    <div className="text-center">
      <p className="text-4xl font-extrabold text-white">
        {count}{suffix}
      </p>
      <p className="text-blue-200 text-sm mt-1">{label}</p>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">BF Mining<span className="text-blue-700"> | Forecast</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-gray-600 hover:text-blue-700 font-medium transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="hidden md:inline-flex items-center px-5 py-2 text-sm font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors shadow-sm">
              Sign In →
            </Link>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen((o) => !o)}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 hover:text-blue-700">
                {l.label}
              </a>
            ))}
            <Link href="/login" className="block w-full text-center py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">
              Sign In
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-24 bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(to right, #60a5fa 1px, transparent 1px), linear-gradient(to bottom, #60a5fa 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Floating glow blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-widest uppercase rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            BF Mining Group Ltd — Final Year Project 2026
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight mb-6">
            AI-Driven Mineral<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Demand Forecasting
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-blue-100 leading-relaxed mb-10">
            A full-stack analytics platform that combines historical data ingestion, machine learning forecasting, and strategic decision support — built for the mining and commodities sector.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/login"
              className="px-8 py-3.5 text-base font-bold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200">
              Get Started →
            </Link>
            <a href="#how-it-works"
              className="px-8 py-3.5 text-base font-semibold rounded-xl border border-white/20 text-white hover:bg-white/10 transition-colors">
              See How It Works
            </a>
          </div>
        </div>

        {/* Mockup preview */}
        <div className="relative max-w-5xl mx-auto mt-20 px-6">
          <div className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-slate-800/50 backdrop-blur">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/80 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 mx-4 bg-slate-700/60 rounded-md text-center text-xs text-slate-400 py-1 px-3">
                localhost:3000 · BF Mining Forecasting System
              </div>
            </div>
            {/* Dashboard mockup */}
            <div className="p-6 grid grid-cols-12 gap-4 min-h-[340px]">
              {/* Sidebar */}
              <div className="col-span-2 space-y-2">
                <div className="h-8 w-full bg-blue-600/40 rounded-lg" />
                {['Dashboard','Data','Forecasting','Scenarios','Admin'].map((item) => (
                  <div key={item} className="h-7 bg-slate-700/50 rounded-md flex items-center px-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400/60 mr-2 flex-shrink-0" />
                    <div className="text-xs text-slate-400 truncate">{item}</div>
                  </div>
                ))}
              </div>
              {/* Main content */}
              <div className="col-span-10 space-y-4">
                {/* KPI row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Active Model', val: 'LSTM v3', color: 'text-blue-400' },
                    { label: 'Horizon', val: '12 months', color: 'text-cyan-400' },
                    { label: 'Demand (next)', val: '↑ 18.4%', color: 'text-green-400' },
                    { label: 'Warnings', val: '2 active', color: 'text-amber-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-slate-700/50 rounded-xl p-3">
                      <div className="text-xs text-slate-400">{label}</div>
                      <div className={`text-sm font-bold mt-1 ${color}`}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Chart area */}
                <div className="bg-slate-700/40 rounded-xl p-4 h-40 relative overflow-hidden">
                  <div className="text-xs text-slate-400 mb-2">Copper Demand Forecast — 12 Month Horizon</div>
                  <svg viewBox="0 0 400 80" className="w-full h-24" preserveAspectRatio="none">
                    {/* CI band */}
                    <path d="M0,60 C50,55 100,50 150,45 C200,40 250,35 300,38 C350,41 380,45 400,43 L400,30 C380,28 350,25 300,22 C250,19 200,22 150,28 C100,34 50,38 0,42 Z"
                      fill="rgba(96,165,250,0.15)" />
                    {/* Forecast line */}
                    <path d="M0,55 C50,50 100,45 150,40 C200,35 250,30 300,32 C350,34 380,38 400,36"
                      fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
                    {/* Historical line */}
                    <path d="M0,65 C20,62 40,60 60,58 C80,56 100,54 120,52"
                      fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,2" />
                    {/* Vertical divider */}
                    <line x1="120" y1="0" x2="120" y2="80" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
                    <text x="85" y="12" fontSize="7" fill="#94a3b8">Historical</text>
                    <text x="128" y="12" fontSize="7" fill="#60a5fa">Forecast →</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-blue-800 to-blue-900 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value={3} suffix="+" label="Forecasting Algorithms" />
          <StatCounter value={7} suffix="" label="Core Modules" />
          <StatCounter value={4} suffix="" label="User Roles" />
          <StatCounter value={100} suffix="K" label="Rows Supported" />
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-700">What It Does</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3">Everything you need to forecast mineral demand</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">From raw data ingestion to board-ready insights — one platform, zero guesswork.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-700">The Workflow</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3">From raw data to strategic decision — in 4 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-indigo-300 to-teal-200 z-0" />
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.step} className="relative z-10 text-center group">
                <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                  <span className="text-white text-2xl font-black">{item.step}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules tour ────────────────────────────────────────────────── */}
      <section id="modules" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-700">System Modules</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3">Eight modules, one cohesive platform</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">Each module is role-gated — users only see what's relevant to their function.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MODULES.map((m) => (
              <div key={m.name}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-200">
                <div className="text-3xl mb-3">{m.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{m.name}</h3>
                <p className="text-gray-500 text-sm mb-3 leading-relaxed">{m.desc}</p>
                <span className="inline-block text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full border border-blue-100">
                  {m.roles}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ──────────────────────────────────────────────────── */}
      <section id="tech" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-blue-700">Under The Hood</span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-3">Built on a modern, production-grade stack</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TECH_STACK.map(({ layer, items }) => (
              <div key={layer} className="rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-blue-700 text-sm uppercase tracking-wide mb-4">{layer}</h3>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #60a5fa 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            Ready to forecast smarter?
          </h2>
          <p className="text-blue-200 text-lg mb-10">
            Sign in with your credentials to access the platform. Contact your system administrator if you don't have an account.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 px-10 py-4 text-base font-bold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200">
            Sign In to the Platform
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-300">BF Mining Forecasting System</span>
          </div>
          <p className="text-xs text-center">
            Academic Final Year Project · BF Mining Group Ltd · 2026 ·
            <span className="ml-1">Document Ref: 24868-SRS-v1.0</span>
          </p>
          <div className="flex gap-5 text-xs">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
