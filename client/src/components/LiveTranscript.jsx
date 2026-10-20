import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function LiveTranscript({ messages, interim }) {
  const box = useRef(null);
  // scroll only the transcript box, never the whole page
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, interim]);

  return (
    <section className="card flex h-[26rem] flex-col" aria-labelledby="tr-h">
      <h2 id="tr-h" className="mb-3 text-lg font-bold">Live transcript</h2>
      <div ref={box} className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {!messages.length && <p className="muted text-sm">Start a call. Everything you and the AI say will appear here in real time.</p>}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === 'user' ? 'bg-signal/20' : 'bg-amber/15'}`}>
              <p className="muted mb-0.5 text-xs">{m.role === 'user' ? 'You' : 'Priya (AI)'}</p>
              {m.text}
            </div>
          </motion.div>
        ))}
        {interim && <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl border border-dashed border-signal/50 px-3.5 py-2 text-sm italic opacity-70">{interim}</div></div>}
      </div>
    </section>
  );
}
