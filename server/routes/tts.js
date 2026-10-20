import { Router } from 'express';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// All three are female neural voices
const VOICES = {
  en: 'en-IN-NeerjaNeural',
  hi: 'hi-IN-SwaraNeural',
  hinglish: 'hi-IN-SwaraNeural',
  te: 'te-IN-ShrutiNeural',
};
const router = Router();

async function synthesize(text, language) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(VOICES[language] || VOICES.en, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const r = tts.toStream(String(text).slice(0, 800));
    const stream = r.audioStream || r; // works with both library versions
    const chunks = [];
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('TTS timed out')), 12000);
      const done = () => { clearTimeout(timer); resolve(); };
      stream.on('data', d => chunks.push(d));
      stream.on('end', done);
      stream.on('close', done);
      stream.on('error', e => { clearTimeout(timer); reject(e); });
    });
    const audio = Buffer.concat(chunks);
    if (!audio.length) throw new Error('TTS returned empty audio');
    return audio;
  } finally {
    try { tts.close?.(); } catch {}
  }
}

async function synthesizeWithRetry(text, language) {
  try {
    return await synthesize(text, language);
  } catch (e) {
    console.warn('TTS failed, retrying once:', e.message);
    return synthesize(text, language);
  }
}

// POST /api/tts { text, language } -> audio/mpeg
router.post('/', async (req, res) => {
  try {
    const { text, language = 'en' } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });
    const audio = await synthesizeWithRetry(text, language);
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length });
    res.send(audio);
  } catch (e) {
    console.error('TTS error:', e.message); // the browser then falls back to its own voice
    res.status(500).json({ error: 'tts failed' });
  }
});

// Quick check in the browser: http://localhost:5000/api/tts/test?language=hi
router.get('/test', async (req, res) => {
  try {
    const language = req.query.language || 'en';
    const text = language === 'hi' ? 'नमस्ते, मैं प्रिया बोल रही हूँ।' : 'Hello, this is Priya from SalesPilot.';
    const audio = await synthesizeWithRetry(text, language);
    res.set('Content-Type', 'audio/mpeg').send(audio);
  } catch (e) {
    res.status(500).send('TTS error: ' + e.message);
  }
});

export default router;
