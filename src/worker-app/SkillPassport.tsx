import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  Share2,
  Plus,
  Clock,
  Sparkles,
  ExternalLink,
  IdCard,
  Building
} from 'lucide-react';
import QRCode from 'qrcode';
import { User, Tenant, Language, SkillCredential } from '../types';
import { translations } from '../i18n/translations';

interface Props {
  user: User;
  tenant: Tenant;
  lang: Language;
}

export const SkillPassport: React.FC<Props> = ({ user, tenant, lang }) => {
  const t = translations[lang];
  const [skills, setSkills] = useState<SkillCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newIssuer, setNewIssuer] = useState('');
  const [newLevel, setNewLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Master'>('Intermediate');
  const [submitting, setSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/skills/${user.id}`);
      const data = await res.json();
      setSkills(data.skills || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();

    // Generate portable verifiable QR code
    const passportUrl = `https://fairshift.org/passport/${user.id}?tenant=${tenant.id}`;
    QRCode.toDataURL(passportUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: '#0284c7',
        light: '#ffffff',
      },
    }).then((url) => setQrDataUrl(url));
  }, [user.id, tenant.id]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newIssuer) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tenantId: tenant.id,
          title: newTitle,
          skillCategory: newCategory || 'Core Technical Trade',
          level: newLevel,
          issuingBody: newIssuer,
          issuedDate: new Date().toISOString().slice(0, 10),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewIssuer('');
        await loadSkills();
      } else {
        alert('Failed to register skill');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSharePassport = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Verifiable Skill ID Badge */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md border border-sky-400/40">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base text-slate-100">{user.name}</h3>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-sky-300 font-medium">{user.jobTitle}</p>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                <Building className="w-3 h-3 text-slate-500" />
                <span>{tenant.name}</span>
              </p>
            </div>
          </div>

          {/* QR Badge for instant verification */}
          {qrDataUrl && (
            <div className="p-1 bg-white rounded-lg shadow-md shrink-0">
              <img src={qrDataUrl} alt="Portable Passport QR" className="w-14 h-14" />
            </div>
          )}
        </div>

        <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Passport ID</span>
            <span className="font-mono text-slate-200 text-xs font-semibold">
              FS-PASSPORT-2026-{user.id.toUpperCase()}
            </span>
          </div>

          <button
            onClick={handleSharePassport}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Share2 className="w-3 h-3" />
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Skills & Certifications List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t.verifiedSkills}
            </h4>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-800/50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Credential</span>
          </button>
        </div>

        <div className="space-y-3">
          {skills.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-4">No skills registered yet.</p>
          ) : (
            skills.map((s) => (
              <div
                key={s.id}
                className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-slate-100 text-xs">{s.title}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Issued by: <strong className="text-slate-300">{s.issuing_body}</strong>
                    </p>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1 ${
                      s.verified
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800'
                    }`}
                  >
                    {s.verified ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{t.verifiedBadge}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{t.pendingVerification}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                  <span>Level: <strong className="text-sky-300">{s.level}</strong></span>
                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[160px]">
                    {s.credential_hash}
                  </span>
                </div>

                {s.verified_by && (
                  <div className="text-[10px] text-emerald-400/90 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/40">
                    Verified by employer auditor: {s.verified_by}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Credential Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddSkill}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 text-slate-100 shadow-2xl animate-scaleUp"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm">Add Portable Credential</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Certificate / Skill Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Scaffolding Level 2 or Infection Control"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Issuing Organization
              </label>
              <input
                type="text"
                value={newIssuer}
                onChange={(e) => setNewIssuer(e.target.value)}
                placeholder="e.g. NSDC, Red Cross, or State Tech Board"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Proficiency Level
              </label>
              <select
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Master">Master / Trainer</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
            >
              {submitting ? 'Adding...' : 'Add to Portable Passport'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
