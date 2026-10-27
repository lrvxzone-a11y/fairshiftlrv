/**
 * FairShift - Core Workforce Logic & Decent Work Compliance Rules (UN SDG 8)
 * Decoupled pure functions for overtime, fatigue alerting, and quit-risk scoring.
 */

export interface TenantConfig {
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

export interface ShiftRecord {
  id: string;
  userId: string;
  tenantId: string;
  clockInTime: string; // ISO string
  clockOutTime: string | null; // ISO string
  status: 'active' | 'completed' | 'cancelled';
  siteOrDepartment: string;
  location?: { lat: number; lng: number };
  inGeofence?: boolean;
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

export interface PayCalculation {
  regularHours: number;
  overtimeHours: number;
  basePay: number;
  overtimePay: number;
  hazardAllowance: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  currency: string;
}

export interface TeamRiskMetrics {
  teamName: string;
  avgWeeklyHours: number;
  fatigueAlertCount: number;
  avgSentimentScore: number; // 1 (terrible) to 5 (excellent)
  openHazardSlaBreachCount: number;
  unresolvedComplaintsCount: number;
  totalTeamWorkers: number;
}

export interface QuitRiskResult {
  score: number; // 0 to 100
  tier: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  topDrivers: string[];
  recommendations: string[];
}

/**
 * Calculates hours between two ISO timestamp strings.
 */
export function getDurationHours(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const diffHours = (end - start) / (1000 * 60 * 60);
  return Math.max(0, Math.round(diffHours * 100) / 100);
}

/**
 * Calculates overtime and detailed pay slip breakdown according to tenant rules.
 */
export function calculateOvertimeAndPay(
  hoursWorked: number,
  baseRate: number, // hourly rate or daily wage rate
  config: Pick<TenantConfig, 'wageType' | 'standardShiftHours' | 'overtimeMultiplier'>,
  hazardBonus = 0,
  deductions = 0
): PayCalculation {
  const stdHours = config.standardShiftHours || 8;
  const regularHours = Math.min(hoursWorked, stdHours);
  const overtimeHours = Math.max(0, hoursWorked - stdHours);

  let basePay = 0;
  let overtimeRate = 0;

  if (config.wageType === 'daily') {
    // If daily wage, base pay is prorated or full day rate
    const hourlyEquivalent = baseRate / stdHours;
    basePay = regularHours >= stdHours ? baseRate : regularHours * hourlyEquivalent;
    overtimeRate = hourlyEquivalent * (config.overtimeMultiplier || 1.5);
  } else {
    basePay = regularHours * baseRate;
    overtimeRate = baseRate * (config.overtimeMultiplier || 1.5);
  }

  const overtimePay = Math.round(overtimeHours * overtimeRate * 100) / 100;
  basePay = Math.round(basePay * 100) / 100;
  const grossPay = Math.round((basePay + overtimePay + hazardBonus) * 100) / 100;
  const netPay = Math.max(0, Math.round((grossPay - deductions) * 100) / 100);

  return {
    regularHours,
    overtimeHours,
    basePay,
    overtimePay,
    hazardAllowance: hazardBonus,
    grossPay,
    deductions,
    netPay,
    currency: 'INR', // Indian Rupee standard for India/South Asia worker baseline
  };
}

/**
 * Evaluates shift records against fatigue & safety guidelines:
 * - >48 weekly hours
 * - Back-to-back shifts (rest < minRestHoursBetweenShifts)
 * - >6 consecutive days worked without a 24h rest
 * - Prolonged single shift (>12h)
 */
export function evaluateFatigueRules(
  shifts: ShiftRecord[],
  config: Pick<
    TenantConfig,
    'maxWeeklyHours' | 'minRestHoursBetweenShifts' | 'maxConsecutiveDays'
  >
): FatigueAlert[] {
  const alerts: FatigueAlert[] = [];
  if (!shifts || shifts.length === 0) return alerts;

  // Filter completed shifts and sort chronologically
  const validShifts = shifts
    .filter((s) => s.clockOutTime && s.status !== 'cancelled')
    .sort(
      (a, b) => new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime()
    );

  const maxWeeklyHours = config.maxWeeklyHours || 48;
  const minRestHours = config.minRestHoursBetweenShifts || 10;
  const maxConsecutiveDays = config.maxConsecutiveDays || 6;

  // 1. Check weekly hours (last 7 days window)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentShifts = validShifts.filter(
    (s) => new Date(s.clockInTime).getTime() >= sevenDaysAgo.getTime()
  );

  const totalRecentHours = recentShifts.reduce((acc, s) => {
    return acc + getDurationHours(s.clockInTime, s.clockOutTime!);
  }, 0);

  if (totalRecentHours > maxWeeklyHours) {
    alerts.push({
      type: 'EXCESSIVE_HOURS',
      severity: totalRecentHours > maxWeeklyHours + 12 ? 'CRITICAL' : 'WARNING',
      message: `Weekly hours exceeded (${totalRecentHours.toFixed(1)} hrs / max ${maxWeeklyHours} hrs)`,
      details: {
        hours: totalRecentHours,
        threshold: maxWeeklyHours,
      },
    });
  }

  // 2. Check for Back-to-Back Shifts (rest gap between shifts)
  for (let i = 0; i < validShifts.length - 1; i++) {
    const prevShift = validShifts[i];
    const nextShift = validShifts[i + 1];

    const prevEnd = new Date(prevShift.clockOutTime!).getTime();
    const nextStart = new Date(nextShift.clockInTime).getTime();
    const restHours = (nextStart - prevEnd) / (1000 * 60 * 60);

    if (restHours >= 0 && restHours < minRestHours) {
      alerts.push({
        type: 'BACK_TO_BACK',
        severity: restHours < 8 ? 'CRITICAL' : 'WARNING',
        message: `Back-to-back shift violation: only ${restHours.toFixed(1)} hrs rest between shifts (required: ${minRestHours} hrs)`,
        details: {
          restHours: Math.round(restHours * 10) / 10,
          threshold: minRestHours,
        },
      });
      break; // report earliest prominent breach
    }
  }

  // 3. Check for consecutive days without rest
  const uniqueDates = new Set(
    validShifts.map((s) => new Date(s.clockInTime).toISOString().slice(0, 10))
  );
  const sortedDates = Array.from(uniqueDates).sort();

  let maxStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]).getTime();
    const curr = new Date(sortedDates[i]).getTime();
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 1;
    }
  }

  if (maxStreak > maxConsecutiveDays) {
    alerts.push({
      type: 'NO_REST_DAY',
      severity: maxStreak >= 10 ? 'CRITICAL' : 'WARNING',
      message: `Worker worked ${maxStreak} consecutive days without a mandatory 24h rest day (limit: ${maxConsecutiveDays} days)`,
      details: {
        consecutiveDays: maxStreak,
        threshold: maxConsecutiveDays,
      },
    });
  }

  // 4. Single shift exceeding 12 hours
  const prolonged = validShifts.find(
    (s) => getDurationHours(s.clockInTime, s.clockOutTime!) > 12
  );
  if (prolonged) {
    const dur = getDurationHours(prolonged.clockInTime, prolonged.clockOutTime!);
    alerts.push({
      type: 'PROLONGED_SHIFT',
      severity: 'CRITICAL',
      message: `Single prolonged shift detected: ${dur.toFixed(1)} continuous hours`,
      details: {
        hours: dur,
        threshold: 12,
      },
    });
  }

  return alerts;
}

/**
 * Calculates Quit-Risk (Attrition Risk) score (0-100) per team based on
 * objective labor indicators:
 * - Overwork factor (average weekly hours > 48)
 * - Fatigue alert density
 * - Negative sentiment score in anonymous reviews (sentiment < 3.0)
 * - Unresolved hazard/safety complaints exceeding SLA
 */
export function calculateQuitRiskScore(metrics: TeamRiskMetrics): QuitRiskResult {
  let score = 20; // baseline low risk
  const topDrivers: string[] = [];
  const recommendations: string[] = [];

  // Overtime burden impact
  if (metrics.avgWeeklyHours > 54) {
    score += 30;
    topDrivers.push(`Chronic overtime: team averages ${metrics.avgWeeklyHours.toFixed(1)} hrs/week`);
    recommendations.push('Cap additional shifts and recruit supplemental temporary staffing');
  } else if (metrics.avgWeeklyHours > 48) {
    score += 15;
    topDrivers.push(`Elevated work hours (${metrics.avgWeeklyHours.toFixed(1)} hrs/week)`);
    recommendations.push('Rotate overtime assignments equitably among team members');
  }

  // Fatigue alert density
  const alertsPerWorker =
    metrics.totalTeamWorkers > 0
      ? metrics.fatigueAlertCount / metrics.totalTeamWorkers
      : 0;

  if (alertsPerWorker >= 1.5) {
    score += 25;
    topDrivers.push('Severe fatigue frequency (multiple back-to-back shift alerts)');
    recommendations.push('Enforce minimum 11-hour mandatory recovery gap between rotations');
  } else if (alertsPerWorker > 0.5) {
    score += 15;
    topDrivers.push('Notable fatigue alerts logged in past fortnight');
  }

  // Sentiment score (1.0 to 5.0)
  if (metrics.avgSentimentScore < 2.5) {
    score += 25;
    topDrivers.push(`Very low anonymous morale score (${metrics.avgSentimentScore.toFixed(1)}/5.0)`);
    recommendations.push('Review anonymous management feedback; address worker supervisory friction');
  } else if (metrics.avgSentimentScore < 3.2) {
    score += 12;
    topDrivers.push(`Sub-optimal team satisfaction rating (${metrics.avgSentimentScore.toFixed(1)}/5.0)`);
  }

  // Safety & SLA breaches
  if (metrics.openHazardSlaBreachCount > 0) {
    score += 15;
    topDrivers.push(`${metrics.openHazardSlaBreachCount} safety hazard tickets overdue past 24h SLA`);
    recommendations.push('Immediately escalate and resolve pending hazard tickets with site safety lead');
  }

  // Normalize score between 5 and 100
  score = Math.min(100, Math.max(5, Math.round(score)));

  let tier: QuitRiskResult['tier'] = 'LOW';
  if (score >= 75) tier = 'CRITICAL';
  else if (score >= 55) tier = 'HIGH';
  else if (score >= 35) tier = 'MODERATE';

  if (recommendations.length === 0) {
    recommendations.push('Maintain current balanced shift scheduling and monthly safety audits');
  }

  return {
    score,
    tier,
    topDrivers,
    recommendations,
  };
}

/**
 * Validates whether GPS coordinates fall within tenant site geofence radius.
 */
export function isWithinGeofence(
  workerLoc: { lat: number; lng: number },
  siteLoc: { lat: number; lng: number },
  radiusMeters: number
): { inGeofence: boolean; distanceMeters: number } {
  // Haversine formula
  const R = 6371e3; // metres
  const phi1 = (workerLoc.lat * Math.PI) / 180;
  const phi2 = (siteLoc.lat * Math.PI) / 180;
  const deltaPhi = ((siteLoc.lat - workerLoc.lat) * Math.PI) / 180;
  const deltaLambda = ((siteLoc.lng - workerLoc.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = Math.round(R * c);

  return {
    inGeofence: distance <= radiusMeters,
    distanceMeters: distance,
  };
}
