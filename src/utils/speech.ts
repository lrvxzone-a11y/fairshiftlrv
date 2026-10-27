import { Language } from '../types';

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

/**
 * Text-to-Speech using Web Speech API with language voice matching
 */
export function playVoiceMessage(
  text: string,
  lang: Language,
  onEnd?: () => void
): boolean {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis not supported on this browser');
    return false;
  }

  window.speechSynthesis.cancel(); // stop any previous utterance

  const utterance = new SpeechSynthesisUtterance(text);
  const langCode = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-IN';
  utterance.lang = langCode;
  utterance.rate = 0.95; // slightly slower for maximum clarity for workers
  utterance.pitch = 1.0;

  // Try to find a matching voice if available
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) => v.lang.startsWith(langCode.slice(0, 2)));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopVoicePlayback() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speech-to-Text using Web Speech API with fallback simulation for development
 */
export function createSpeechRecognizer(
  lang: Language,
  onTranscript: (transcript: string) => void,
  onStatusChange?: (isListening: boolean) => void
) {
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    return {
      start: () => {
        if (onStatusChange) onStatusChange(true);
        // Fallback demo phrases if browser has no speech recognition
        setTimeout(() => {
          const sample =
            lang === 'hi'
              ? 'पाड़ की रेलिंग ढीली है और नीचे सुरक्षा जाली फटी हुई है।'
              : lang === 'ta'
              ? 'கட்டுமான தளத்தில் பாதுகாப்பு தலைக்கவசம் மற்றும் பூட்ஸ் இல்லை.'
              : 'Scaffolding pipe clamp on 4th level is loose and vibrating.';
          onTranscript(sample);
          if (onStatusChange) onStatusChange(false);
        }, 1500);
      },
      stop: () => {
        if (onStatusChange) onStatusChange(false);
      },
    };
  }

  const recognition = new SpeechRecognitionClass();
  const langCode = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-IN';
  recognition.lang = langCode;
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    if (onStatusChange) onStatusChange(true);
  };

  recognition.onend = () => {
    if (onStatusChange) onStatusChange(false);
  };

  recognition.onerror = (_err: any) => {
    if (onStatusChange) onStatusChange(false);
  };

  recognition.onresult = (event: any) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    onTranscript(transcript);
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch (e) {
        console.warn('Recognition stop error:', e);
      }
    },
  };
}
