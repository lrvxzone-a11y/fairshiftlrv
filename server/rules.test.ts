import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOvertimeAndPay,
  evaluateFatigueRules,
  calculateQuitRiskScore,
  isWithinGeofence,
  ShiftRecord,
} from './rules';

test('calculateOvertimeAndPay with daily wage (construction model)', () => {
  const result = calculateOvertimeAndPay(10, 600, {
    wageType: 'daily',
    standardShiftHours: 8,
    overtimeMultiplier: 1.5,
  });

  // Daily wage: 600 INR for 8 hrs => 75 INR/hr.
  // 10 hrs worked => 8 hrs regular (600 INR) + 2 hrs OT at 75*1.5 = 112.5 INR/hr => 225 INR OT.
  // Gross pay = 600 + 225 = 825.
  assert.equal(result.regularHours, 8);
  assert.equal(result.overtimeHours, 2);
  assert.equal(result.basePay, 600);
  assert.equal(result.overtimePay, 225);
  assert.equal(result.grossPay, 825);
  assert.equal(result.netPay, 825);
});

test('calculateOvertimeAndPay with hourly rate (healthcare model)', () => {
  const result = calculateOvertimeAndPay(
    12,
    150,
    {
      wageType: 'hourly',
      standardShiftHours: 8,
      overtimeMultiplier: 2.0,
    },
    200, // hazard / ICU bonus
    50 // canteen deduction
  );

  // 8 hrs * 150 = 1200 base.
  // 4 hrs OT * 150 * 2.0 = 1200 OT pay.
  // 1200 + 1200 + 200 = 2600 gross.
  // 2600 - 50 = 2550 net.
  assert.equal(result.regularHours, 8);
  assert.equal(result.overtimeHours, 4);
  assert.equal(result.basePay, 1200);
  assert.equal(result.overtimePay, 1200);
  assert.equal(result.grossPay, 2600);
  assert.equal(result.netPay, 2550);
});

test('evaluateFatigueRules detects back-to-back shifts with <10h rest', () => {
  const mockShifts: ShiftRecord[] = [
    {
      id: 's1',
      userId: 'u1',
      tenantId: 'citycare',
      clockInTime: '2026-10-20T08:00:00Z',
      clockOutTime: '2026-10-20T20:00:00Z', // Day shift ends 20:00
      status: 'completed',
      siteOrDepartment: 'ICU',
    },
    {
      id: 's2',
      userId: 'u1',
      tenantId: 'citycare',
      clockInTime: '2026-10-21T02:00:00Z', // Next shift starts only 6 hrs later at 02:00
      clockOutTime: '2026-10-21T10:00:00Z',
      status: 'completed',
      siteOrDepartment: 'ICU',
    },
  ];

  const alerts = evaluateFatigueRules(mockShifts, {
    maxWeeklyHours: 48,
    minRestHoursBetweenShifts: 10,
    maxConsecutiveDays: 6,
  });

  const b2b = alerts.find((a) => a.type === 'BACK_TO_BACK');
  assert.ok(b2b, 'Should flag back-to-back shift alert');
  assert.equal(b2b?.details.restHours, 6);
});

test('evaluateFatigueRules detects consecutive days without rest day', () => {
  const mockShifts: ShiftRecord[] = [];
  // 7 consecutive days
  for (let i = 1; i <= 7; i++) {
    const dayStr = i < 10 ? `0${i}` : `${i}`;
    mockShifts.push({
      id: `s-${i}`,
      userId: 'w1',
      tenantId: 'buildright',
      clockInTime: `2026-10-${dayStr}T08:00:00Z`,
      clockOutTime: `2026-10-${dayStr}T16:00:00Z`,
      status: 'completed',
      siteOrDepartment: 'Tower A',
    });
  }

  const alerts = evaluateFatigueRules(mockShifts, {
    maxWeeklyHours: 60,
    minRestHoursBetweenShifts: 8,
    maxConsecutiveDays: 6,
  });

  const restAlert = alerts.find((a) => a.type === 'NO_REST_DAY');
  assert.ok(restAlert, 'Should flag missing weekly rest day');
  assert.equal(restAlert?.details.consecutiveDays, 7);
});

test('calculateQuitRiskScore scores appropriately for high fatigue and poor sentiment', () => {
  const result = calculateQuitRiskScore({
    teamName: 'Scaffolding Unit 4',
    avgWeeklyHours: 58,
    fatigueAlertCount: 12,
    avgSentimentScore: 2.1,
    openHazardSlaBreachCount: 2,
    unresolvedComplaintsCount: 4,
    totalTeamWorkers: 8,
  });

  assert.equal(result.tier, 'CRITICAL');
  assert.ok(result.score >= 75);
  assert.ok(result.topDrivers.length >= 2);
  assert.ok(result.recommendations.length > 0);
});

test('isWithinGeofence validates worker distance accurately', () => {
  const site = { lat: 19.076, lng: 72.8777 }; // Mumbai construction site
  const nearbyWorker = { lat: 19.0762, lng: 72.8778 }; // ~25 meters away
  const farWorker = { lat: 19.09, lng: 72.9 }; // >1.5 km away

  const res1 = isWithinGeofence(nearbyWorker, site, 150);
  assert.equal(res1.inGeofence, true);
  assert.ok(res1.distanceMeters < 50);

  const res2 = isWithinGeofence(farWorker, site, 150);
  assert.equal(res2.inGeofence, false);
  assert.ok(res2.distanceMeters > 500);
});
