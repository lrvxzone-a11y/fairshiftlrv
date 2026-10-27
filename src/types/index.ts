export type Role = 'worker' | 'manager' | 'admin';
export type Language = 'en' | 'hi' | 'ta';

export interface Tenant {
  id: string;
  name: string;
  industry: 'construction' | 'healthcare' | 'manufacturing';
  wageType: 'daily' | 'hourly';
  standardShiftHours: number;
  maxWeeklyHours: number;
  minRestHoursBetweenShifts: number;
  maxConsecutiveDays: number;
  overtimeMultiplier: number;
  geofenceRadiusMeters: number;
  geofenceCoordinates: { lat: number; lng: number };
  hazardCategories: string[];
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: Role;
  teamDepartment: string;
  jobTitle: string;
  languagePref: Language;
  wageRate: number;
}

export interface Shift {
  id: string;
  tenant_id: string;
  user_id: string;
  site_department: string;
  clock_in_time: string;
  clock_out_time: string | null;
  duration_hours: number | null;
  regular_hours: number | null;
  overtime_hours: number | null;
  status: 'active' | 'completed' | 'cancelled';
  in_geofence: boolean;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  notes: string | null;
  worker_name?: string;
  job_title?: string;
  team_department?: string;
}

export interface HazardReport {
  id: string;
  tenant_id: string;
  reported_by_user_id: string | null;
  reporter_name: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  location_detail: string;
  description: string;
  photo_url: string | null;
  audio_transcript: string | null;
  resolution_notes: string | null;
  sla_deadline: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AnonymousFeedback {
  id: string;
  category: string;
  rating: number;
  comment: string;
  department: string;
  sentiment_tag: 'positive' | 'neutral' | 'negative';
  created_at: string;
}

export interface FeedbackHeatmapItem {
  category: string;
  avgRating: number;
  totalCount: number;
  frictionIndex: number;
}

export interface SkillCredential {
  id: string;
  user_id: string;
  tenant_id: string;
  title: string;
  skill_category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  issuing_body: string;
  issued_date: string;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  credential_hash: string;
}

export interface FatigueAlert {
  type: 'EXCESSIVE_HOURS' | 'BACK_TO_BACK' | 'NO_REST_DAY' | 'PROLONGED_SHIFT';
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  details: {
    hours?: number;
    threshold?: number;
    restHours?: number;
    consecutiveDays?: number;
  };
}

export interface PayslipData {
  worker: {
    id: string;
    name: string;
    jobTitle: string;
    department: string;
    languagePref: Language;
  };
  tenant: {
    name: string;
    industry: string;
    wageType: string;
  };
  period: string;
  shiftsCount: number;
  totalHours: number;
  calculation: {
    regularHours: number;
    overtimeHours: number;
    basePay: number;
    overtimePay: number;
    hazardAllowance: number;
    grossPay: number;
    deductions: number;
    netPay: number;
    currency: string;
  };
  voiceScripts: {
    en: string;
    hi: string;
    ta: string;
  };
}

export interface QuitRiskData {
  teamName: string;
  workerCount: number;
  avgWeeklyHours: number;
  fatigueAlertCount: number;
  sentimentRating: number;
  quitRisk: {
    score: number;
    tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    topDrivers: string[];
    recommendations: string[];
  };
}
