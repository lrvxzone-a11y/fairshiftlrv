# FairShift - Decent Work Platform (UN SDG 8)
> **Prompt Wars 2026 Hackathon Prototype**  
> *Transforming workforce management for employee-intensive organisations: construction, hospitals, factories, and institutions.*

---

## 🌟 The Problem & UN SDG 8 Context
Over 1.2 billion workers across employee-intensive sectors (construction sites, municipal hospitals, sanitization teams, manufacturing plants) are managed through fragile paper registers, informal spreadsheets, and chaotic WhatsApp groups.

### Core Vulnerabilities Addressed:
1. **Opaque Pay & Wage Theft:** Workers are unable to audit overtime calculations, deductions, or statutory benefits.
2. **Fear of Retaliation:** Whistleblowers face immediate termination or abuse when reporting safety hazards or abusive supervisors.
3. **Lost Career History:** Migrant and contract workers lose records of their skills, safety trainings, and verified licenses when moving between contractors.
4. **Employer Blindspots:** Delayed incident escalation, undetected fatigue violations (&gt;48 hrs/week, back-to-back shift burnout), and abrupt walkouts/attrition.
5. **Accessibility Barriers:** Workers speak regional languages (Hindi, Tamil, Marathi, etc.), have limited literacy, and use entry-level smartphones.

---

## 🚀 Key Features

### 1. Mobile-First Worker PWA (`worker-app`)
- **Icon-Driven & Big Tactile Buttons:** Designed for high visibility and single-hand thumb navigation (48px+ touch targets).
- **QR Code & Geofenced Check-In:** High-speed site gate scan with automated Haversine geofence boundary validation (prevents ghost attendance).
- **Transparent Audio Payslips:** Automatic itemized calculation of base earnings, daily overtime, hardship allowances, and transparent statutory deductions. Includes a **one-tap Web Speech Voice Playback** in Hindi, Tamil, and English.
- **Voice-Enabled Safety Hazard Reporting:** Speech-to-text recording in the worker's regional language with camera photo preview, severity tagging, and transparent SLA tracking (Open 🟡 &rarr; Acknowledged 🔵 &rarr; Resolved 🟢).
- **100% Cryptographic Identity Shield (Honest Feedback):** Zero-PII guarantee—no name, phone number, device fingerprint, or IP address is ever stored.
- **Portable Skill Passport:** Digital verifiable credentials (NSDC, OSHA, Infection Control, Scaffolding Level 2) with cryptographic hashes and QR codes that travel with the worker.
- **Offline Tolerance:** Service worker caching and local queue resilience for low-connectivity remote sites.

### 2. Operations & Admin Command Dashboard (`admin-dashboard`)
- **Real-Time Attendance & Turnout Trends:** Headcount analytics, geofence compliance rate, and live shift roster.
- **Safety Report SLA Queue:** Prioritized ticket triage by urgency (4h / 12h / 24h SLA countdowns), audio transcript inspection, photo evidence review, and resolution note certification.
- **Anonymous Complaint Heatmap:** Departmental sentiment tracking and friction indexing to identify supervisory toxicity before strikes occur.
- **Predictive Quit-Risk Scoring Engine:** Rules-based model evaluating excessive weekly hours, back-to-back shift density, low sentiment, and unresolved safety tickets to alert managers with actionable interventions.
- **Skill Passport Employer Verification:** Supervisors audit and stamp official verification on worker trade qualifications.
- **Tenant Policy Engine:** Multi-industry configuration for daily wage vs. hourly pay, overtime multipliers, geofence radii, and hazard categories.

---

## 🔄 Cross-Industry Adoption: How FairShift Serves Both Industries

FairShift achieves cross-industry scalability through a dynamic **Tenant Configuration Engine** rather than hardcoded workflows:

| Dimension | BuildRight Construction 🏗️ | CityCare General Hospital 🏥 |
| :--- | :--- | :--- |
| **Wage Model** | **Daily Wage** (₹600 - ₹750/day base) + 1.5x overtime | **Hourly Wage** (₹130 - ₹190/hr) + 2.0x emergency overtime |
| **Shift Structure** | Daily shift (8 hrs) with heavy evening pour overtime | 3-shift rotation: Morning (07-15), Evening (15-23), Night (23-07) |
| **Fatigue Focus** | Prolonged shifts (&gt;12h) & weekly hours (&gt;48h statutory limit) | **Back-to-Back Shifts** (&lt;11h rest gap between rotations) |
| **Check-In Verification** | Geofenced perimeter (300m radius) at site turnstile gate | Ward-level NFC / QR station check-in (ICU, Triage, Sanitation) |
| **Primary Hazards** | Scaffolding instability, heights, exposed wiring, excavation | Biohazard spills, needlestick injuries, infection sanitation, violence |
| **Linguistic Profile** | Predominantly Hindi & Tamil migrant craft trades | Trilingual nursing & support staff (Hindi, Tamil, English) |

---

## 🛠️ Technology Stack & Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Web Speech API (TTS & STT), QR Code generation.
- **Backend:** Node.js, Express, TypeScript (`tsx`).
- **Relational Storage:** PostgreSQL schema via `pg-mem` supporting ANSI SQL, foreign keys, and JSONB structures.
- **Authentication:** JWT tokens with role-based authorization (`worker`, `manager`, `admin`).
- **Compliance Rules:** Decoupled pure logic in `server/rules.ts` covered by unit tests (`server/rules.test.ts`).

---

## 🏃 Setup & Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Unit Tests (Pure Logic Rules):**
   ```bash
   npm test
   ```

3. **Start Development Server (Full-Stack Express + Vite SPA):**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with FairShift.

4. **Interactive Split View Mode:**
   Select **"Split Live View"** in the top navigation bar to test the Worker Mobile PWA side-by-side with the Operations Dashboard in real-time.
