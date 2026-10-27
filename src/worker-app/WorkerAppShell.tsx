import React, { useState } from 'react';
import {
  Clock,
  IndianRupee,
  ShieldAlert,
  HeartHandshake,
  Award,
  Globe,
  Wifi,
  WifiOff,
  Building2,
  UserCheck
} from 'lucide-react';
import { User, Tenant, Language } from '../types';
import { translations } from '../i18n/translations';
import { ShiftCheckIn } from './ShiftCheckIn';
import { PayslipView } from './PayslipView';
import { SafetyReporting } from './SafetyReporting';
import { HonestFeedback } from './HonestFeedback';
import { SkillPassport } from './SkillPassport';
import { NotificationPopover } from '../components/NotificationPopover';

interface Props {
  user: User;
  tenant: Tenant;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onRefreshData?: () => void;
}

export type WorkerTab = 'shifts' | 'payslip' | 'safety' | 'feedback' | 'passport';

export const WorkerAppShell: React.FC<Props> = ({
  user,
  tenant,
  lang,
  onLanguageChange,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<WorkerTab>('shifts');
  const [isOnline, setIsOnline] = useState(true);
  const t = translations[lang];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 shadow-2xl border-x border-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Worker identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 border border-sky-400/40 flex items-center justify-center font-bold text-white shadow-md text-sm">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-100">{user.name}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/60">
                  {user.role}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span className="truncate max-w-[170px]">{tenant.name}</span>
              </div>
            </div>
          </div>

          {/* Language Switcher & Offline Indicator */}
          <div className="flex items-center gap-1.5">
            {/* Quick Language Toggle */}
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
              {(['en', 'hi', 'ta'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => onLanguageChange(l)}
                  className={`px-2 py-1 rounded-md text-[11px] uppercase transition-all cursor-pointer ${
                    lang === l
                      ? 'bg-sky-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-label={`Switch to ${l}`}
                >
                  {l === 'en' ? 'EN' : l === 'hi' ? 'हिंदी' : 'தமிழ்'}
                </button>
              ))}
            </div>

            {/* Notifications Bell */}
            <NotificationPopover currentTenant={tenant} />

            {/* Offline indicator */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              title={isOnline ? 'Online (Connected)' : 'Offline (Local Queue Mode)'}
              className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                isOnline
                  ? 'bg-slate-900 border-slate-800 text-emerald-400'
                  : 'bg-amber-950/80 border-amber-800 text-amber-300 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Offline notification banner if offline */}
        {!isOnline && (
          <div className="mt-2 text-[11px] p-2 bg-amber-950/80 border border-amber-500/40 rounded-lg text-amber-200 flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t.offlineNotice}</span>
          </div>
        )}
      </header>

      {/* Main Tab Screen Area */}
      <main className="flex-1 p-4">
        {activeTab === 'shifts' && (
          <ShiftCheckIn user={user} tenant={tenant} lang={lang} onShiftChange={onRefreshData} />
        )}

        {activeTab === 'payslip' && (
          <PayslipView user={user} tenant={tenant} lang={lang} />
        )}

        {activeTab === 'safety' && (
          <SafetyReporting user={user} tenant={tenant} lang={lang} onReportFiled={onRefreshData} />
        )}

        {activeTab === 'feedback' && (
          <HonestFeedback user={user} tenant={tenant} lang={lang} />
        )}

        {activeTab === 'passport' && (
          <SkillPassport user={user} tenant={tenant} lang={lang} />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Worker app navigation"
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-2 px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      >
        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'shifts'
              ? 'text-sky-400 font-bold bg-sky-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label={t.navShifts}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">{t.navShifts}</span>
        </button>

        <button
          onClick={() => setActiveTab('payslip')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'payslip'
              ? 'text-emerald-400 font-bold bg-emerald-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label={t.navPayslip}
        >
          <IndianRupee className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">{t.navPayslip}</span>
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'safety'
              ? 'text-rose-400 font-bold bg-rose-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label={t.navSafety}
        >
          <ShieldAlert className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">{t.navSafety}</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'feedback'
              ? 'text-indigo-400 font-bold bg-indigo-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label={t.navFeedback}
        >
          <HeartHandshake className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">{t.navFeedback}</span>
        </button>

        <button
          onClick={() => setActiveTab('passport')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'passport'
              ? 'text-amber-400 font-bold bg-amber-950/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label={t.navPassport}
        >
          <Award className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">{t.navPassport}</span>
        </button>
      </nav>
    </div>
  );
};
