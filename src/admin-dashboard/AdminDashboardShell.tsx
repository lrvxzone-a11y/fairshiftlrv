import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Clock,
  HeartHandshake,
  TrendingDown,
  Award,
  Settings,
  Building,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  MapPin
} from 'lucide-react';
import { Tenant, User, Shift, HazardReport, AnonymousFeedback, FeedbackHeatmapItem, QuitRiskData, SkillCredential } from '../types';
import { NotificationPopover } from '../components/NotificationPopover';

interface Props {
  currentTenant: Tenant;
  currentUser: User;
  onTenantChange: (tenantId: string) => void;
  allTenants: Tenant[];
}

export type AdminTab =
  | 'overview'
  | 'sla-queue'
  | 'attendance'
  | 'complaint-heatmap'
  | 'quit-risk'
  | 'skills-verify'
  | 'tenant-config';

export const AdminDashboardShell: React.FC<Props> = ({
  currentTenant,
  currentUser,
  onTenantChange,
  allTenants,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [feedbackData, setFeedbackData] = useState<{ feedback: AnonymousFeedback[]; heatmap: FeedbackHeatmapItem[] }>({
    feedback: [],
    heatmap: [],
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [skillsList, setSkillsList] = useState<SkillCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Resolution modal state
  const [selectedHazardForResolution, setSelectedHazardForResolution] = useState<HazardReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);

  // Policy edit state
  const [policyStdHours, setPolicyStdHours] = useState(currentTenant.standardShiftHours);
  const [policyMaxWeekly, setPolicyMaxWeekly] = useState(currentTenant.maxWeeklyHours);
  const [policyMinRest, setPolicyMinRest] = useState(currentTenant.minRestHoursBetweenShifts);
  const [policyOtMultiplier, setPolicyOtMultiplier] = useState(currentTenant.overtimeMultiplier);
  const [policyGeofenceRadius, setPolicyGeofenceRadius] = useState(currentTenant.geofenceRadiusMeters);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, shiftsRes, hazardsRes, feedbackRes, usersRes] = await Promise.all([
        fetch(`/api/analytics/${currentTenant.id}`),
        fetch(`/api/shifts/tenant/${currentTenant.id}`),
        fetch(`/api/hazards/${currentTenant.id}`),
        fetch(`/api/feedback/${currentTenant.id}`),
        fetch(`/api/users?tenantId=${currentTenant.id}`),
      ]);

      const analyticsJson = await analyticsRes.json();
      const shiftsJson = await shiftsRes.json();
      const hazardsJson = await hazardsRes.json();
      const feedbackJson = await feedbackRes.json();
      const usersJson = await usersRes.json();

      setAnalytics(analyticsJson);
      setShifts(shiftsJson.shifts || []);
      setHazards(hazardsJson.hazards || []);
      setFeedbackData({
        feedback: feedbackJson.feedback || [],
        heatmap: feedbackJson.heatmap || [],
      });
      setAllUsers(usersJson.users || []);

      // Gather skills from workers
      const workers = usersJson.users || [];
      const skillPromises = workers.slice(0, 6).map((w: any) =>
        fetch(`/api/skills/${w.id}`).then((r) => r.json())
      );
      const skillResults = await Promise.all(skillPromises);
      const flattenedSkills: SkillCredential[] = [];
      skillResults.forEach((sr) => {
        if (sr.skills) flattenedSkills.push(...sr.skills);
      });
      setSkillsList(flattenedSkills);
    } catch (e) {
      console.error('Error fetching admin dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    setPolicyStdHours(currentTenant.standardShiftHours);
    setPolicyMaxWeekly(currentTenant.maxWeeklyHours);
    setPolicyMinRest(currentTenant.minRestHoursBetweenShifts);
    setPolicyOtMultiplier(currentTenant.overtimeMultiplier);
    setPolicyGeofenceRadius(currentTenant.geofenceRadiusMeters);
  }, [currentTenant.id]);

  // Update Hazard Status (Acknowledge / Resolve)
  const handleUpdateHazardStatus = async (
    hazardId: string,
    newStatus: 'ACKNOWLEDGED' | 'RESOLVED',
    notes?: string
  ) => {
    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/hazards/${hazardId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolutionNotes: notes || (newStatus === 'ACKNOWLEDGED' ? 'Assigned to duty supervisor' : undefined),
        }),
      });

      if (res.ok) {
        setActionNotice(`Hazard ticket ${hazardId} marked as ${newStatus}.`);
        setSelectedHazardForResolution(null);
        setResolutionNotes('');
        await fetchDashboardData();
      } else {
        alert('Failed to update ticket status');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating hazard ticket');
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Verify Worker Skill Credential
  const handleVerifySkill = async (skillId: string) => {
    try {
      const res = await fetch(`/api/skills/verify/${skillId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifiedBy: `${currentUser.name} (${currentUser.jobTitle})`,
        }),
      });

      if (res.ok) {
        setActionNotice('Worker skill passport credential verified and stamped.');
        await fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Tenant Policies
  const handleSaveTenantPolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      const res = await fetch(`/api/tenants/${currentTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardShiftHours: Number(policyStdHours),
          maxWeeklyHours: Number(policyMaxWeekly),
          minRestHoursBetweenShifts: Number(policyMinRest),
          overtimeMultiplier: Number(policyOtMultiplier),
          geofenceRadiusMeters: Number(policyGeofenceRadius),
        }),
      });

      if (res.ok) {
        setActionNotice('Tenant workforce compliance policies updated successfully.');
        await fetchDashboardData();
      } else {
        alert('Failed to update tenant policy');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving policy');
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Admin Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            FS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-slate-100 tracking-tight">
                FairShift Operations Command
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                UN SDG 8 Compliant
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Logged in as <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.jobTitle})
            </p>
          </div>
        </div>

        {/* Tenant Switcher & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1 px-3">
            <Building className="w-4 h-4 text-sky-400" />
            <select
              value={currentTenant.id}
              onChange={(e) => onTenantChange(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer py-1"
            >
              {allTenants.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                  {t.name} ({t.industry.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <NotificationPopover currentTenant={currentTenant} />

          <button
            onClick={fetchDashboardData}
            title="Refresh Live Data"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-6 py-2.5 text-xs text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Fatigue Index', icon: LayoutDashboard },
          { id: 'sla-queue', label: 'Safety SLA Queue', icon: ShieldAlert, badge: analytics?.summary?.openHazardTickets },
          { id: 'attendance', label: 'Attendance & Geofence Logs', icon: Clock },
          { id: 'complaint-heatmap', label: 'Anonymous Complaint Heatmap', icon: HeartHandshake },
          { id: 'quit-risk', label: 'Quit-Risk Predictor', icon: TrendingDown, badge: analytics?.summary?.highRiskTeams ? `${analytics.summary.highRiskTeams} High` : null },
          { id: 'skills-verify', label: 'Skill Passport Verification', icon: Award },
          { id: 'tenant-config', label: 'Industry Policies & Rules', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-sky-500 text-sky-400 bg-sky-950/20 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-950 text-rose-300 font-bold border border-rose-800">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Dashboard Content */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* ==================================================== */}
        {/* TAB 1: EXECUTIVE OVERVIEW & FATIGUE INDEX            */}
        {/* ==================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Active On-Site Turnout
                </span>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {analytics?.summary?.activeOnSite || 0}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    / {analytics?.summary?.totalWorkers || 0}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Real-time QR & GPS verified</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Safety Tickets Queue
                </span>
                <div className="text-2xl font-extrabold text-amber-400 font-mono">
                  {analytics?.summary?.openHazardTickets || 0}
                </div>
                <div className="text-[11px] text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{analytics?.summary?.slaBreaches || 0} Breaching 24h SLA</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  High Attrition Risk Teams
                </span>
                <div className="text-2xl font-extrabold text-rose-400 font-mono">
                  {analytics?.summary?.highRiskTeams || 0}
                </div>
                <div className="text-[11px] text-rose-300">
                  Rules engine quit-risk threshold &gt;55
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Industry Wage Policy
                </span>
                <div className="text-xl font-extrabold text-sky-400 capitalize">
                  {currentTenant.wageType} Wage
                </div>
                <div className="text-[11px] text-slate-400">
                  Std: {currentTenant.standardShiftHours}h • OT: {currentTenant.overtimeMultiplier}x
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 shadow-md">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Geofence Compliance
                </span>
                <div className="text-xl font-extrabold text-emerald-400 font-mono">
                  96.8%
                </div>
                <div className="text-[11px] text-slate-400">
                  Radius: {currentTenant.geofenceRadiusMeters}m site boundary
                </div>
              </div>
            </div>

            {/* Attendance Trends & Live Fatigue Alert Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 7-Day Attendance Bar Chart */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-200">
                      7-Day Workforce Turnout Trend
                    </h3>
                    <p className="text-xs text-slate-400">
                      Daily headcount check-ins across {currentTenant.name}
                    </p>
                  </div>
                  <span className="text-xs text-sky-400 font-medium">Daily Roster Audit</span>
                </div>

                <div className="h-48 flex items-end justify-between gap-3 pt-6 border-b border-slate-800 pb-2">
                  {analytics?.attendanceTrend?.map((item: any, idx: number) => {
                    const heightPercent = Math.max(15, Math.round((item.attendees / item.total) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {item.attendees}
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[36px] bg-gradient-to-t from-sky-600 to-indigo-500 rounded-t-lg transition-all hover:brightness-125"
                        />
                        <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fatigue Alerts Alert Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>SDG 8 Fatigue Guard</span>
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300">
                    Active
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Autonomous rule engine auditing &gt;48h weekly limits and back-to-back shift rest violations:
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-900/40 space-y-1">
                    <div className="flex items-center justify-between text-amber-300 font-semibold">
                      <span>Ramesh Kumar (Scaffolding)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400">
                        Overtime Warning
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Logged 52.5 hrs in rolling 7-day window. Exceeded 48h decent work statutory limit.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-900/40 space-y-1">
                    <div className="flex items-center justify-between text-rose-300 font-semibold">
                      <span>Sunita Devi (ICU Care)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400">
                        Back-to-Back Rest
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Rotated from night shift to morning triage with only 6 hrs rest (Hospital policy requires 11 hrs).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: SAFETY REPORT SLA QUEUE                      */}
        {/* ==================================================== */}
        {activeTab === 'sla-queue' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Hazard Reports SLA Priority Queue</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Workers can report without fear of retaliation. All reports track 4h / 12h / 24h SLA countdowns.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  {hazards.filter((h) => h.status !== 'RESOLVED').length} unresolved
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {hazards.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic bg-slate-900 rounded-2xl border border-slate-800">
                  No hazard tickets found for this organization.
                </div>
              ) : (
                hazards.map((h) => {
                  const isCritical = h.severity === 'CRITICAL';
                  const isResolved = h.status === 'RESOLVED';
                  const isAcknowledged = h.status === 'ACKNOWLEDGED';

                  return (
                    <div
                      key={h.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-100">{h.category}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                                isCritical
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : h.severity === 'HIGH'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-sky-950 text-sky-300 border border-sky-800'
                              }`}
                            >
                              {h.severity} SEVERITY
                            </span>
                            <span className="font-mono text-xs text-slate-500">#{h.id}</span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="flex items-center gap-1 text-slate-300">
                              <MapPin className="w-3 h-3 text-rose-400" />
                              {h.location_detail}
                            </span>
                            <span>•</span>
                            <span>Reported by: <strong className="text-slate-300">{h.reporter_name}</strong></span>
                            <span>•</span>
                            <span>Created: {new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                              isResolved
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : isAcknowledged
                                ? 'bg-sky-950 text-sky-300 border-sky-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            {h.status}
                          </span>

                          {!isResolved && (
                            <div className="flex items-center gap-1.5">
                              {h.status === 'OPEN' && (
                                <button
                                  onClick={() => handleUpdateHazardStatus(h.id, 'ACKNOWLEDGED')}
                                  disabled={updatingTicket}
                                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                                >
                                  Acknowledge
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedHazardForResolution(h)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                              >
                                Resolve Ticket
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description & Audio Transcript */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                            "{h.description}"
                          </p>

                          {h.audio_transcript && (
                            <div className="text-[11px] text-sky-300 bg-sky-950/40 p-2.5 rounded-lg border border-sky-900/40">
                              <strong>Voice Transcript:</strong> "{h.audio_transcript}"
                            </div>
                          )}

                          {h.resolution_notes && (
                            <div className="text-xs text-emerald-300 bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-900/50 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">Resolution Action Note:</span>
                                <span>{h.resolution_notes}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Photo attachment if any */}
                        {h.photo_url && (
                          <div className="rounded-xl overflow-hidden border border-slate-700 aspect-video max-h-36">
                            <img src={h.photo_url} alt="Hazard photo" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Modal: Resolve Hazard */}
        {selectedHazardForResolution && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Mark Hazard as Resolved</span>
              </h3>
              <p className="text-xs text-slate-400">
                Ticket: #{selectedHazardForResolution.id} • {selectedHazardForResolution.category}
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Corrective Action Taken & Safety Verification
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Scaffolding guardrails re-bolted and load-tested by site safety foreman Rajesh. Certified safe for workers."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedHazardForResolution(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatingTicket || !resolutionNotes.trim()}
                  onClick={() =>
                    handleUpdateHazardStatus(
                      selectedHazardForResolution.id,
                      'RESOLVED',
                      resolutionNotes
                    )
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {updatingTicket ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: ATTENDANCE & GEOFENCE LOGS                    */}
        {/* ==================================================== */}
        {activeTab === 'attendance' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>Real-Time Attendance & Geofenced Clock Logs</span>
                </h3>
                <p className="text-xs text-slate-400">
                  QR code attendance timestamps with geofence distance verification and overtime calculation.
                </p>
              </div>

              <span className="text-xs font-mono text-slate-400">{shifts.length} shift logs</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="py-2.5 px-3">Worker</th>
                    <th className="py-2.5 px-3">Department / Site</th>
                    <th className="py-2.5 px-3">Clock In</th>
                    <th className="py-2.5 px-3">Clock Out</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Overtime</th>
                    <th className="py-2.5 px-3">Geofence Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {shifts.slice(0, 15).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-950/40">
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {s.worker_name || 'Worker'}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {s.job_title}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{s.site_department}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {new Date(s.clock_in_time).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {s.clock_out_time
                          ? new Date(s.clock_out_time).toLocaleString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : <span className="text-emerald-400 font-bold">Active Shift</span>}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">
                        {s.duration_hours ? `${s.duration_hours}h` : 'In progress'}
                      </td>
                      <td className="py-3 px-3 font-mono text-amber-300 font-bold">
                        {Number(s.overtime_hours || 0) > 0 ? `+${s.overtime_hours}h OT` : '-'}
                      </td>
                      <td className="py-3 px-3">
                        {s.in_geofence ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified Inside</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Outside Geofence</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: ANONYMOUS COMPLAINT & SENTIMENT HEATMAP       */}
        {/* ==================================================== */}
        {activeTab === 'complaint-heatmap' && (
          <div className="space-y-6">
            {/* Zero-PII Shield Assurance Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-sky-400" />
                  <span>Anonymous Working Condition Heatmap & Honest Feedback</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Under FairShift's UN SDG 8 Decent Work privacy architecture, zero worker identity or device signatures are stored.
                  This ensures management gets true sentiment without fear of supervisory reprisal.
                </p>
              </div>

              <span className="shrink-0 px-3 py-1 bg-emerald-950 text-emerald-300 rounded-full text-xs font-bold border border-emerald-800">
                100% Identity Shield
              </span>
            </div>

            {/* Friction Heatmap by Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedbackData.heatmap.map((item, idx) => {
                const isHighFriction = item.frictionIndex > 40;
                return (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-slate-200">{item.category}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isHighFriction
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {item.frictionIndex}% Friction
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-extrabold font-mono text-slate-100">
                        {item.avgRating} <span className="text-xs text-slate-400">/ 5.0</span>
                      </div>
                      <span className="text-xs text-slate-400">{item.totalCount} anonymous ratings</span>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        style={{ width: `${Math.min(100, item.frictionIndex)}%` }}
                        className={`h-full ${
                          isHighFriction ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verbatim Anonymous Quotes */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Anonymous Submissions (Department Pool)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {feedbackData.feedback.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-semibold text-slate-300">{f.category}</span>
                      <span>Dept: {f.department}</span>
                    </div>
                    <p className="text-slate-200 italic">"{f.comment}"</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                      <span>Rating: {f.rating}/5 stars</span>
                      <span className="text-emerald-400 font-mono">Zero-PII Token Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: TEAM QUIT-RISK & ATTRITION PREDICTOR          */}
        {/* ==================================================== */}
        {activeTab === 'quit-risk' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span>Predictive Quit-Risk & Attrition Early Warning Engine</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Evaluates chronic overtime (&gt;48h/wk), fatigue alert density, negative sentiment spikes,
                  and unaddressed hazard SLA breaches to prevent sudden walkouts and talent churn.
                </p>
              </div>

              <span className="text-xs font-mono text-slate-400">
                Updated Live from Shift Logs
              </span>
            </div>

            <div className="space-y-3">
              {analytics?.teamRisks?.map((tr: QuitRiskData, idx: number) => {
                const tierColor =
                  tr.quitRisk.tier === 'CRITICAL'
                    ? 'bg-red-950 text-red-300 border-red-800'
                    : tr.quitRisk.tier === 'HIGH'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800';

                return (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-100">{tr.teamName}</h4>
                        <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                          <span>Team Size: <strong className="text-slate-200">{tr.workerCount} workers</strong></span>
                          <span>•</span>
                          <span>Avg Weekly: <strong className="text-slate-200">{tr.avgWeeklyHours} hrs</strong></span>
                          <span>•</span>
                          <span>Sentiment: <strong className="text-slate-200">{tr.sentimentRating} / 5.0</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Quit-Risk Index</span>
                          <span className="text-2xl font-extrabold font-mono text-slate-100">
                            {tr.quitRisk.score} <span className="text-xs font-normal text-slate-400">/ 100</span>
                          </span>
                        </div>

                        <span
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${tierColor}`}
                        >
                          {tr.quitRisk.tier} RISK
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Top Drivers */}
                      <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <span className="font-bold text-slate-300 block">Primary Risk Drivers:</span>
                        <ul className="space-y-1 text-slate-300">
                          {tr.quitRisk.topDrivers.map((driver, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-1.5">
                              <span className="text-rose-400">•</span>
                              <span>{driver}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Intervention Recommendations */}
                      <div className="space-y-1.5 bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/40">
                        <span className="font-bold text-emerald-300 block">Recommended Action:</span>
                        <ul className="space-y-1 text-emerald-200">
                          {tr.quitRisk.recommendations.map((rec, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 6: SKILL PASSPORT VERIFICATION                   */}
        {/* ==================================================== */}
        {activeTab === 'skills-verify' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-sky-400" />
                  <span>Skill Passport Employer Verification Portal</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Verify certifications and portable trades qualifications submitted by workers.
                </p>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {skillsList.filter((s) => !s.verified).length} pending audit
              </span>
            </div>

            <div className="space-y-3">
              {skillsList.map((sk) => (
                <div
                  key={sk.id}
                  className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{sk.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-800">
                        {sk.level}
                      </span>
                    </div>
                    <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                      <span>Issued by: <strong className="text-slate-300">{sk.issuing_body}</strong></span>
                      <span>•</span>
                      <span>Date: {sk.issued_date}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">{sk.credential_hash}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sk.verified ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verified by {sk.verified_by || 'Admin'}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVerifySkill(sk.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Audit & Stamp Verified</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 7: TENANT INDUSTRY POLICIES CONFIG               */}
        {/* ==================================================== */}
        {activeTab === 'tenant-config' && (
          <form
            onSubmit={handleSaveTenantPolicies}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6 max-w-2xl"
          >
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" />
                <span>Industry Workforce Configuration: {currentTenant.name}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure industry-specific overtime rates, fatigue limits, and geofencing boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Standard Daily Shift (Hours)
                </label>
                <input
                  type="number"
                  value={policyStdHours}
                  onChange={(e) => setPolicyStdHours(Number(e.target.value))}
                  min={4}
                  max={12}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Max Weekly Statutory Limit (Hours)
                </label>
                <input
                  type="number"
                  value={policyMaxWeekly}
                  onChange={(e) => setPolicyMaxWeekly(Number(e.target.value))}
                  min={36}
                  max={60}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Min Rest Gap Between Shifts (Hours)
                </label>
                <input
                  type="number"
                  value={policyMinRest}
                  onChange={(e) => setPolicyMinRest(Number(e.target.value))}
                  min={6}
                  max={16}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Overtime Pay Multiplier (e.g. 1.5x, 2.0x)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={policyOtMultiplier}
                  onChange={(e) => setPolicyOtMultiplier(Number(e.target.value))}
                  min={1.0}
                  max={3.0}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-300 block mb-1">
                  Site Geofence Radius (Meters)
                </label>
                <input
                  type="number"
                  value={policyGeofenceRadius}
                  onChange={(e) => setPolicyGeofenceRadius(Number(e.target.value))}
                  min={50}
                  max={2000}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPolicy}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
            >
              {savingPolicy ? 'Saving Changes...' : 'Save Tenant Policies'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
