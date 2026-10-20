import { Hand, Phone, PhoneOff } from 'lucide-react';
import VoiceOrb from './VoiceOrb';
import { LANGS } from '../lib/languages';
import { fmt } from '../lib/utils';

const LABEL = { idle: 'Ready to call', connecting: 'Connecting…', listening: 'Listening to you', thinking: 'Thinking…', speaking: 'AI is speaking', summarizing: 'Saving call and writing summary…', ended: 'Call ended' };

export default function CallPanel({ call, form, setForm }) {
  const { status, active, userSpeaking, duration, error } = call;
  const busy = status === 'connecting' || status === 'summarizing';
  const valid = form.identifier.trim().length > 4 && form.consent;
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const changeLang = e => { set('language')(e); if (active) call.changeLanguage(e.target.value); };
  const onHeadphones = e => { set('headphones')(e); call.setHeadphones(e.target.checked); };

  return (
    <section className="card" aria-labelledby="call-h">
      <h2 id="call-h" className="mb-3 text-lg font-bold">Current call</h2>
      <VoiceOrb status={status} userSpeaking={userSpeaking} />
      <div className="mt-2 text-center" role="status" aria-live="polite">
        <p className="font-semibold">{LABEL[status]}</p>
        <p className="muted text-sm tabular-nums">{fmt(duration)}</p>
      </div>
      <div className="mt-3 flex justify-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 ${status === 'speaking' ? 'bg-amber/25' : 'bg-ink/5 dark:bg-white/10'}`}>AI speaking</span>
        <span className={`rounded-full px-2.5 py-1 ${userSpeaking ? 'bg-signal/25' : 'bg-ink/5 dark:bg-white/10'}`}>You speaking</span>
      </div>

      {status === 'speaking' && (
        <div className="mt-3 text-center">
          <button className="btn border border-ink/15 py-2 dark:border-white/20" onClick={call.interrupt}>
            <Hand size={16} /> Interrupt
          </button>
          {!form.headphones && <p className="muted mt-1 text-xs">Mic is paused while the AI speaks, so it never hears itself.</p>}
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Your name" value={form.name} onChange={set('name')} disabled={active} aria-label="Your name" />
          <select className="input dark:bg-panel" value={form.language} onChange={changeLang} aria-label="Call language">
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <input className="input" placeholder="Phone or email (used to remember you)" value={form.identifier} onChange={set('identifier')} disabled={active} aria-label="Phone or email" />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={form.consent} onChange={set('consent')} disabled={active} />
          <span className="muted">I agree that this call will be recorded and transcribed.</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={form.headphones} onChange={onHeadphones} />
          <span className="muted">I'm using headphones (lets me interrupt the AI by speaking). Keep this off when using speakers.</span>
        </label>
        {!active ? (
          <button className="btn bg-signal text-ink hover:brightness-110" disabled={!valid || busy} onClick={() => call.start(form)}>
            <Phone size={16} /> Start call
          </button>
        ) : (
          <button className="btn bg-rose-600 text-white hover:bg-rose-500" onClick={call.end} disabled={busy}>
            <PhoneOff size={16} /> End call
          </button>
        )}
        {error && <p role="status" className="rounded-lg bg-amber/15 p-3 text-sm text-amber-800 dark:text-amber">{error}</p>}
        <p className="muted text-xs">Use Chrome or Edge. Say “Can we continue in Hindi?” to switch language.</p>
      </div>
    </section>
  );
}