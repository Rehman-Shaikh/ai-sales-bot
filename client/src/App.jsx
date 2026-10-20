import { useEffect, useState } from 'react';
import { api } from './lib/api';
import { useVoiceCall } from './hooks/useVoiceCall';
import Header from './components/Header';
import CallPanel from './components/CallPanel';
import LiveTranscript from './components/LiveTranscript';
import SummaryPanel from './components/SummaryPanel';
import MemoryPanel from './components/MemoryPanel';
import Analytics from './components/Analytics';
import CallHistory from './components/CallHistory';

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && matchMedia('(prefers-color-scheme: dark)').matches));
  const [form, setForm] = useState({ name: '', identifier: '', language: 'en', consent: false, headphones: false });
  const [memory, setMemory] = useState(null);
  const call = useVoiceCall();

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('theme', dark ? 'dark' : 'light'); }, [dark]);
  // keep dropdown in sync when the AI switches language mid-call
  useEffect(() => { if (call.active) setForm(f => ({ ...f, language: call.language })); }, [call.language, call.active]);
  // customer memory lookup (debounced), refreshed after every finished call
  useEffect(() => {
    const id = form.identifier.trim();
    if (id.length < 5) return setMemory(null);
    const t = setTimeout(() => api.lookup(id).then(setMemory).catch(() => {}), 500);
    return () => clearTimeout(t);
  }, [form.identifier, call.result?._id]);

  const refreshKey = call.result?._id;
  return (
    <>
      <Header dark={dark} setDark={setDark} />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <CallPanel call={call} form={form} setForm={setForm} />
          <MemoryPanel memory={memory} />
        </div>
        <div className="space-y-4 lg:col-span-3">
          <LiveTranscript messages={call.messages} interim={call.interim} />
          <SummaryPanel call={call.result} />
        </div>
        <div className="lg:col-span-2"><Analytics refreshKey={refreshKey} /></div>
        <div className="lg:col-span-3"><CallHistory refreshKey={refreshKey} /></div>
      </main>
    </>
  );
}