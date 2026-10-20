import { Router } from 'express';
import Call from '../models/Call.js';
import Customer from '../models/Customer.js';
import { chat, diagnose } from '../services/gemini.js';
import { buildSystemPrompt } from '../services/prompts.js';

const router = Router();

// Open http://localhost:5000/api/chat/diagnose in the browser to see which AI provider works.
router.get('/diagnose', async (_req, res) => res.json(await diagnose()));

// POST /api/chat  { callId, text, language }
router.post('/', async (req, res) => {
  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ctrl.abort(); }); // client cancelled (barge-in)
  try {
    const { callId, text, language = 'en' } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });
    const call = await Call.findById(callId);
    if (!call) return res.status(404).json({ error: 'call not found' });

    call.transcript.push({ role: 'user', text: text.trim() });
    const customer = call.customer ? await Customer.findById(call.customer) : null;
    const system = buildSystemPrompt({ language, customer, customerName: call.customerName });
    const history = call.transcript.slice(-24).map(({ role, text }) => ({ role, text }));

    let reply = await chat(system, history, ctrl.signal);
    let newLang = language;
    const tag = reply.match(/\[\[LANG:(en|hi|hinglish|te)\]\]/);
    if (tag) newLang = tag[1];
    reply = reply.replace(/\[\[LANG:[a-z]+\]\]/g, '').replace(/[*#_`]/g, '').trim();
    if (!reply) reply = 'Sorry, could you say that once more?';

    call.transcript.push({ role: 'assistant', text: reply });
    call.language = newLang;
    await call.save();
    res.json({ reply, language: newLang });
  } catch (e) {
    if (ctrl.signal.aborted) return;
    console.error('Chat error:', e.message); // full reason is shown only in this terminal
    res.status(503).json({ error: 'AI_BUSY' });
  }
});

export default router;
