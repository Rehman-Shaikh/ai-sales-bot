// rec = Web Speech API recognition locale. Hinglish is recognised best with en-IN.
export const LANGS = {
  en: { label: 'English', rec: 'en-IN' },
  hi: { label: 'Hindi', rec: 'hi-IN' },
  hinglish: { label: 'Hinglish', rec: 'en-IN' },
  te: { label: 'Telugu', rec: 'te-IN' },
};

const FEMALE = /(\bfemale\b|zira|heera|neerja|swara|kalpana|shruti|veena|lekha|priya|hazel|susan|samantha|aria|jenny|google (हिन्दी|हिंदी))/i;
const MALE = /(\bmale\b|david|mark|ravi|hemant|prabhat|mohan|rishi|george|james|guy)/i;

// Picks a female browser voice for the locale (used only if the server voice is unavailable).
export function pickVoice(locale) {
  const base = locale.slice(0, 2).toLowerCase();
  const same = (window.speechSynthesis?.getVoices() || []).filter(v => v.lang.toLowerCase().startsWith(base));
  return same.find(v => FEMALE.test(v.name) && !MALE.test(v.name))
    || same.find(v => !MALE.test(v.name))
    || same[0]
    || null;
}
