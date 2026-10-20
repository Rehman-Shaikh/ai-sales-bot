import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { LANGS } from '../lib/languages';
import { fmt, fmtDate } from '../lib/utils';
import StatusBadge from './StatusBadge';
import SummaryPanel from './SummaryPanel';

export default function CallHistory({ refreshKey }) {
  const [calls, setCalls] = useState([]);
  const [open, setOpen] = useState(null);
  useEffect(() => { api.history().then(setCalls).catch(() => {}); }, [refreshKey]);

  return (
    <section className="card" aria-labelledby="hist-h">
      <h2 id="hist-h" className="mb-3 text-lg font-bold">Call history</h2>
      {!calls.length && <p className="muted text-sm">No calls yet. Finished calls show up here with recording, transcript, summary and status.</p>}
      <ul className="divide-y divide-ink/10 dark:divide-white/10">
        {calls.map(c => (
          <li key={c._id}>
            <button className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => setOpen(open === c._id ? null : c._id)} aria-expanded={open === c._id}>
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.customerName || c.identifier}</p>
                <p className="muted text-xs">{fmtDate(c.startedAt)} · {LANGS[c.language]?.label} · {fmt(c.duration)}</p>
              </div>
              <div className="flex items-center gap-2"><StatusBadge status={c.status} /><ChevronDown size={16} className={open === c._id ? 'rotate-180' : ''} /></div>
            </button>
            <AnimatePresence initial={false}>
              {open === c._id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="grid gap-4 pb-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      {c.recordingUrl ? <audio controls className="w-full" src={api.url(c.recordingUrl)} /> : <p className="muted text-sm">No recording saved.</p>}
                      <SummaryPanel call={c} bare />
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-ink/5 p-3 text-sm dark:bg-white/5">
                      {c.transcript.map((m, i) => <p key={i}><b>{m.role === 'user' ? 'Customer' : 'AI'}:</b> {m.text}</p>)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </section>
  );
}
