import { motion, useReducedMotion } from 'framer-motion';

// The one expressive element: amber = AI speaking, teal = customer speaking.
export default function VoiceOrb({ status, userSpeaking }) {
  const reduce = useReducedMotion();
  const ai = status === 'speaking';
  const live = ai || userSpeaking;
  const color = ai ? '#F5A524' : userSpeaking ? '#14B8A6' : status === 'thinking' ? '#94A3B8' : '#64748B55';
  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center" aria-hidden>
      {[0, 1].map(i => (
        <motion.span key={i} className="absolute h-24 w-24 rounded-full" style={{ background: color, opacity: 0.25 }}
          animate={live && !reduce ? { scale: [1, 1.9], opacity: [0.3, 0] } : { scale: 1, opacity: 0.12 }}
          transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.9, ease: 'easeOut' }} />
      ))}
      <motion.span className="h-24 w-24 rounded-full" style={{ background: color }}
        animate={live && !reduce ? { scale: [1, 1.08, 0.96, 1.05, 1] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 1.1 }} />
    </div>
  );
}
