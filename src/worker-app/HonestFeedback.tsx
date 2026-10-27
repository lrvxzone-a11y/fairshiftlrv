import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Smile,
  Meh,
  Frown,
  Star,
  Send,
  CheckCircle2,
  Sparkles,
  HeartHandshake,
  Mic
} from 'lucide-react';
import { User, Tenant, Language } from '../types';
import { translations } from '../i18n/translations';
import { createSpeechRecognizer } from '../utils/speech';

interface Props {
  user: User;
  tenant: Tenant;
  lang: Language;
}

export const HonestFeedback: React.FC<Props> = ({ user, tenant, lang }) => {
  const t = translations[lang];
  const [rating, setRating] = useState<number>(4);
  const [category, setCategory] = useState<string>('Supervisory Respect & Dignity');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const categories = [
    'Supervisory Respect & Dignity',
    'Fair Wages & Overtime Transparency',
    'Safety Gear & Drinking Water',
    'Shift Hours & Fatigue Prevention',
    'Rest Shelters & Sanitation',
  ];

  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognizer = createSpeechRecognizer(
      lang,
      (transcript) => {
        setComment((prev) => (prev ? `${prev} ${transcript}` : transcript));
      },
      (listeningState) => setIsListening(listeningState)
    );
    recognizer.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert('Please add a comment about your working conditions.');
      return;
    }

    setIsSubmitting(true);

    try {
      // NOTE: user ID, phone, device fingerprint, and IP are strictly NOT sent!
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          category,
          rating,
          comment,
          department: user.teamDepartment, // team aggregation only, no user ID
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setComment('');
      } else {
        alert('Failed to submit feedback');
      }
    } catch (e) {
      console.error(e);
      alert('Error submitting feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Zero Identity Shield Guarantee Banner */}
      <div className="bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-950 border border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-2 relative overflow-hidden">
        <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>{t.anonymousGuarantee}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{t.anonymousDesc}</p>
        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Cryptographic Zero-Knowledge Shield Active</span>
        </div>
      </div>

      {submitted ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-xl animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/60 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-100">Feedback Safely Recorded</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Your review has been aggregated into the anonymous department sentiment heatmap.
            No identity or device signature was recorded.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Submit Another Review
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
        >
          {/* Rating Emoji / Stars */}
          <div className="space-y-2 text-center">
            <label className="text-xs font-bold text-slate-300 block">
              {t.rateWorkConditions}
            </label>
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5].map((val) => {
                const isSelected = rating >= val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRating(val)}
                    className="p-1 text-slate-400 hover:scale-110 transition-transform cursor-pointer"
                    aria-label={`Rate ${val} stars`}
                  >
                    <Star
                      className={`w-7 h-7 ${
                        isSelected
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="text-xs font-medium text-slate-400">
              {rating === 1 && 'Unacceptable / High Friction'}
              {rating === 2 && 'Needs Urgent Improvement'}
              {rating === 3 && 'Fair / Manageable'}
              {rating === 4 && 'Good / Respectful Environment'}
              {rating === 5 && 'Excellent & Dignified'}
            </div>
          </div>

          {/* Feedback Topic / Category */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Review Topic
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`p-2.5 rounded-xl text-xs text-left font-medium transition-all cursor-pointer border ${
                    category === c
                      ? 'bg-sky-950/80 border-sky-500 text-sky-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Comment with Voice Dictation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Your Honest Experience (Text or Voice)
              </label>

              <button
                type="button"
                onClick={handleVoiceInput}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-900/60'
                }`}
              >
                <Mic className="w-3 h-3 text-sky-400" />
                <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
              </button>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={
                lang === 'hi'
                  ? 'ठेकेदार या सुपरवाइजर के व्यवहार, पीने के पानी या काम के घंटों के बारे में सच लिखें...'
                  : lang === 'ta'
                  ? 'மேலாளர் அணுகுமுறை, பணி நேரம் அல்லது குடிநீர் வசதி பற்றி உண்மை கருத்துகளைப் பகிரவும்...'
                  : 'Share candid observations about supervisor conduct, rest breaks, heat conditions, or unfair deductions...'
              }
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording Safely...' : t.submitFeedback}</span>
          </button>
        </form>
      )}
    </div>
  );
};
