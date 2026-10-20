import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fmt } from '../lib/utils';

export default function Analytics({ refreshKey }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.analytics().then(setD).catch(() => {}); }, [refreshKey]);
  if (!d) return null;
  const max = Math.max(1, ...Object.values(d.byStatus));
  return (
    <section className="card" aria-labelledby="an-h">
      <h2 id="an-h" className="mb-3 text-lg font-bold">Analytics</h2>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        {[['Calls', d.total], ['Conversion', d.conversionRate + '%'], ['Avg duration', fmt(d.avgDuration)]].map(([k, v]) => (
          <div key={k}><p className="font-display text-2xl font-bold">{v}</p><p className="muted text-xs">{k}</p></div>
        ))}
      </div>
      <div className="space-y-1.5">
        {Object.entries(d.byStatus).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0">{k}</span>
            <div className="h-2 flex-1 rounded bg-ink/5 dark:bg-white/10"><div className="h-2 rounded bg-signal" style={{ width: `${(v / max) * 100}%` }} /></div>
            <span className="w-5 text-right">{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
