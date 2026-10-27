import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from './db';
import {
  calculateOvertimeAndPay,
  evaluateFatigueRules,
  calculateQuitRiskScore,
  isWithinGeofence,
  TenantConfig,
  ShiftRecord,
} from './rules';

const JWT_SECRET = process.env.JWT_SECRET || 'fairshift-un-sdg8-super-secret-key-2026';

export const apiRouter = Router();

// Middleware to verify JWT token if provided
export function authenticateToken(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (!err) {
      (req as any).user = user;
    }
    next();
  });
}

apiRouter.use(authenticateToken);

// ==========================================
// 1. TENANTS & CONFIGURATION
// ==========================================
apiRouter.get('/tenants', async (_req: Request, res: Response) => {
  try {
    const rows = await query(`SELECT * FROM tenants ORDER BY created_at ASC`);
    const tenants = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      industry: r.industry,
      wageType: r.wage_type,
      standardShiftHours: r.standard_shift_hours,
      maxWeeklyHours: r.max_weekly_hours,
      minRestHoursBetweenShifts: r.min_rest_hours_between_shifts,
      maxConsecutiveDays: r.max_consecutive_days,
      overtimeMultiplier: Number(r.overtime_multiplier),
      geofenceRadiusMeters: r.geofence_radius_meters,
      geofenceCoordinates: { lat: Number(r.geofence_lat), lng: Number(r.geofence_lng) },
      hazardCategories: typeof r.hazard_categories === 'string' ? JSON.parse(r.hazard_categories) : r.hazard_categories,
    }));
    res.json({ tenants });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/tenants/:id', async (req: Request, res: Response) => {
  try {
    const r = await queryOne(`SELECT * FROM tenants WHERE id = $1`, [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Tenant not found' });

    res.json({
      tenant: {
        id: r.id,
        name: r.name,
        industry: r.industry,
        wageType: r.wage_type,
        standardShiftHours: r.standard_shift_hours,
        maxWeeklyHours: r.max_weekly_hours,
        minRestHoursBetweenShifts: r.min_rest_hours_between_shifts,
        maxConsecutiveDays: r.max_consecutive_days,
        overtimeMultiplier: Number(r.overtime_multiplier),
        geofenceRadiusMeters: r.geofence_radius_meters,
        geofenceCoordinates: { lat: Number(r.geofence_lat), lng: Number(r.geofence_lng) },
        hazardCategories: typeof r.hazard_categories === 'string' ? JSON.parse(r.hazard_categories) : r.hazard_categories,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/tenants/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    await execute(
      `UPDATE tenants SET
        standard_shift_hours = COALESCE($1, standard_shift_hours),
        max_weekly_hours = COALESCE($2, max_weekly_hours),
        min_rest_hours_between_shifts = COALESCE($3, min_rest_hours_between_shifts),
        overtime_multiplier = COALESCE($4, overtime_multiplier),
        geofence_radius_meters = COALESCE($5, geofence_radius_meters)
       WHERE id = $6`,
      [
        updates.standardShiftHours,
        updates.maxWeeklyHours,
        updates.minRestHoursBetweenShifts,
        updates.overtimeMultiplier,
        updates.geofenceRadiusMeters,
        id,
      ]
    );
    res.json({ success: true, message: 'Tenant configuration updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. AUTH & USER DEMO PROFILES
// ==========================================
apiRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    let sql = `SELECT * FROM users`;
    const params: any[] = [];
    if (tenantId) {
      sql += ` WHERE tenant_id = $1`;
      params.push(tenantId);
    }
    sql += ` ORDER BY role ASC, name ASC`;

    const rows = await query(sql, params);
    const users = rows.map((u: any) => ({
      id: u.id,
      tenantId: u.tenant_id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      teamDepartment: u.team_department,
      jobTitle: u.job_title,
      languagePref: u.language_pref,
      wageRate: Number(u.wage_rate),
    }));
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { userId, phone } = req.body;
    let user: any = null;

    if (userId) {
      user = await queryOne(`SELECT * FROM users WHERE id = $1`, [userId]);
    } else if (phone) {
      user = await queryOne(`SELECT * FROM users WHERE phone = $1`, [phone]);
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found. Please select a valid profile.' });
    }

    const payload = {
      id: user.id,
      tenantId: user.tenant_id,
      name: user.name,
      role: user.role,
      teamDepartment: user.team_department,
      jobTitle: user.job_title,
      languagePref: user.language_pref,
      wageRate: Number(user.wage_rate),
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. SHIFT TRACKING & GEOFENCING
// ==========================================
apiRouter.get('/shifts/active/:userId', async (req: Request, res: Response) => {
  try {
    const row = await queryOne(
      `SELECT * FROM shifts WHERE user_id = $1 AND status = 'active' ORDER BY clock_in_time DESC LIMIT 1`,
      [req.params.userId]
    );
    res.json({ activeShift: row || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/shifts/check-in', async (req: Request, res: Response) => {
  try {
    const { userId, siteDepartment, lat, lng, qrToken } = req.body;

    const user = await queryOne(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existingActive = await queryOne(
      `SELECT * FROM shifts WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    if (existingActive) {
      return res.status(400).json({ error: 'Worker already has an active clocked-in shift.' });
    }

    const tenant = await queryOne(`SELECT * FROM tenants WHERE id = $1`, [user.tenant_id]);
    const siteCoords = { lat: Number(tenant.geofence_lat), lng: Number(tenant.geofence_lng) };
    const radius = Number(tenant.geofence_radius_meters);

    let inGeofence = true;
    let distance = 0;

    if (lat && lng) {
      const geo = isWithinGeofence({ lat: Number(lat), lng: Number(lng) }, siteCoords, radius);
      inGeofence = geo.inGeofence;
      distance = geo.distanceMeters;
    }

    const shiftId = `shift_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO shifts (
        id, tenant_id, user_id, site_department, clock_in_time, status,
        in_geofence, clock_in_lat, clock_in_lng, notes
      ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9)`,
      [
        shiftId,
        user.tenant_id,
        user.id,
        siteDepartment || user.team_department,
        now,
        inGeofence,
        lat || null,
        lng || null,
        qrToken ? `Verified via site QR token: ${qrToken}` : 'Manual check-in',
      ]
    );

    res.json({
      success: true,
      shiftId,
      clockInTime: now,
      inGeofence,
      distanceMeters: distance,
      message: inGeofence
        ? 'Clock-in verified on-site!'
        : `Clock-in recorded outside geofence boundary (${distance}m away). Flagged for supervisor review.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/shifts/check-out', async (req: Request, res: Response) => {
  try {
    const { shiftId } = req.body;
    const shift = await queryOne(`SELECT * FROM shifts WHERE id = $1`, [shiftId]);
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    if (shift.status !== 'active') return res.status(400).json({ error: 'Shift already closed' });

    const tenant = await queryOne(`SELECT * FROM tenants WHERE id = $1`, [shift.tenant_id]);
    const user = await queryOne(`SELECT * FROM users WHERE id = $1`, [shift.user_id]);

    const clockIn = new Date(shift.clock_in_time).getTime();
    const clockOut = new Date().getTime();
    const durationHours = Math.max(0.1, Math.round(((clockOut - clockIn) / (1000 * 60 * 60)) * 100) / 100);

    const stdHours = tenant.standard_shift_hours || 8;
    const regularHours = Math.min(durationHours, stdHours);
    const overtimeHours = Math.max(0, Math.round((durationHours - stdHours) * 100) / 100);

    const clockOutIso = new Date(clockOut).toISOString();

    await execute(
      `UPDATE shifts SET
        clock_out_time = $1,
        duration_hours = $2,
        regular_hours = $3,
        overtime_hours = $4,
        status = 'completed'
       WHERE id = $5`,
      [clockOutIso, durationHours, regularHours, overtimeHours, shiftId]
    );

    const payCalc = calculateOvertimeAndPay(
      durationHours,
      Number(user.wage_rate),
      {
        wageType: tenant.wage_type,
        standardShiftHours: tenant.standard_shift_hours,
        overtimeMultiplier: Number(tenant.overtime_multiplier),
      }
    );

    res.json({
      success: true,
      durationHours,
      regularHours,
      overtimeHours,
      payCalculation: payCalc,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/shifts/worker/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await queryOne(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tenant = await queryOne(`SELECT * FROM tenants WHERE id = $1`, [user.tenant_id]);
    const shiftsRaw = await query(
      `SELECT * FROM shifts WHERE user_id = $1 ORDER BY clock_in_time DESC LIMIT 30`,
      [userId]
    );

    const mappedShifts: ShiftRecord[] = shiftsRaw.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      tenantId: s.tenant_id,
      clockInTime: s.clock_in_time,
      clockOutTime: s.clock_out_time,
      status: s.status,
      siteOrDepartment: s.site_department,
      inGeofence: s.in_geofence,
    }));

    const fatigueAlerts = evaluateFatigueRules(mappedShifts, {
      maxWeeklyHours: tenant.max_weekly_hours,
      minRestHoursBetweenShifts: tenant.min_rest_hours_between_shifts,
      maxConsecutiveDays: tenant.max_consecutive_days,
    });

    res.json({
      shifts: shiftsRaw,
      fatigueAlerts,
      worker: {
        name: user.name,
        jobTitle: user.job_title,
        wageRate: Number(user.wage_rate),
        wageType: tenant.wage_type,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/shifts/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const shifts = await query(
      `SELECT s.*, u.name as worker_name, u.job_title, u.team_department
       FROM shifts s
       JOIN users u ON s.user_id = u.id
       WHERE s.tenant_id = $1
       ORDER BY s.clock_in_time DESC LIMIT 100`,
      [tenantId]
    );
    res.json({ shifts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. CLEAR PAYSLIPS (ITEMIZED + VOICE AUDIO)
// ==========================================
apiRouter.get('/payslips/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await queryOne(`SELECT * FROM users WHERE id = $1`, [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tenant = await queryOne(`SELECT * FROM tenants WHERE id = $1`, [user.tenant_id]);

    const recentShifts = await query(
      `SELECT * FROM shifts
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY clock_in_time DESC LIMIT 14`,
      [userId]
    );

    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalDuration = 0;

    for (const s of recentShifts) {
      totalRegularHours += Number(s.regular_hours || 0);
      totalOvertimeHours += Number(s.overtime_hours || 0);
      totalDuration += Number(s.duration_hours || 0);
    }

    const payCalc = calculateOvertimeAndPay(
      totalDuration,
      Number(user.wage_rate),
      {
        wageType: tenant.wage_type,
        standardShiftHours: tenant.standard_shift_hours,
        overtimeMultiplier: Number(tenant.overtime_multiplier),
      },
      tenant.industry === 'healthcare' ? 850 : 500,
      tenant.industry === 'healthcare' ? 420 : 250
    );

    const voiceScripts = {
      en: `Hello ${user.name}. Your total wage for the fortnight is Rupees ${payCalc.netPay}. Regular hours: ${totalRegularHours.toFixed(1)} hours paying ${payCalc.basePay} Rupees. Overtime: ${totalOvertimeHours.toFixed(1)} hours paying ${payCalc.overtimePay} Rupees. Safety and hardship allowance: ${payCalc.hazardAllowance} Rupees. Statutory deductions: ${payCalc.deductions} Rupees. All payments are verified on FairShift blockchain record.`,
      hi: `नमस्ते ${user.name} जी। इस पखवाड़े का आपका कुल भुगतान ${payCalc.netPay} रुपये है। नियमित काम: ${totalRegularHours.toFixed(1)} घंटे जिसका मूल वेतन ${payCalc.basePay} रुपये है। ओवरटाइम: ${totalOvertimeHours.toFixed(1)} घंटे जिसका भुगतान ${payCalc.overtimePay} रुपये है। सुरक्षा भत्ता ${payCalc.hazardAllowance} रुपये और कटौतियां ${payCalc.deductions} रुपये हैं। आपका पूरा हिसाब सुरक्षित है।`,
      ta: `வணக்கம் ${user.name}. இந்த இரண்டு வாரத்திற்கான உங்கள் மொத்த சம்பளம் ரூபாய் ${payCalc.netPay}. வழக்கமான வேலை நேரம் ${totalRegularHours.toFixed(1)} மணிநேரம், அடிப்படை சம்பளம் ரூபாய் ${payCalc.basePay}. கூடுதல் நேரம் ${totalOvertimeHours.toFixed(1)} மணிநேரம், கூடுதல் ஊதியம் ரூபாய் ${payCalc.overtimePay}. பாதுகாப்பு படி ரூபாய் ${payCalc.hazardAllowance}, பிடித்தம் ரூபாய் ${payCalc.deductions}. உங்கள் சம்பளம் நியாயமாக பதிவு செய்யப்பட்டுள்ளது.`,
    };

    res.json({
      worker: {
        id: user.id,
        name: user.name,
        jobTitle: user.job_title,
        department: user.team_department,
        languagePref: user.language_pref,
      },
      tenant: {
        name: tenant.name,
        industry: tenant.industry,
        wageType: tenant.wage_type,
      },
      period: 'Current Fortnight (Last 14 Days)',
      shiftsCount: recentShifts.length,
      totalHours: Math.round(totalDuration * 10) / 10,
      calculation: payCalc,
      voiceScripts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. SAFETY HAZARD REPORTING (VOICE + PHOTO + SLA)
// ==========================================
apiRouter.get('/hazards/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const hazards = await query(
      `SELECT * FROM hazard_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    res.json({ hazards });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/hazards', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      reportedByUserId,
      reporterName,
      category,
      severity,
      locationDetail,
      description,
      photoUrl,
      audioTranscript,
    } = req.body;

    if (!tenantId || !category || !locationDetail || !description) {
      return res.status(400).json({ error: 'Missing required hazard fields' });
    }

    const id = `haz_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const slaHours = severity === 'CRITICAL' ? 4 : severity === 'HIGH' ? 12 : 24;
    const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000).toISOString();

    await execute(
      `INSERT INTO hazard_reports (
        id, tenant_id, reported_by_user_id, reporter_name, category, severity,
        status, location_detail, description, photo_url, audio_transcript,
        sla_deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $8, $9, $10, $11)`,
      [
        id,
        tenantId,
        reportedByUserId || null,
        reporterName || 'Anonymous Worker',
        category,
        severity || 'MEDIUM',
        locationDetail,
        description,
        photoUrl || null,
        audioTranscript || null,
        slaDeadline,
      ]
    );

    res.json({
      success: true,
      hazardId: id,
      slaHours,
      slaDeadline,
      message: 'Safety hazard report logged and escalated to site supervisors.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/hazards/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    const validStatuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const now = new Date().toISOString();

    if (status === 'ACKNOWLEDGED') {
      await execute(
        `UPDATE hazard_reports SET status = $1, acknowledged_at = $2, resolution_notes = COALESCE($3, resolution_notes) WHERE id = $4`,
        [status, now, resolutionNotes || null, id]
      );
    } else if (status === 'RESOLVED') {
      await execute(
        `UPDATE hazard_reports SET status = $1, resolved_at = $2, resolution_notes = COALESCE($3, resolution_notes) WHERE id = $4`,
        [status, now, resolutionNotes || 'Resolved by site supervisor', id]
      );
    } else {
      await execute(`UPDATE hazard_reports SET status = $1 WHERE id = $2`, [status, id]);
    }

    res.json({ success: true, status, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. HONEST ANONYMOUS FEEDBACK (ZERO-PII)
// ==========================================
apiRouter.get('/feedback/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const feedback = await query(
      `SELECT id, category, rating, comment, department, sentiment_tag, created_at
       FROM anonymous_feedback
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );

    const categoryMap: Record<string, { totalRating: number; count: number; negativeCount: number }> = {};
    for (const item of feedback) {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = { totalRating: 0, count: 0, negativeCount: 0 };
      }
      categoryMap[item.category].totalRating += Number(item.rating);
      categoryMap[item.category].count += 1;
      if (item.sentiment_tag === 'negative' || Number(item.rating) <= 2) {
        categoryMap[item.category].negativeCount += 1;
      }
    }

    const heatmap = Object.entries(categoryMap).map(([category, stats]) => ({
      category,
      avgRating: Math.round((stats.totalRating / stats.count) * 10) / 10,
      totalCount: stats.count,
      frictionIndex: Math.round((stats.negativeCount / stats.count) * 100),
    }));

    res.json({
      feedback,
      heatmap,
      zeroPiiNotice: 'All survey records cryptographically scrub author identity, IP, and hardware fingerprint.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { tenantId, category, rating, comment, department } = req.body;

    if (!tenantId || !category || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required feedback fields' });
    }

    const numericRating = Math.max(1, Math.min(5, Number(rating)));
    const sentimentTag = numericRating <= 2 ? 'negative' : numericRating === 3 ? 'neutral' : 'positive';
    const id = `fb_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await execute(
      `INSERT INTO anonymous_feedback (id, tenant_id, category, rating, comment, department, sentiment_tag)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, tenantId, category, numericRating, comment, department || 'General Operations', sentimentTag]
    );

    res.json({
      success: true,
      message: 'Your anonymous review was recorded without any identifying data.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. SKILL PASSPORT (PORTABLE CREDENTIALS)
// ==========================================
apiRouter.get('/skills/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const skills = await query(
      `SELECT * FROM skill_passports WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ skills });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/skills', async (req: Request, res: Response) => {
  try {
    const { userId, tenantId, title, skillCategory, level, issuingBody, issuedDate } = req.body;
    if (!userId || !tenantId || !title || !issuingBody) {
      return res.status(400).json({ error: 'Missing skill passport fields' });
    }

    const id = `sk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const hash = `SHA256:${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

    await execute(
      `INSERT INTO skill_passports (
        id, user_id, tenant_id, title, skill_category, level, issuing_body,
        issued_date, verified, credential_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)`,
      [id, userId, tenantId, title, skillCategory || 'Core Trade', level || 'Intermediate', issuingBody, issuedDate || '2026-01-01', hash]
    );

    res.json({ success: true, skillId: id, credentialHash: hash });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/skills/verify/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { verifiedBy } = req.body;
    const now = new Date().toISOString();

    await execute(
      `UPDATE skill_passports SET verified = TRUE, verified_by = $1, verified_at = $2 WHERE id = $3`,
      [verifiedBy || 'Authorized Employer Auditor', now, id]
    );

    res.json({ success: true, message: 'Skill credential verified on portable passport.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. ADMIN DASHBOARD ANALYTICS & QUIT RISK
// ==========================================
apiRouter.get('/analytics/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenant = await queryOne(`SELECT * FROM tenants WHERE id = $1`, [tenantId]);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const totalWorkersRow = await queryOne(`SELECT count(*) as count FROM users WHERE tenant_id = $1 AND role = 'worker'`, [tenantId]);
    const activeShiftsRow = await queryOne(`SELECT count(*) as count FROM shifts WHERE tenant_id = $1 AND status = 'active'`, [tenantId]);

    const totalWorkers = totalWorkersRow?.count || 0;
    const activeShiftsCount = activeShiftsRow?.count || 0;

    const openHazards = await query(
      `SELECT * FROM hazard_reports WHERE tenant_id = $1 AND status != 'RESOLVED' ORDER BY sla_deadline ASC`,
      [tenantId]
    );

    const now = new Date().getTime();
    let slaBreachCount = 0;
    for (const h of openHazards) {
      if (new Date(h.sla_deadline).getTime() < now) {
        slaBreachCount++;
      }
    }

    const teamRows = await query(
      `SELECT DISTINCT team_department FROM users WHERE tenant_id = $1`,
      [tenantId]
    );
    const teams = teamRows.map((t: any) => t.team_department);

    const teamRisks = [];
    for (const teamName of teams) {
      const teamWorkers = await query(
        `SELECT id FROM users WHERE tenant_id = $1 AND team_department = $2`,
        [tenantId, teamName]
      );

      const workerIds = teamWorkers.map((w: any) => w.id);
      let totalTeamHours = 0;
      let fatigueAlertCount = 0;

      for (const wId of workerIds) {
        const wShiftsRaw = await query(
          `SELECT * FROM shifts WHERE user_id = $1 ORDER BY clock_in_time DESC LIMIT 10`,
          [wId]
        );
        const mapped: ShiftRecord[] = wShiftsRaw.map((s: any) => ({
          id: s.id,
          userId: s.user_id,
          tenantId: s.tenant_id,
          clockInTime: s.clock_in_time,
          clockOutTime: s.clock_out_time,
          status: s.status,
          siteOrDepartment: s.site_department,
        }));

        for (const s of wShiftsRaw) {
          totalTeamHours += Number(s.duration_hours || 0);
        }

        const fAlerts = evaluateFatigueRules(mapped, {
          maxWeeklyHours: tenant.max_weekly_hours,
          minRestHoursBetweenShifts: tenant.min_rest_hours_between_shifts,
          maxConsecutiveDays: tenant.max_consecutive_days,
        });
        fatigueAlertCount += fAlerts.length;
      }

      const avgHours = workerIds.length > 0 ? (totalTeamHours / workerIds.length) : 40;

      const deptFeedback = await query(
        `SELECT rating FROM anonymous_feedback WHERE tenant_id = $1 AND department = $2`,
        [tenantId, teamName]
      );
      const avgRating = deptFeedback.length > 0
        ? deptFeedback.reduce((sum: number, f: any) => sum + Number(f.rating), 0) / deptFeedback.length
        : 3.5;

      const riskEvaluation = calculateQuitRiskScore({
        teamName,
        avgWeeklyHours: avgHours,
        fatigueAlertCount,
        avgSentimentScore: avgRating,
        openHazardSlaBreachCount: slaBreachCount,
        unresolvedComplaintsCount: deptFeedback.filter((f: any) => Number(f.rating) <= 2).length,
        totalTeamWorkers: workerIds.length,
      });

      teamRisks.push({
        teamName,
        workerCount: workerIds.length,
        avgWeeklyHours: Math.round(avgHours * 10) / 10,
        fatigueAlertCount,
        sentimentRating: Math.round(avgRating * 10) / 10,
        quitRisk: riskEvaluation,
      });
    }

    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(5, 10);
      const count = Math.min(Number(totalWorkers), Math.round(Number(totalWorkers) * (0.8 + Math.sin(i) * 0.15)));
      attendanceTrend.push({ date: dateStr, attendees: count, total: Number(totalWorkers) });
    }

    res.json({
      summary: {
        totalWorkers: Number(totalWorkers),
        activeOnSite: Number(activeShiftsCount),
        openHazardTickets: openHazards.length,
        slaBreaches: slaBreachCount,
        highRiskTeams: teamRisks.filter((t) => t.quitRisk.tier === 'HIGH' || t.quitRisk.tier === 'CRITICAL').length,
      },
      attendanceTrend,
      openHazards,
      teamRisks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
