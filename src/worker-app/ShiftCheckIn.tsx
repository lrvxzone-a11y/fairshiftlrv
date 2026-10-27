import React, { useState, useEffect } from 'react';
import {
  Clock,
  QrCode,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Smartphone
} from 'lucide-react';
import { User, Tenant, Shift, FatigueAlert, Language } from '../types';
import { translations } from '../i18n/translations';

interface Props {
  user: User;
  tenant: Tenant;
  lang: Language;
  onShiftChange?: () => void;
}

export const ShiftCheckIn: React.FC<Props> = ({ user, tenant, lang, onShiftChange }) => {
  const t = translations[lang];
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [fatigueAlerts, setFatigueAlerts] = useState<FatigueAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [checkInNotice, setCheckInNotice] = useState<string | null>(null);

  // Fetch active shift & history
  const loadShiftData = async () => {
    try {
      setLoading(true);
      const [activeRes, histRes] = await Promise.all([
        fetch(`/api/shifts/active/${user.id}`),
        fetch(`/api/shifts/worker/${user.id}`),
      ]);

      const activeData = await activeRes.json();
      const histData = await histRes.json();

      setActiveShift(activeData.activeShift || null);
      setRecentShifts(histData.shifts || []);
      setFatigueAlerts(histData.fatigueAlerts || []);
    } catch (err) {
      console.error('Failed to load shift data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShiftData();
  }, [user.id, tenant.id]);

  // Timer for active shift
  useEffect(() => {
    if (!activeShift?.clock_in_time) {
      setElapsedSeconds(0);
      return;
    }

    const start = new Date(activeShift.clock_in_time).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeShift]);

  const formatElapsedTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Perform QR Check-in
  const handlePerformCheckIn = async (simulatedOutsideGeofence = false) => {
    setIsProcessing(true);
    setCheckInNotice(null);

    // Simulated site coordinates
    const targetLoc = simulatedOutsideGeofence
      ? { lat: tenant.geofenceCoordinates.lat + 0.05, lng: tenant.geofenceCoordinates.lng + 0.05 }
      : {
          lat: tenant.geofenceCoordinates.lat + 0.0001,
          lng: tenant.geofenceCoordinates.lng + 0.0001,
        };

    try {
      const res = await fetch('/api/shifts/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          siteDepartment: user.teamDepartment,
          lat: targetLoc.lat,
          lng: targetLoc.lng,
          qrToken: `QR_GATE_${tenant.id.toUpperCase()}_#${Math.floor(Math.random() * 900 + 100)}`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowQrModal(false);
        setCheckInNotice(data.message);
        await loadShiftData();
        if (onShiftChange) onShiftChange();
      } else {
        alert(data.error || 'Failed to check in');
      }
    } catch (e) {
      console.error(e);
      alert('Network error during check-in');
    } finally {
      setIsProcessing(false);
    }
  };

  // Perform Check-out
  const handlePerformCheckOut = async () => {
    if (!activeShift) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/shifts/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: activeShift.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheckInNotice(
          `Shift completed: ${data.durationHours} hrs recorded. Overtime: ${data.overtimeHours} hrs. Net pay calculated: ₹${data.payCalculation.netPay}`
        );
        await loadShiftData();
        if (onShiftChange) onShiftChange();
      } else {
        alert(data.error || 'Failed to check out');
      }
    } catch (e) {
      console.error(e);
      alert('Network error during check-out');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Geofence notice / success banner */}
      {checkInNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm flex items-start gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">{checkInNotice}</div>
          <button
            onClick={() => setCheckInNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Fatigue alerts banner if triggered */}
      {fatigueAlerts.length > 0 && (
        <div className="p-3.5 bg-amber-950/70 border border-amber-500/50 rounded-xl text-amber-200 text-sm space-y-1 shadow-md">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>{t.fatigueAlert} (SDG 8 Health & Rest Rule)</span>
          </div>
          {fatigueAlerts.map((a, idx) => (
            <p key={idx} className="text-xs text-amber-200/90 pl-7">
              • {a.message}
            </p>
          ))}
        </div>
      )}

      {/* Current Shift Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute -right-10 -top-10 w-36 h-36 rounded-full blur-3xl opacity-20 ${
            activeShift ? 'bg-emerald-500' : 'bg-sky-500'
          }`}
        />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                activeShift ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              {activeShift ? t.activeShift : t.offDuty}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            {user.teamDepartment}
          </span>
        </div>

        {activeShift ? (
          <div className="space-y-4">
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">{t.shiftDuration}</span>
              <div className="text-3xl font-extrabold tracking-tight font-mono text-emerald-400">
                {formatElapsedTime(elapsedSeconds)}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center justify-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Started: {new Date(activeShift.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400/90 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-800/40">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.onSiteVerified} (~25m from GPS center)</span>
            </div>

            <button
              onClick={handlePerformCheckOut}
              disabled={isProcessing}
              className="w-full py-4 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-lg shadow-red-900/30 flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <QrCode className="w-6 h-6" />
              <span>{isProcessing ? 'Processing...' : t.qrCheckOut}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Ready for Duty</h3>
              <p className="text-xs text-slate-400">
                Scan supervisor site QR badge or geofence point to record attendance and compute overtime accurately.
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(true)}
              className="w-full py-4 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-lg shadow-sky-900/30 flex items-center justify-center gap-3 transition-all cursor-pointer"
            >
              <QrCode className="w-6 h-6" />
              <span>{t.qrCheckIn}</span>
            </button>
          </div>
        )}
      </div>

      {/* QR Code Scanner / Geofence Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 text-slate-100 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">{t.qrCheckIn}</h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Simulated camera viewfinder */}
            <div className="relative aspect-square w-full rounded-xl bg-slate-950 border-2 border-dashed border-sky-500/60 flex flex-col items-center justify-center p-4 overflow-hidden">
              <div className="absolute inset-0 bg-sky-500/5 animate-pulse" />
              <div className="w-48 h-48 border-2 border-sky-400 rounded-lg relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500/80 shadow-[0_0_8px_red] absolute top-1/2 -translate-y-1/2 animate-bounce" />
                <QrCode className="w-24 h-24 text-slate-700/60" />
              </div>
              <p className="mt-3 text-xs text-sky-300 font-medium z-10">
                Point camera at Site Gate QR or Supervisor Badge
              </p>
            </div>

            <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Site GPS Geofence: <strong>{tenant.name}</strong> (Radius: {tenant.geofenceRadiusMeters}m).
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handlePerformCheckIn(false)}
                disabled={isProcessing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulate Scan: Inside Geofence (Standard)</span>
              </button>

              <button
                onClick={() => handlePerformCheckIn(true)}
                disabled={isProcessing}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 border border-amber-500/30 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulate Scan: Outside Geofence (Flag Review)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Week Shift Log Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Recent Shift Log & Overtime Audit</span>
          </h4>
          <span className="text-xs text-slate-500 font-mono">{recentShifts.length} shifts recorded</span>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {recentShifts.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-4">No completed shifts yet.</p>
          ) : (
            recentShifts.slice(0, 7).map((s) => {
              const ot = Number(s.overtime_hours || 0);
              const dur = Number(s.duration_hours || 0);
              const dateStr = new Date(s.clock_in_time).toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={s.id}
                  className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">{dateStr}</div>
                    <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                      <span>{s.site_department}</span>
                      {s.in_geofence ? (
                        <span className="text-emerald-400 font-medium">• On-Site</span>
                      ) : (
                        <span className="text-amber-400 font-medium">• Geo Flagged</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className="font-mono font-bold text-slate-200">
                      {dur > 0 ? `${dur.toFixed(1)} hrs` : 'Active'}
                    </div>
                    {ot > 0 && (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[10px] border border-amber-800/50">
                        +{ot.toFixed(1)}h OT
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
