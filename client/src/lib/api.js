const BASE = import.meta.env.VITE_API_URL || '';
const headers = { 'Content-Type': 'application/json' };
const post = (body, signal) => ({ method: 'POST', headers, body: JSON.stringify(body), signal });

async function j(url, opts) {
  const r = await fetch(BASE + url, opts);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

export const api = {
  url: p => (p ? BASE + p : null),
  startCall: body => j('/api/calls/start', post(body)),
  chat: (body, signal) => j('/api/chat', post(body, signal)),
  endCall: (id, duration) => j(`/api/calls/${id}/end`, post({ duration })),
  uploadRecording: (id, blob) => {
    const fd = new FormData();
    fd.append('audio', blob, 'recording.webm');
    return j(`/api/calls/${id}/recording`, { method: 'POST', body: fd });
  },
  tts: async (text, language, signal) => {
    const r = await fetch(BASE + '/api/tts', post({ text, language }, signal));
    if (!r.ok) throw new Error('tts failed');
    return r.blob();
  },
  history: () => j('/api/calls'),
  analytics: () => j('/api/calls/analytics/summary'),
  lookup: id => j('/api/customers/lookup?identifier=' + encodeURIComponent(id)),
};
