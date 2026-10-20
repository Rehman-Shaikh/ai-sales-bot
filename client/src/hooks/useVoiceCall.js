import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { LANGS, pickVoice } from '../lib/languages';

const SILENCE_AFTER_FINAL = 800;    // browser says the sentence is complete
const SILENCE_AFTER_INTERIM = 1400; // browser unsure, wait a little longer
const ECHO_TAIL_MS = 700;           // headphone mode: AI voice can still reach the mic just after it stops
const RESUME_MS = 500;              // speaker mode: wait this long after the AI stops before listening again
const ACTIVE = ['connecting', 'listening', 'thinking', 'speaking'];
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const words = t => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);

// True when the mic is only hearing the AI's own voice.
function isEcho(heard, aiText = '') {
  const h = words(heard);
  if (!h.length || !aiText) return false;
  const ai = new Set(words(aiText));
  return h.filter(w => ai.has(w)).length / h.length >= 0.6;
}

/**
 * Voice pipeline:
 * mic -> SpeechRecognition (continuous) -> silence debounce -> /api/chat -> /api/tts -> <audio>
 *
 * Echo protection (the AI must never answer its own voice):
 *  - Speaker mode (default): speech recognition is switched OFF while the AI speaks and resumes 0.5s after.
 *    The customer can still interrupt with the Interrupt button.
 *  - Headphone mode: recognition stays ON, so the customer can interrupt by simply talking (barge-in).
 *
 * Recording: mic + AI audio are mixed in one AudioContext destination and recorded together.
 */
export function useVoiceCall() {
  const [status, setStatus] = useState('idle'); // idle | connecting | listening | thinking | speaking | summarizing | ended
  const [messages, setMessages] = useState([]);
  const [interim, setInterim] = useState('');
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [language, setLanguage] = useState('en');
  const [duration, setDuration] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const s = useRef({ buffer: '', interim: '', pending: '', lang: 'en', headphones: false });

  const dropLastUserMessage = () => setMessages(m => (m.at(-1)?.role === 'user' ? m.slice(0, -1) : m));

  const stopSpeaking = () => {
    const c = s.current;
    c.ttsCtrl?.abort();
    c.audio?.pause();
    c.stopSpeech?.();
    window.speechSynthesis?.cancel();
  };

  // Switch the microphone recogniser off (and throw away anything it half-heard).
  const pauseRecognition = () => {
    const c = s.current;
    c.recogPaused = true;
    clearTimeout(c.timer);
    c.buffer = ''; c.interim = '';
    setInterim(''); setUserSpeaking(false);
    try { c.recog?.abort(); } catch {}
  };

  const resumeRecognition = () => {
    const c = s.current;
    c.recogPaused = false;
    c.buffer = ''; c.interim = '';
    try { c.recog?.start(); } catch {} // if it is still shutting down, onend restarts it
  };

  const bargeIn = () => {
    const c = s.current;
    stopSpeaking();
    if (c.busy) { // user kept talking while the AI was thinking: cancel the request and merge both parts
      c.chatCtrl?.abort();
      c.busy = false;
      c.buffer = `${c.pending} ${c.buffer}`.trim();
      c.pending = '';
      dropLastUserMessage();
    }
  };

  const speak = async text => {
    const c = s.current;
    c.speaking = true;
    c.lastAiText = text;
    const muted = !c.headphones;
    if (muted) pauseRecognition();
    setStatus('speaking');
    const ctrl = new AbortController();
    c.ttsCtrl = ctrl;
    let url;
    try {
      const blob = await api.tts(text, c.lang, ctrl.signal);
      if (ctrl.signal.aborted) return;
      url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      c.audio = audio;
      const src = c.ctx.createMediaElementSource(audio); // routes the AI voice into the recording
      src.connect(c.ctx.destination);
      src.connect(c.dest);
      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        c.stopSpeech = resolve;
        audio.play().catch(reject);
      });
    } catch {
      if (ctrl.signal.aborted) return;
      // Fallback: browser voice (works, but it is not captured in the recording)
      await new Promise(resolve => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = LANGS[c.lang].rec;
        const v = pickVoice(u.lang);
        if (v) u.voice = v;
        u.onend = u.onerror = resolve;
        c.stopSpeech = () => { window.speechSynthesis.cancel(); resolve(); };
        window.speechSynthesis.speak(u);
      });
    } finally {
      if (url) URL.revokeObjectURL(url);
      c.speaking = false;
      c.speakEnd = Date.now();
      c.audio = null;
      c.stopSpeech = null;
      if (c.active && !c.busy) setStatus('listening');
      if (muted && c.active && c.recogPaused) setTimeout(() => { if (c.active && !c.speaking) resumeRecognition(); }, RESUME_MS);
    }
  };

  // One silent retry, so a short network or quota hiccup does not break the conversation.
  const askAI = async (text, signal) => {
    const c = s.current;
    for (let attempt = 0; ; attempt++) {
      try {
        return await api.chat({ callId: c.callId, text, language: c.lang }, signal);
      } catch (e) {
        if (signal.aborted || attempt >= 1) throw e;
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  };

  const flush = async () => {
    const c = s.current;
    const text = `${c.buffer} ${c.interim}`.trim();
    c.buffer = '';
    if (c.interim) { c.interim = ''; try { c.recog.abort(); } catch {} } // drop half-finished results
    setUserSpeaking(false);
    setInterim('');
    if (!c.active || text.length < 2) return;

    c.pending = text;
    c.busy = true;
    setStatus('thinking');
    setMessages(m => [...m, { role: 'user', text }]);
    const ctrl = new AbortController();
    c.chatCtrl = ctrl;
    try {
      const { reply, language: newLang } = await askAI(text, ctrl.signal);
      c.pending = '';
      c.busy = false;
      if (newLang !== c.lang) changeLanguage(newLang);
      setMessages(m => [...m, { role: 'assistant', text: reply }]);
      await speak(reply);
    } catch {
      if (ctrl.signal.aborted) return;
      c.busy = false;
      c.pending = '';
      dropLastUserMessage(); // it was never saved on the server, so do not show it as sent
      setError('Our assistant is a little busy right now. Please wait a few seconds and say that again.');
      setStatus('listening');
    }
  };

  const startRecognition = () => {
    const c = s.current;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = LANGS[c.lang].rec;

    rec.onresult = e => {
      if (c.recogPaused) return; // late result from before the pause: it is the AI's own voice
      let interimText = '';
      let gotFinal = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) { c.buffer = `${c.buffer} ${r[0].transcript.trim()}`.trim(); gotFinal = true; }
        else interimText += r[0].transcript;
      }
      c.interim = interimText.trim();
      const heard = `${c.buffer} ${c.interim}`.trim();
      if (!heard) return;

      // Headphone mode keeps the mic open, so still ignore the AI's own voice if it leaks in.
      const aiTalking = c.speaking || Date.now() - (c.speakEnd || 0) < ECHO_TAIL_MS;
      if (aiTalking && isEcho(heard, c.lastAiText)) {
        c.buffer = ''; c.interim = '';
        return;
      }
      if (c.speaking && words(heard).length < 2 && heard.length < 4) return; // tiny noise while the AI talks

      setError('');
      if (c.speaking || c.busy) bargeIn();
      setUserSpeaking(true);
      setInterim(heard);
      clearTimeout(c.timer);
      c.timer = setTimeout(flush, gotFinal && !c.interim ? SILENCE_AFTER_FINAL : SILENCE_AFTER_INTERIM);
    };

    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        c.noRestart = true;
        setError('Microphone permission was denied. Allow the mic in your browser and start again.');
      } else if (e.error === 'network') {
        setError('Speech recognition lost its connection. Check your internet.');
      }
    };
    // Chrome stops recognition every so often, so restart it while the call is active (unless paused on purpose).
    rec.onend = () => { if (c.active && !c.noRestart && !c.recogPaused) setTimeout(() => { try { rec.start(); } catch {} }, 150); };

    c.recog = rec;
    rec.start();
  };

  function changeLanguage(code) {
    const c = s.current;
    c.lang = code;
    setLanguage(code);
    if (c.recog) { c.recog.lang = LANGS[code].rec; if (!c.recogPaused) { try { c.recog.abort(); } catch {} } } // onend restarts with the new locale
  }

  const setHeadphones = useCallback(on => {
    const c = s.current;
    c.headphones = !!on;
    if (on && c.active && c.recogPaused) resumeRecognition(); // mic can stay open with headphones
  }, []);

  // Manual interrupt (used in speaker mode, where the mic is off while the AI talks).
  const interrupt = useCallback(() => { if (s.current.speaking) stopSpeaking(); }, []);

  const cleanupMedia = () => {
    const c = s.current;
    c.stream?.getTracks().forEach(t => t.stop());
    if (c.ctx && c.ctx.state !== 'closed') c.ctx.close().catch(() => {});
  };

  const start = useCallback(async ({ name, identifier, language: lang, consent, headphones }) => {
    const c = s.current;
    if (c.active || c.starting) return;
    setError('');
    if (!SR) return setError('Speech recognition is not supported here. Please use Google Chrome or Microsoft Edge.');
    c.starting = true;
    try {
      setStatus('connecting');
      setMessages([]); setResult(null); setDuration(0); setInterim(''); setUserSpeaking(false);
      c.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      c.ctx = new AudioContext();
      await c.ctx.resume();
      c.dest = c.ctx.createMediaStreamDestination();
      c.ctx.createMediaStreamSource(c.stream).connect(c.dest); // customer voice (not sent to the speakers)
      c.chunks = [];
      c.recorder = new MediaRecorder(c.dest.stream);
      c.recorder.ondataavailable = e => e.data.size && c.chunks.push(e.data);
      c.recorder.start(1000);

      const data = await api.startCall({ name, identifier, language: lang, consent });
      Object.assign(c, {
        callId: data.callId, lang, headphones: !!headphones, active: true, busy: false, noRestart: false, recogPaused: false,
        buffer: '', interim: '', pending: '', speakEnd: 0, startTs: Date.now(),
      });
      setLanguage(lang);
      c.tick = setInterval(() => setDuration(Math.round((Date.now() - c.startTs) / 1000)), 1000);
      setMessages([{ role: 'assistant', text: data.greeting }]);
      startRecognition();
      c.starting = false;
      await speak(data.greeting);
    } catch (e) {
      c.starting = false;
      cleanupMedia();
      setError(e.name === 'NotAllowedError' ? 'Microphone permission was denied. Allow the mic and try again.' : e.message);
      setStatus('idle');
    }
  }, []);

  const end = useCallback(async () => {
    const c = s.current;
    if (!c.active) return;
    c.active = false;
    clearInterval(c.tick); clearTimeout(c.timer);
    try { c.recog.abort(); } catch {}
    c.chatCtrl?.abort();
    stopSpeaking();
    setUserSpeaking(false); setInterim('');
    setStatus('summarizing');
    const dur = Math.round((Date.now() - c.startTs) / 1000);
    setDuration(0); // timer goes back to 00:00 (the final duration is saved in call history)
    const blob = await new Promise(resolve => {
      if (c.recorder.state === 'inactive') return resolve(new Blob(c.chunks, { type: 'audio/webm' }));
      c.recorder.onstop = () => resolve(new Blob(c.chunks, { type: 'audio/webm' }));
      c.recorder.stop();
    });
    cleanupMedia();
    try {
      await api.uploadRecording(c.callId, blob);
    } catch {
      setError('The recording could not be saved, but your summary will still be created.');
    }
    try {
      setResult(await api.endCall(c.callId, dur)); // summary + sales status
    } catch (e) {
      setError('Could not save the call: ' + e.message);
    }
    setStatus('ended');
  }, []);

  useEffect(() => () => {
    const c = s.current;
    c.active = false;
    clearInterval(c.tick); clearTimeout(c.timer);
    try { c.recog?.abort(); } catch {}
    cleanupMedia();
  }, []);

  return { status, active: ACTIVE.includes(status), messages, interim, userSpeaking, language, duration, result, error, start, end, interrupt, setHeadphones, changeLanguage };
}