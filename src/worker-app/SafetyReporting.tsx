import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Mic,
  MicOff,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  Image,
  Send,
  Info
} from 'lucide-react';
import { User, Tenant, Language, HazardReport } from '../types';
import { translations } from '../i18n/translations';
import { createSpeechRecognizer } from '../utils/speech';

interface Props {
  user: User;
  tenant: Tenant;
  lang: Language;
  onReportFiled?: () => void;
}

export const SafetyReporting: React.FC<Props> = ({ user, tenant, lang, onReportFiled }) => {
  const t = translations[lang];
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [category, setCategory] = useState<string>(tenant.hazardCategories[0] || 'General Hazard');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [locationDetail, setLocationDetail] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Load hazard reports for this tenant
  const loadHazards = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hazards/${tenant.id}`);
      const data = await res.json();
      setHazards(data.hazards || []);
    } catch (e) {
      console.error('Failed to load hazards', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHazards();
    setCategory(tenant.hazardCategories[0] || 'General Hazard');
  }, [tenant.id]);

  // Voice speech-to-text integration
  const handleToggleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognizer = createSpeechRecognizer(
      lang,
      (transcript) => {
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
      },
      (listeningState) => {
        setIsListening(listeningState);
      }
    );

    recognizer.start();
  };

  // Submit hazard
  const handleSubmitHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !locationDetail) {
      alert('Please provide location detail and a description of the hazard.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(null);

    try {
      const res = await fetch('/api/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          reportedByUserId: user.id,
          reporterName: user.name,
          category,
          severity,
          locationDetail,
          description,
          photoUrl: photoUrl || null,
          audioTranscript: isListening ? description : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitSuccess(`Safety hazard ticket ${data.hazardId} opened. 24h SLA escalation countdown active.`);
        setDescription('');
        setLocationDetail('');
        setPhotoUrl('');
        await loadHazards();
        if (onReportFiled) onReportFiled();
      } else {
        alert(data.error || 'Failed to submit hazard');
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting hazard');
    } finally {
      setSubmitting(false);
    }
  };

  // Sample photo selection for testing
  const samplePhotos = [
    {
      label: 'Scaffold Defect',
      url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=600&auto=format&fit=crop&q=80',
    },
    {
      label: 'Exposed Electrical Cable',
      url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    },
    {
      label: 'Biohazard Overflow',
      url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      {submitSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">{submitSuccess}</div>
          <button onClick={() => setSubmitSuccess(null)} className="text-emerald-400 font-bold ml-1">
            ✕
          </button>
        </div>
      )}

      {/* Hazard Report Form Card */}
      <form
        onSubmit={handleSubmitHazard}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/50 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">{t.reportHazard}</h3>
              <p className="text-[11px] text-slate-400">Zero Retaliation • Protected by SDG 8</p>
            </div>
          </div>

          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {tenant.industry}
          </span>
        </div>

        {/* Category Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            {t.hazardCategory}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {tenant.hazardCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`p-2.5 rounded-xl text-xs text-left font-medium transition-all cursor-pointer border ${
                  category === cat
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            {t.hazardSeverity}
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((sev) => {
              const isSelected = severity === sev;
              const color =
                sev === 'CRITICAL'
                  ? 'bg-red-600 text-white'
                  : sev === 'HIGH'
                  ? 'bg-amber-600 text-white'
                  : sev === 'MEDIUM'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-700 text-slate-200';

              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`py-2 px-1 text-center rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer border ${
                    isSelected
                      ? `${color} border-white/20 shadow-md scale-105`
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location Input */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Exact Location on Site / Ward
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder="e.g. 5th Floor Periphery, Block C, or ICU Corridor 2"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
        </div>

        {/* Description & Speech-to-Text Button */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Hazard Description (Voice or Text)
            </label>

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-900/60'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>{t.listening}</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t.speakDescription}</span>
                </>
              )}
            </button>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={
              lang === 'hi'
                ? 'माइक दबाकर बोलें या यहाँ लिखें: क्या खतरा है? कौन सी चीज टूटी हुई है?'
                : lang === 'ta'
                ? 'மைக் அழுத்தி பேசவும் அல்லது தட்டச்சு செய்யவும்: என்ன ஆபத்து?'
                : 'Describe the danger, exposed cables, unstable scaffolding, or biohazard leak...'
            }
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* Photo Evidence Attachment */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">
            {t.attachPhoto}
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {samplePhotos.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPhotoUrl(photoUrl === s.url ? '' : s.url)}
                className={`shrink-0 p-1 rounded-lg border text-[11px] flex items-center gap-1.5 cursor-pointer transition-all ${
                  photoUrl === s.url
                    ? 'border-rose-500 bg-rose-950/60 text-rose-200 font-semibold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-rose-400" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {photoUrl && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-700 aspect-video max-h-36">
              <img src={photoUrl} alt="Hazard preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Send className="w-4 h-4" />
          <span>{submitting ? 'Submitting...' : t.submitReport}</span>
        </button>
      </form>

      {/* Live Ticket Status Tracker (Worker View) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Active Hazard Tickets & SLA Status</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">{hazards.length} tickets</span>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {hazards.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-4">No hazard reports logged.</p>
          ) : (
            hazards.map((h) => {
              const statusColor =
                h.status === 'RESOLVED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : h.status === 'ACKNOWLEDGED'
                  ? 'bg-sky-950 text-sky-300 border-sky-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800';

              return (
                <div
                  key={h.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-200 block text-xs">
                        {h.category}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {h.location_detail}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${statusColor}`}
                      >
                        {h.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
                    "{h.description}"
                  </p>

                  {h.audio_transcript && (
                    <div className="text-[10px] text-slate-400 italic flex items-center gap-1 pl-1">
                      <Mic className="w-3 h-3 text-slate-500" />
                      <span>Transcribed: {h.audio_transcript}</span>
                    </div>
                  )}

                  {h.photo_url && (
                    <div className="mt-1 h-20 rounded-lg overflow-hidden border border-slate-800">
                      <img src={h.photo_url} alt="Hazard evidence" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {h.resolution_notes && (
                    <div className="p-2 bg-emerald-950/40 border border-emerald-900/60 rounded-lg text-emerald-300 text-[11px] flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Supervisor Action: {h.resolution_notes}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
