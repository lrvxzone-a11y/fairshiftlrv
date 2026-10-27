import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  LayoutDashboard,
  Columns2,
  Building,
  UserCheck,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  FileText,
  BookOpen,
  Award,
  Globe
} from 'lucide-react';
import { Tenant, User, Language } from './types';
import { WorkerAppShell } from './worker-app/WorkerAppShell';
import { AdminDashboardShell } from './admin-dashboard/AdminDashboardShell';
import { NotificationPopover } from './components/NotificationPopover';

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('buildright');
  const [selectedUserId, setSelectedUserId] = useState<string>('u_br_w1');
  const [activeViewMode, setActiveViewMode] = useState<'worker' | 'admin' | 'split'>('split');
  const [lang, setLang] = useState<Language>('hi'); // default to Hindi for construction worker demo, or switchable to EN/TA
  const [loading, setLoading] = useState(true);
  const [showDocModal, setShowDocModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load Tenants and Users
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [tRes, uRes] = await Promise.all([
          fetch('/api/tenants'),
          fetch('/api/users'),
        ]);
        const tData = await tRes.json();
        const uData = await uRes.json();

        setTenants(tData.tenants || []);
        setUsers(uData.users || []);
      } catch (e) {
        console.error('Error loading initial data', e);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [refreshTrigger]);

  const currentTenant = tenants.find((t) => t.id === selectedTenantId) || tenants[0];
  const currentUser = users.find((u) => u.id === selectedUserId) || users[0];

  // Auto switch default persona when tenant changes
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    if (tenantId === 'citycare') {
      setSelectedUserId('u_cc_w1'); // Sunita Devi (Nurse)
      setLang('hi');
    } else {
      setSelectedUserId('u_br_w1'); // Ramesh Kumar (Scaffolder)
      setLang('hi');
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading || !currentTenant || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6 space-y-4">
        <div className="w-12 h-12 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-base font-bold tracking-tight">Loading FairShift Decent Work Platform...</h2>
        <p className="text-xs text-slate-400">Bootstrapping UN SDG 8 Multi-Industry Workspaces</p>
      </div>
    );
  }

  // Filter users by current tenant for persona switcher
  const tenantUsers = users.filter((u) => u.tenantId === currentTenant.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Universal Applet Banner & Presentation Control Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sticky top-0 z-50 shadow-lg">
        {/* Brand & SDG Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center font-black text-white text-xs shadow">
              FS
            </span>
            <span className="font-extrabold text-sm text-slate-100 tracking-tight">FairShift</span>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>UN SDG 8 Decent Work</span>
          </span>
        </div>

        {/* View Switcher: Worker PWA vs Admin Dashboard vs Split View */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveViewMode('worker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeViewMode === 'worker'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Worker PWA</span>
          </button>

          <button
            onClick={() => setActiveViewMode('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeViewMode === 'admin'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </button>

          <button
            onClick={() => setActiveViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeViewMode === 'split'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split Live View</span>
          </button>
        </div>

        {/* Demo Persona & Industry Selectors */}
        <div className="flex items-center gap-2">
          {/* Tenant Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Building className="w-3.5 h-3.5 text-sky-400" />
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                  {t.name.split(' (')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Persona Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <optgroup label="Workers">
                {tenantUsers
                  .filter((u) => u.role === 'worker')
                  .slice(0, 5)
                  .map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                      {u.name} ({u.jobTitle})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Managers & Admins">
                {tenantUsers
                  .filter((u) => u.role !== 'worker')
                  .map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                      {u.name} ({u.role.toUpperCase()})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Notification Popover with Bell Icon */}
          <NotificationPopover currentTenant={currentTenant} />

          {/* Documentation & Cross-Industry Info */}
          <button
            onClick={() => setShowDocModal(true)}
            title="Read Cross-Industry Adoption & Architecture Specs"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer flex items-center gap-1 font-semibold"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Docs & Adoption</span>
          </button>
        </div>
      </header>

      {/* Main App Content Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Worker Only View */}
        {activeViewMode === 'worker' && (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950 flex justify-center">
            <WorkerAppShell
              user={currentUser}
              tenant={currentTenant}
              lang={lang}
              onLanguageChange={setLang}
              onRefreshData={handleRefresh}
            />
          </div>
        )}

        {/* Admin Only View */}
        {activeViewMode === 'admin' && (
          <div className="flex-1 overflow-y-auto">
            <AdminDashboardShell
              currentTenant={currentTenant}
              currentUser={
                // If current user is a worker, pick admin of tenant for dashboard view
                currentUser.role === 'worker'
                  ? users.find((u) => u.tenantId === currentTenant.id && u.role === 'admin') || currentUser
                  : currentUser
              }
              onTenantChange={handleTenantChange}
              allTenants={tenants}
            />
          </div>
        )}

        {/* Interactive Split View: Side-by-Side Mobile Worker + Desktop Admin */}
        {activeViewMode === 'split' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
            {/* Left: Mobile Worker App Frame */}
            <div className="lg:w-[420px] shrink-0 border-r border-slate-800 overflow-y-auto bg-slate-950 p-3 lg:p-4 flex flex-col items-center">
              <div className="w-full max-w-sm rounded-3xl border-4 border-slate-800 shadow-[0_0_35px_rgba(0,0,0,0.8)] overflow-hidden bg-slate-950">
                <WorkerAppShell
                  user={currentUser}
                  tenant={currentTenant}
                  lang={lang}
                  onLanguageChange={setLang}
                  onRefreshData={handleRefresh}
                />
              </div>
            </div>

            {/* Right: Responsive Admin Operations Dashboard */}
            <div className="flex-1 overflow-y-auto">
              <AdminDashboardShell
                currentTenant={currentTenant}
                currentUser={
                  currentUser.role === 'worker'
                    ? users.find((u) => u.tenantId === currentTenant.id && u.role === 'admin') || currentUser
                    : currentUser
                }
                onTenantChange={handleTenantChange}
                allTenants={tenants}
              />
            </div>
          </div>
        )}
      </div>

      {/* Cross-Industry Adoption & Architecture Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-slate-100">
                  FairShift: UN SDG 8 Decent Work Architecture
                </h3>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Section: Cross-Industry Adoption */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-sm text-sky-400 uppercase tracking-wider">
                Cross-Industry Adoption Blueprint
              </h4>
              <p className="text-slate-300 leading-relaxed">
                FairShift is designed to serve varied workforce industries using a unified, configurable
                tenant policy schema rather than hardcoded rules:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-sky-300 block">🏗️ BuildRight Construction</span>
                  <ul className="space-y-1 text-slate-400">
                    <li>• <strong>Wage Model:</strong> Daily-wage base + 1.5x overtime.</li>
                    <li>• <strong>Check-In:</strong> Geofenced (300m radius) site gate QR.</li>
                    <li>• <strong>Safety Focus:</strong> Scaffolding, heights, excavation, electrical puddle risks.</li>
                    <li>• <strong>Languages:</strong> High Hindi & Tamil worker adoption with icon-first buttons.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-300 block">🏥 CityCare Hospital</span>
                  <ul className="space-y-1 text-slate-400">
                    <li>• <strong>Wage Model:</strong> Hourly wage + 2.0x critical overtime.</li>
                    <li>• <strong>Check-In:</strong> Ward-level rotations (Morning / Evening / Night).</li>
                    <li>• <strong>Fatigue Engine:</strong> 11-hour mandatory recovery gap between back-to-back shifts.</li>
                    <li>• <strong>Safety Focus:</strong> Biohazard spill SLA, needle stick destroyers, infection control.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section: Core UN SDG 8 Innovations */}
            <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
              <h4 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">
                Core FairShift Innovations
              </h4>
              <div className="space-y-2 text-slate-300">
                <p>
                  <strong>1. Zero-Wage-Theft Transparent Payslip:</strong> Itemizes base pay, daily overtime,
                  and hardship bonuses with a single-tap <strong>Web Speech Audio Playback</strong> button in Hindi, Tamil, and English.
                </p>
                <p>
                  <strong>2. Zero-PII Anonymous Whistleblower Protection:</strong> Survey and feedback records
                  strictly omit user identity, phone numbers, and hardware fingerprints in PostgreSQL.
                </p>
                <p>
                  <strong>3. Portable Skill Passport:</strong> Solves lost career history when workers migrate
                  between contractors with employer-verified cryptographic credentials.
                </p>
                <p>
                  <strong>4. Rule-Based Quit-Risk Predictor:</strong> Alerts site managers to burnout patterns
                  before strikes, safety incidents, or mass attrition occur.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowDocModal(false)}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
