import { newDb } from 'pg-mem';
import { TenantConfig } from './rules';

// Initialize in-memory PostgreSQL instance
export const memDb = newDb();
const pg = memDb.adapters.createPg();
export const dbClient = new pg.Client();

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await dbClient.query(sql, params);
  return res.rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  await dbClient.query(sql, params);
}

// Setup schema
export async function initDatabase() {
  await dbClient.connect();

  await dbClient.query(`
    CREATE TABLE tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      wage_type TEXT NOT NULL,
      standard_shift_hours INT NOT NULL,
      max_weekly_hours INT NOT NULL,
      min_rest_hours_between_shifts INT NOT NULL,
      max_consecutive_days INT NOT NULL,
      overtime_multiplier NUMERIC NOT NULL,
      geofence_radius_meters INT NOT NULL,
      geofence_lat NUMERIC NOT NULL,
      geofence_lng NUMERIC NOT NULL,
      hazard_categories JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL,
      team_department TEXT NOT NULL,
      job_title TEXT NOT NULL,
      language_pref TEXT NOT NULL DEFAULT 'en',
      wage_rate NUMERIC NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE shifts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      site_department TEXT NOT NULL,
      clock_in_time TIMESTAMP NOT NULL,
      clock_out_time TIMESTAMP,
      duration_hours NUMERIC,
      regular_hours NUMERIC,
      overtime_hours NUMERIC,
      status TEXT NOT NULL,
      in_geofence BOOLEAN DEFAULT TRUE,
      clock_in_lat NUMERIC,
      clock_in_lng NUMERIC,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE hazard_reports (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      reported_by_user_id TEXT,
      reporter_name TEXT,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      location_detail TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_url TEXT,
      audio_transcript TEXT,
      resolution_notes TEXT,
      sla_deadline TIMESTAMP NOT NULL,
      acknowledged_at TIMESTAMP,
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE anonymous_feedback (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      category TEXT NOT NULL,
      rating INT NOT NULL,
      comment TEXT NOT NULL,
      department TEXT NOT NULL,
      sentiment_tag TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE skill_passports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      title TEXT NOT NULL,
      skill_category TEXT NOT NULL,
      level TEXT NOT NULL,
      issuing_body TEXT NOT NULL,
      issued_date DATE NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      verified_by TEXT,
      verified_at TIMESTAMP,
      credential_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('PostgreSQL schema initialized in pg-mem');

  // Seed Tenants
  const tenants: TenantConfig[] = [
    {
      id: 'buildright',
      name: 'BuildRight Construction (Tower 4 Site)',
      industry: 'construction',
      wageType: 'daily',
      standardShiftHours: 8,
      maxWeeklyHours: 48,
      minRestHoursBetweenShifts: 10,
      maxConsecutiveDays: 6,
      overtimeMultiplier: 1.5,
      geofenceRadiusMeters: 300,
      geofenceCoordinates: { lat: 19.076, lng: 72.8777 },
      hazardCategories: [
        'Scaffolding & Heights',
        'Electrical Safety',
        'PPE Compliance',
        'Heavy Machinery',
        'Excavation / Cave-in',
        'Heat Stress',
      ],
    },
    {
      id: 'citycare',
      name: 'CityCare General Hospital',
      industry: 'healthcare',
      wageType: 'hourly',
      standardShiftHours: 8,
      maxWeeklyHours: 44,
      minRestHoursBetweenShifts: 11,
      maxConsecutiveDays: 5,
      overtimeMultiplier: 2.0,
      geofenceRadiusMeters: 200,
      geofenceCoordinates: { lat: 12.9716, lng: 77.5946 },
      hazardCategories: [
        'Sanitation & Biohazard',
        'Sharps & Needlestick',
        'Chemical Disinfection',
        'Patient / Visitor Violence',
        'PPE Shortage',
        'Ergonomic Strain / Lifting',
      ],
    },
  ];

  for (const t of tenants) {
    await dbClient.query(
      `INSERT INTO tenants (
        id, name, industry, wage_type, standard_shift_hours, max_weekly_hours,
        min_rest_hours_between_shifts, max_consecutive_days, overtime_multiplier,
        geofence_radius_meters, geofence_lat, geofence_lng, hazard_categories
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        t.id,
        t.name,
        t.industry,
        t.wageType,
        t.standardShiftHours,
        t.maxWeeklyHours,
        t.minRestHoursBetweenShifts,
        t.maxConsecutiveDays,
        t.overtimeMultiplier,
        t.geofenceRadiusMeters,
        t.geofenceCoordinates.lat,
        t.geofenceCoordinates.lng,
        JSON.stringify(t.hazardCategories),
      ]
    );
  }

  // Seed Users
  const usersList = [
    // BuildRight Construction Staff
    { id: 'u_br_admin', tenantId: 'buildright', name: 'Vikram Rao', phone: '+91 98200 11001', role: 'admin', team: 'Management', title: 'Site Operations Director', lang: 'en', wage: 1200 },
    { id: 'u_br_mgr', tenantId: 'buildright', name: 'Rajesh Sharma', phone: '+91 98200 11002', role: 'manager', team: 'Scaffolding Unit', title: 'Site Supervisor', lang: 'hi', wage: 850 },
    { id: 'u_br_w1', tenantId: 'buildright', name: 'Ramesh Kumar', phone: '+91 98200 22001', role: 'worker', team: 'Scaffolding Unit', title: 'Senior Scaffolder', lang: 'hi', wage: 650 },
    { id: 'u_br_w2', tenantId: 'buildright', name: 'Muthu Selvan', phone: '+91 98200 22002', role: 'worker', team: 'Electrical Team', title: 'Site Electrician', lang: 'ta', wage: 700 },
    { id: 'u_br_w3', tenantId: 'buildright', name: 'Dinesh Yadav', phone: '+91 98200 22003', role: 'worker', team: 'Scaffolding Unit', title: 'Rigger / Erector', lang: 'hi', wage: 600 },
    { id: 'u_br_w4', tenantId: 'buildright', name: 'Karthik Raja', phone: '+91 98200 22004', role: 'worker', team: 'Masonry Crew', title: 'Lead Mason', lang: 'ta', wage: 650 },
    { id: 'u_br_w5', tenantId: 'buildright', name: 'Sunil Paswan', phone: '+91 98200 22005', role: 'worker', team: 'Earthworks', title: 'Excavator Operator', lang: 'hi', wage: 750 },
    { id: 'u_br_w6', tenantId: 'buildright', name: 'Anil Chauhan', phone: '+91 98200 22006', role: 'worker', team: 'Scaffolding Unit', title: 'Scaffolder Assistant', lang: 'hi', wage: 550 },
    { id: 'u_br_w7', tenantId: 'buildright', name: 'Gopal Verma', phone: '+91 98200 22007', role: 'worker', team: 'Steel Fixing', title: 'Bar Bender & Fixer', lang: 'hi', wage: 620 },
    { id: 'u_br_w8', tenantId: 'buildright', name: 'Murugan Pandian', phone: '+91 98200 22008', role: 'worker', team: 'Safety & PPE', title: 'Marshall / Signaller', lang: 'ta', wage: 580 },
    { id: 'u_br_w9', tenantId: 'buildright', name: 'Deepak Sahni', phone: '+91 98200 22009', role: 'worker', team: 'Masonry Crew', title: 'Concrete Finisher', lang: 'hi', wage: 600 },
    { id: 'u_br_w10', tenantId: 'buildright', name: 'Sanjay Rawat', phone: '+91 98200 22010', role: 'worker', team: 'Electrical Team', title: 'Assistant Lineman', lang: 'en', wage: 620 },
    { id: 'u_br_w11', tenantId: 'buildright', name: 'Arun Mozhi', phone: '+91 98200 22011', role: 'worker', team: 'Steel Fixing', title: 'Welder Grade 1', lang: 'ta', wage: 720 },
    { id: 'u_br_w12', tenantId: 'buildright', name: 'Suraj Mandal', phone: '+91 98200 22012', role: 'worker', team: 'Earthworks', title: 'Site Helper', lang: 'hi', wage: 500 },
    { id: 'u_br_w13', tenantId: 'buildright', name: 'Praveen Tiwari', phone: '+91 98200 22013', role: 'worker', team: 'Scaffolding Unit', title: 'Scaffold Inspector', lang: 'hi', wage: 700 },
    { id: 'u_br_w14', tenantId: 'buildright', name: 'Vetrivelan S', phone: '+91 98200 22014', role: 'worker', team: 'Safety & PPE', title: 'Traffic Controller', lang: 'ta', wage: 550 },
    { id: 'u_br_w15', tenantId: 'buildright', name: 'Hari Om Bind', phone: '+91 98200 22015', role: 'worker', team: 'Masonry Crew', title: 'Tile Layer', lang: 'hi', wage: 640 },

    // CityCare Hospital Staff
    { id: 'u_cc_admin', tenantId: 'citycare', name: 'Dr. Anita Sen', phone: '+91 98450 33001', role: 'admin', team: 'Hospital Administration', title: 'Chief Medical Officer', lang: 'en', wage: 350 },
    { id: 'u_cc_mgr', tenantId: 'citycare', name: 'Sister Mary Joseph', phone: '+91 98450 33002', role: 'manager', team: 'ICU & Emergency', title: 'Nursing Superintendent', lang: 'en', wage: 240 },
    { id: 'u_cc_w1', tenantId: 'citycare', name: 'Sunita Devi', phone: '+91 98450 44001', role: 'worker', team: 'ICU & Emergency', title: 'Senior Staff Nurse', lang: 'hi', wage: 175 },
    { id: 'u_cc_w2', tenantId: 'citycare', name: 'Kavitha Raman', phone: '+91 98450 44002', role: 'worker', team: 'Sanitation & Hygiene', title: 'Sanitation Lead', lang: 'ta', wage: 130 },
    { id: 'u_cc_w3', tenantId: 'citycare', name: 'Pooja Nair', phone: '+91 98450 44003', role: 'worker', team: 'ICU & Emergency', title: 'Critical Care Nurse', lang: 'en', wage: 180 },
    { id: 'u_cc_w4', tenantId: 'citycare', name: 'Meena Kumari', phone: '+91 98450 44004', role: 'worker', team: 'General Ward B', title: 'Staff Nurse', lang: 'hi', wage: 160 },
    { id: 'u_cc_w5', tenantId: 'citycare', name: 'Vasantha Lakshmi', phone: '+91 98450 44005', role: 'worker', team: 'Sanitation & Hygiene', title: 'Infection Control Tech', lang: 'ta', wage: 140 },
    { id: 'u_cc_w6', tenantId: 'citycare', name: 'Amitabh Roy', phone: '+91 98450 44006', role: 'worker', team: 'Trauma Care', title: 'Emergency EMT', lang: 'hi', wage: 170 },
    { id: 'u_cc_w7', tenantId: 'citycare', name: 'Shanthi Priya', phone: '+91 98450 44007', role: 'worker', team: 'General Ward B', title: 'Assistant Nurse (ANM)', lang: 'ta', wage: 145 },
    { id: 'u_cc_w8', tenantId: 'citycare', name: 'Rosamma Mathew', phone: '+91 98450 44008', role: 'worker', team: 'ICU & Emergency', title: 'Night Shift Specialist', lang: 'en', wage: 190 },
    { id: 'u_cc_w9', tenantId: 'citycare', name: 'Kiran Bala', phone: '+91 98450 44009', role: 'worker', team: 'Sanitation & Hygiene', title: 'Waste Management Tech', lang: 'hi', wage: 130 },
    { id: 'u_cc_w10', tenantId: 'citycare', name: 'Thirunavukkarasu G', phone: '+91 98450 44010', role: 'worker', team: 'Radiology & Labs', title: 'Lab Attendant', lang: 'ta', wage: 150 },
    { id: 'u_cc_w11', tenantId: 'citycare', name: 'Geeta Mahajan', phone: '+91 98450 44011', role: 'worker', team: 'Trauma Care', title: 'Staff Nurse', lang: 'hi', wage: 165 },
    { id: 'u_cc_w12', tenantId: 'citycare', name: 'Anbu Selvi', phone: '+91 98450 44012', role: 'worker', team: 'General Ward B', title: 'Patient Transport Orderly', lang: 'ta', wage: 125 },
    { id: 'u_cc_w13', tenantId: 'citycare', name: 'Manoj Pillai', phone: '+91 98450 44013', role: 'worker', team: 'ICU & Emergency', title: 'Respiratory Therapist Asst', lang: 'en', wage: 185 },
    { id: 'u_cc_w14', tenantId: 'citycare', name: 'Rekha Choudhary', phone: '+91 98450 44014', role: 'worker', team: 'Sanitation & Hygiene', title: 'Housekeeping Aide', lang: 'hi', wage: 120 },
    { id: 'u_cc_w15', tenantId: 'citycare', name: 'Sowmya Krishnan', phone: '+91 98450 44015', role: 'worker', team: 'General Ward B', title: 'Staff Nurse', lang: 'ta', wage: 160 },
  ];

  for (const u of usersList) {
    await dbClient.query(
      `INSERT INTO users (id, tenant_id, name, phone, role, team_department, job_title, language_pref, wage_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [u.id, u.tenantId, u.name, u.phone, u.role, u.team, u.title, u.lang, u.wage]
    );
  }

  // Seed Shifts (2 Weeks of Shifts)
  const now = new Date();
  const shiftSeeds: any[] = [];

  // Shifts for Ramesh Kumar (u_br_w1)
  for (let d = 13; d >= 1; d--) {
    const shiftDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = shiftDate.toISOString().slice(0, 10);
    const isOvertimeDay = d % 3 === 0;
    const dur = isOvertimeDay ? 11 : 8.5;
    const inTime = `${dateStr}T08:00:00Z`;
    const outTime = `${dateStr}T${8 + Math.floor(dur)}:${Math.floor((dur % 1) * 60).toString().padStart(2, '0')}:00Z`;

    shiftSeeds.push({
      id: `shift_br_w1_${d}`,
      tenantId: 'buildright',
      userId: 'u_br_w1',
      dept: 'Tower 4 Scaffolding',
      inTime,
      outTime,
      dur,
      reg: 8,
      ot: Math.max(0, dur - 8),
      status: 'completed',
      inGeofence: true,
      notes: isOvertimeDay ? 'Emergency pour scaffold tie-in' : 'Standard daily shift',
    });
  }

  // Active shift for Ramesh today
  shiftSeeds.push({
    id: 'shift_br_w1_today',
    tenantId: 'buildright',
    userId: 'u_br_w1',
    dept: 'Tower 4 Scaffolding',
    inTime: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    outTime: null,
    dur: null,
    reg: null,
    ot: null,
    status: 'active',
    inGeofence: true,
    notes: 'In progress - 4th tier scaffold inspection',
  });

  // Shifts for Sunita Devi (u_cc_w1)
  for (let d = 10; d >= 1; d--) {
    const shiftDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateStr = shiftDate.toISOString().slice(0, 10);
    const dur = d === 2 ? 12 : 8;
    const inTime = `${dateStr}T07:00:00Z`;
    const outTime = `${dateStr}T${7 + Math.floor(dur)}:00:00Z`;

    shiftSeeds.push({
      id: `shift_cc_w1_${d}`,
      tenantId: 'citycare',
      userId: 'u_cc_w1',
      dept: 'Intensive Care Unit (ICU)',
      inTime,
      outTime,
      dur,
      reg: 8,
      ot: Math.max(0, dur - 8),
      status: 'completed',
      inGeofence: true,
      notes: d === 2 ? 'Covered emergency evening rotation' : 'Day roster',
    });
  }

  // Active shift for Sunita Devi today
  shiftSeeds.push({
    id: 'shift_cc_w1_today',
    tenantId: 'citycare',
    userId: 'u_cc_w1',
    dept: 'Intensive Care Unit (ICU)',
    inTime: new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(),
    outTime: null,
    dur: null,
    reg: null,
    ot: null,
    status: 'active',
    inGeofence: true,
    notes: 'Ventilator ward monitoring',
  });

  // Shifts for other workers
  const otherWorkers = [
    'u_br_w2', 'u_br_w3', 'u_br_w4', 'u_br_w5', 'u_br_w6', 'u_br_w7', 'u_br_w8',
    'u_cc_w2', 'u_cc_w3', 'u_cc_w4', 'u_cc_w5', 'u_cc_w6', 'u_cc_w7', 'u_cc_w8'
  ];
  let idGen = 100;
  for (const wId of otherWorkers) {
    const isBr = wId.startsWith('u_br');
    const tenantId = isBr ? 'buildright' : 'citycare';
    const dept = isBr ? 'Construction Site' : 'Hospital Wing';

    for (let day = 7; day >= 1; day--) {
      const shiftDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
      const dateStr = shiftDate.toISOString().slice(0, 10);
      const hours = 8 + (day % 2 === 0 ? 2 : 0);

      shiftSeeds.push({
        id: `shift_gen_${idGen++}`,
        tenantId,
        userId: wId,
        dept,
        inTime: `${dateStr}T08:00:00Z`,
        outTime: `${dateStr}T${8 + hours}:00:00Z`,
        dur: hours,
        reg: 8,
        ot: hours - 8,
        status: 'completed',
        inGeofence: true,
        notes: 'Routine scheduled roster',
      });
    }
  }

  for (const s of shiftSeeds) {
    await dbClient.query(
      `INSERT INTO shifts (
        id, tenant_id, user_id, site_department, clock_in_time, clock_out_time,
        duration_hours, regular_hours, overtime_hours, status, in_geofence, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [s.id, s.tenantId, s.userId, s.dept, s.inTime, s.outTime, s.dur, s.reg, s.ot, s.status, s.inGeofence, s.notes]
    );
  }

  // Seed Hazard Reports
  const hazards = [
    {
      id: 'haz_br_1',
      tenantId: 'buildright',
      userId: 'u_br_w1',
      name: 'Ramesh Kumar',
      category: 'Scaffolding & Heights',
      severity: 'CRITICAL',
      status: 'OPEN',
      location: 'Block C, 5th Floor External Periphery',
      desc: 'Loose guardrails and missing toe boards on the outer staging. Wind speed is rising and workers are at slip risk.',
      photo: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=600&auto=format&fit=crop&q=80',
      transcript: 'ब्लॉक सी के पांचवें माले पर पाड़ का किनारा ढीला है, हवा बहुत तेज चल रही है, कभी भी हादसा हो सकता है।',
      slaHours: 4,
      resNotes: null,
    },
    {
      id: 'haz_br_2',
      tenantId: 'buildright',
      userId: 'u_br_w2',
      name: 'Muthu Selvan',
      category: 'Electrical Safety',
      severity: 'HIGH',
      status: 'ACKNOWLEDGED',
      location: 'Basement Pumping Station & Distribution Board',
      desc: 'Temporary power cabling lying in pooled puddle water near main dewatering pump.',
      photo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      transcript: 'மெயின் பம்ப் பக்கத்தில் தண்ணீர் தேங்கியுள்ளது, கரண்ட் ஒயர் தண்ணீரில் கிடக்கிறது. உடனே சரிசெய்ய வேண்டும்.',
      slaHours: 12,
      resNotes: 'Assigned to site electrical foreman Rajesh to isolate switchboard and suspend overhead cabling.',
    },
    {
      id: 'haz_br_3',
      tenantId: 'buildright',
      userId: 'u_br_w8',
      name: 'Murugan Pandian',
      category: 'PPE Compliance',
      severity: 'MEDIUM',
      status: 'RESOLVED',
      location: 'Ground Floor Material Unloading Bay',
      desc: 'Subcontractor truck drivers entered unloading zone without safety helmets and high-visibility vests.',
      photo: null,
      transcript: 'ஹெல்மெட் இல்லாமல் லாரி டிரைவர்கள் இறக்கும் இடத்திற்குள் நுழைகிறார்கள்.',
      slaHours: 24,
      resNotes: 'Security gate barrier instructed to deny entry without mandatory PPE kit issued at main checkpoint.',
    },
    {
      id: 'haz_cc_1',
      tenantId: 'citycare',
      userId: 'u_cc_w1',
      name: 'Sunita Devi',
      category: 'Sanitation & Biohazard',
      severity: 'CRITICAL',
      status: 'OPEN',
      location: 'ICU Isolation Ward Corridor 3',
      desc: 'Overflowing yellow biohazard waste bin with contaminated drip tubing. Leakage observed on floor tile.',
      photo: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
      transcript: 'आईसीयू वार्ड के बाहर पीला बायोमेडिकल कचरा डिब्बा भर चुका है, फर्श पर रिसाव हो रहा है। संक्रमण का खतरा है।',
      slaHours: 2,
      resNotes: null,
    },
    {
      id: 'haz_cc_2',
      tenantId: 'citycare',
      userId: 'u_cc_w2',
      name: 'Kavitha Raman',
      category: 'Sharps & Needlestick',
      severity: 'HIGH',
      status: 'ACKNOWLEDGED',
      location: 'Emergency Triage Room 2',
      desc: 'Puncture-proof needle destroyer machine malfunctioned; loose capped syringe barrels left on tray.',
      photo: null,
      transcript: 'நீடில் கட்டர் மிஷின் பழுதடைந்துள்ளது, தட்டில் ஊசிகள் பாதுகாப்பற்ற முறையில் உள்ளன.',
      slaHours: 6,
      resNotes: 'Biomedical engineering department alerted for rapid replacement unit.',
    },
  ];

  for (const h of hazards) {
    const sla = new Date(now.getTime() + h.slaHours * 60 * 60 * 1000).toISOString();
    await dbClient.query(
      `INSERT INTO hazard_reports (
        id, tenant_id, reported_by_user_id, reporter_name, category, severity,
        status, location_detail, description, photo_url, audio_transcript,
        resolution_notes, sla_deadline, acknowledged_at, resolved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        h.id,
        h.tenantId,
        h.userId,
        h.name,
        h.category,
        h.severity,
        h.status,
        h.location,
        h.desc,
        h.photo,
        h.transcript,
        h.resNotes,
        sla,
        h.status !== 'OPEN' ? now.toISOString() : null,
        h.status === 'RESOLVED' ? now.toISOString() : null,
      ]
    );
  }

  // Seed Feedback (Zero PII)
  const feedbackItems = [
    {
      tenantId: 'buildright',
      category: 'Pay & Overtime Transparency',
      rating: 2,
      comment: 'Last month overtime of 14 hours was cut without explanation by contractor. We need clear printed slips.',
      dept: 'Scaffolding Unit',
      sentiment: 'negative',
    },
    {
      tenantId: 'buildright',
      category: 'Safety & Drinking Water',
      rating: 1,
      comment: 'Drinking water tank on 8th floor is empty since 2 days in hot sun. Workers feeling dizzy.',
      dept: 'Masonry Crew',
      sentiment: 'negative',
    },
    {
      tenantId: 'buildright',
      category: 'Management Respect & Dignity',
      rating: 4,
      comment: 'Site supervisor Rajesh treats us with respect and listens to equipment issues.',
      dept: 'Scaffolding Unit',
      sentiment: 'positive',
    },
    {
      tenantId: 'buildright',
      category: 'Rest Facilities & Heat',
      rating: 2,
      comment: 'No shaded rest shed near Tower C. Lunch has to be eaten in the dust under direct sunlight.',
      dept: 'Steel Fixing',
      sentiment: 'negative',
    },
    {
      tenantId: 'citycare',
      category: 'Shift Scheduling & Fatigue',
      rating: 1,
      comment: 'Repeated back-to-back night shift followed by morning emergency duty with only 5 hours gap. We are exhausted and patient safety is at risk.',
      dept: 'ICU & Emergency',
      sentiment: 'negative',
    },
    {
      tenantId: 'citycare',
      category: 'PPE & Infection Protection',
      rating: 4,
      comment: 'Sterile N95 masks and sanitizers are restocked promptly this month.',
      dept: 'Sanitation & Hygiene',
      sentiment: 'positive',
    },
    {
      tenantId: 'citycare',
      category: 'Fair Wages & Timely Disbursal',
      rating: 3,
      comment: 'Base salary is on time, but night shift allowance calculations are unclear on our monthly register.',
      dept: 'General Ward B',
      sentiment: 'neutral',
    },
    {
      tenantId: 'citycare',
      category: 'Management Respect & Dignity',
      rating: 2,
      comment: 'Floor in-charge threatened to cut off-days when staff requested leave due to family illness.',
      dept: 'Trauma Care',
      sentiment: 'negative',
    },
  ];

  let fCount = 1;
  for (const f of feedbackItems) {
    await dbClient.query(
      `INSERT INTO anonymous_feedback (id, tenant_id, category, rating, comment, department, sentiment_tag)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`fb_${fCount++}`, f.tenantId, f.category, f.rating, f.comment, f.dept, f.sentiment]
    );
  }

  // Seed Skill Passports
  const skills = [
    {
      id: 'sk_1',
      userId: 'u_br_w1',
      tenantId: 'buildright',
      title: 'Advanced Tube & Fitting Scaffold Inspection',
      cat: 'Construction Safety & Rigging',
      level: 'Advanced',
      issuer: 'National Skill Development Corp (NSDC)',
      date: '2025-06-15',
      verified: true,
      verifiedBy: 'Vikram Rao (BuildRight Safety Lead)',
      hash: 'SHA256:8f4c2b9a7e1d3c5098e',
    },
    {
      id: 'sk_2',
      userId: 'u_br_w1',
      tenantId: 'buildright',
      title: 'Working at Heights & Fall Protection Certification',
      cat: 'Occupational Safety',
      level: 'Master',
      issuer: 'BuildRight Safety Academy',
      date: '2026-02-10',
      verified: true,
      verifiedBy: 'Rajesh Sharma',
      hash: 'SHA256:3a1b9e8d7c6f50421aa',
    },
    {
      id: 'sk_3',
      userId: 'u_br_w2',
      tenantId: 'buildright',
      title: 'High Voltage Industrial Wiring License',
      cat: 'Electrical Engineering',
      level: 'Intermediate',
      issuer: 'State Technical Education Board',
      date: '2024-11-20',
      verified: true,
      verifiedBy: 'Vikram Rao',
      hash: 'SHA256:7b2e4f9c1a5d80362ee',
    },
    {
      id: 'sk_4',
      userId: 'u_cc_w1',
      tenantId: 'citycare',
      title: 'Advanced Cardiac Life Support (ACLS / BLS)',
      cat: 'Critical Care Healthcare',
      level: 'Master',
      issuer: 'Indian Resuscitation Council',
      date: '2025-09-01',
      verified: true,
      verifiedBy: 'Dr. Anita Sen (Chief Medical Officer)',
      hash: 'SHA256:6e5d4c3b2a1f09876bb',
    },
    {
      id: 'sk_5',
      userId: 'u_cc_w1',
      tenantId: 'citycare',
      title: 'ICU Ventilator Care & Arterial Blood Gas Sampling',
      cat: 'Critical Care Healthcare',
      level: 'Advanced',
      issuer: 'CityCare Institute of Medical Sciences',
      date: '2026-01-18',
      verified: true,
      verifiedBy: 'Sister Mary Joseph',
      hash: 'SHA256:5d4c3b2a1e0f98765cc',
    },
    {
      id: 'sk_6',
      userId: 'u_cc_w2',
      tenantId: 'citycare',
      title: 'Hospital Biomedical Waste Segregation Protocol',
      cat: 'Infection Prevention & Hygiene',
      level: 'Intermediate',
      issuer: 'State Pollution Control Board',
      date: '2025-08-12',
      verified: true,
      verifiedBy: 'Sister Mary Joseph',
      hash: 'SHA256:4c3b2a1e0d9f87654dd',
    },
  ];

  for (const s of skills) {
    await dbClient.query(
      `INSERT INTO skill_passports (
        id, user_id, tenant_id, title, skill_category, level, issuing_body,
        issued_date, verified, verified_by, verified_at, credential_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        s.id,
        s.userId,
        s.tenantId,
        s.title,
        s.cat,
        s.level,
        s.issuer,
        s.date,
        s.verified,
        s.verifiedBy,
        s.verified ? now.toISOString() : null,
        s.hash,
      ]
    );
  }

  console.log('Database initialized and seeded successfully with PostgreSQL client');
}
