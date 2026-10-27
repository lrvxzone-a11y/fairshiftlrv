import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  IndianRupee,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileCheck2,
  ArrowDownRight,
  ArrowUpRight,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { User, Tenant, Language, PayslipData } from '../types';
import { translations } from '../i18n/translations';
import { playVoiceMessage, stopVoicePlayback } from '../utils/speech';

interface Props {
  user: User;
  tenant: Tenant;
  lang: Language;
}

export const PayslipView: React.FC<Props> = ({ user, tenant, lang }) => {
  const t = translations[lang];
  const [payslip, setPayslip] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const fetchPayslip = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/payslips/${user.id}`);
        const data = await res.json();
        setPayslip(data);
      } catch (e) {
        console.error('Failed to load payslip', e);
      } finally {
        setLoading(false);
      }
    };

    fetchPayslip();
  }, [user.id]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopVoicePlayback();
    };
  }, []);

  const handleToggleVoicePlayback = () => {
    if (isPlayingVoice) {
      stopVoicePlayback();
      setIsPlayingVoice(false);
      return;
    }

    if (!payslip) return;

    // Select script based on active language
    const script = payslip.voiceScripts[lang] || payslip.voiceScripts.en;
    setIsPlayingVoice(true);

    const started = playVoiceMessage(script, lang, () => {
      setIsPlayingVoice(false);
    });

    if (!started) {
      setIsPlayingVoice(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Computing transparent wage breakdown...</p>
      </div>
    );
  }

  if (!payslip) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-sm">No shift records available to generate payslip.</p>
      </div>
    );
  }

  const { calculation } = payslip;

  return (
    <div className="space-y-4">
      {/* Voice Playback Card */}
      <div className="bg-gradient-to-r from-sky-900/60 via-indigo-900/40 to-slate-900 border border-sky-500/30 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sky-300 font-semibold text-sm">
            <Volume2 className="w-4 h-4 text-sky-400" />
            <span>{t.listenVoicePayslip}</span>
          </div>
          <p className="text-xs text-slate-300">
            {lang === 'hi'
              ? 'बिना पढ़े पूरा हिसाब हिंदी आवाज़ में सुनें'
              : lang === 'ta'
              ? 'முழு சம்பள விவரத்தையும் குரல் வழியே கேட்கலாம்'
              : 'Listen to clear audio narration of your earnings and deductions'}
          </p>
        </div>

        <button
          onClick={handleToggleVoicePlayback}
          className={`shrink-0 px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
            isPlayingVoice
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold'
          }`}
          aria-label={t.listenVoicePayslip}
        >
          {isPlayingVoice ? (
            <>
              <VolumeX className="w-4 h-4" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Play Audio</span>
            </>
          )}
        </button>
      </div>

      {/* Main Transparent Payslip Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-sky-400 block">
              UN SDG 8 Verified Wage Statement
            </span>
            <h2 className="text-base font-bold text-slate-100">{user.name}</h2>
            <p className="text-xs text-slate-400">
              {user.jobTitle} • {user.teamDepartment}
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Zero Wage Theft</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono">
              {payslip.period}
            </span>
          </div>
        </div>

        {/* Big Take-Home Pay Highlight */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500" />
          <span className="text-xs text-slate-400 block mb-1 font-medium">{t.netTakeHome}</span>
          <div className="text-4xl font-extrabold text-emerald-400 font-mono tracking-tight flex items-center justify-center gap-1">
            <span>₹</span>
            <span>{calculation.netPay.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-center gap-3">
            <span>Total Hours: <strong className="text-slate-200">{payslip.totalHours} hrs</strong></span>
            <span>•</span>
            <span>Shifts: <strong className="text-slate-200">{payslip.shiftsCount}</strong></span>
          </div>
        </div>

        {/* Itemized Line Items */}
        <div className="space-y-2.5 text-xs">
          {/* Base Regular Pay */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-950/80 border border-sky-800/50 flex items-center justify-center text-sky-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-200 block">{t.regularEarnings}</span>
                <span className="text-[11px] text-slate-400">
                  {calculation.regularHours.toFixed(1)} hrs @ standard rate
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-slate-200 text-sm">
              +₹{calculation.basePay.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Overtime Pay */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800/50 flex items-center justify-center text-amber-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-200 block">{t.overtimeEarnings}</span>
                <span className="text-[11px] text-slate-400">
                  {calculation.overtimeHours.toFixed(1)} OT hrs ({tenant.overtimeMultiplier}x rate)
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-amber-300 text-sm">
              +₹{calculation.overtimePay.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Hazard / Hardship Allowance */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-200 block">{t.hazardBonus}</span>
                <span className="text-[11px] text-slate-400">
                  {tenant.industry === 'healthcare' ? 'ICU & Night Shift Allowance' : 'Heights & Scaffolding Hardship Bonus'}
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-indigo-300 text-sm">
              +₹{calculation.hazardAllowance.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Statutory Deductions */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/50 rounded-lg border border-rose-950/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-950/80 border border-rose-800/50 flex items-center justify-center text-rose-400">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-200 block">{t.statutoryDeductions}</span>
                <span className="text-[11px] text-slate-400">
                  Statutory Provident Fund (EPF) + Health Insurance (ESI)
                </span>
              </div>
            </div>
            <span className="font-mono font-bold text-rose-400 text-sm">
              -₹{calculation.deductions.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Explainability Accordion */}
        <div className="border-t border-slate-800 pt-3">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              How is my overtime calculated?
            </span>
            <span>{showExplanation ? '▲' : '▼'}</span>
          </button>

          {showExplanation && (
            <div className="mt-2 text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 animate-fadeIn">
              <p>
                • <strong>Standard shift:</strong> {tenant.standardShiftHours} hours per day.
              </p>
              <p>
                • <strong>Overtime multiplier:</strong> {tenant.overtimeMultiplier}x of regular hourly rate.
              </p>
              <p>
                • Under <strong>UN SDG 8 Decent Work guidelines</strong>, FairShift ensures no overtime is omitted or rounded down by intermediaries.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
