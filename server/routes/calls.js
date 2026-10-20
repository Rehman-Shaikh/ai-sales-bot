import { Router } from 'express';
import multer from 'multer';
import Call from '../models/Call.js';
import Customer from '../models/Customer.js';
import Recording from '../models/Recording.js';
import { summarizeCall } from '../services/summary.js';
import { updateMemory } from '../services/memory.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = Router();

function greeting(c, name, lang) {
  const n = name ? ` ${name}` : '';
  const returning = c?.callCount > 0;
  const plan = c?.lastRecommendedPlan && c.lastRecommendedPlan !== 'None' ? c.lastRecommendedPlan : 'SalesPilot';
  const G = {
    en: returning ? `Hi${n}, welcome back! Last time we spoke about ${plan}. How can I help you today?`
      : `Hi${n}, this is Priya from SalesPilot. Thanks for taking my call! Could you tell me a little about your business?`,
    hi: returning ? `नमस्ते${n}, फिर से स्वागत है! पिछली बार हमने ${plan} के बारे में बात की थी। आज मैं कैसे मदद करूँ?`
      : `नमस्ते${n}, मैं SalesPilot से प्रिया बोल रही हूँ। क्या आप अपने बिज़नेस के बारे में थोड़ा बता सकते हैं?`,
    hinglish: returning ? `Hi${n}, welcome back! Last time hamne ${plan} ke baare me baat ki thi. Aaj kaise help karu?`
      : `Hi${n}, main SalesPilot se Priya bol rahi hu. Aap apne business ke baare me thoda bata sakte hain?`,
    te: `నమస్కారం${n}, నేను SalesPilot నుండి ప్రియ మాట్లాడుతున్నాను. మీ వ్యాపారం గురించి కొంచెం చెప్పగలరా?`,
  };
  return G[lang] || G.en;
}

// POST /api/calls/start { name, identifier, language, consent }
router.post('/start', async (req, res, next) => {
  try {
    const { name, identifier, language = 'en', consent } = req.body;
    if (!consent) return res.status(400).json({ error: 'Recording consent is required' });
    if (!identifier?.trim()) return res.status(400).json({ error: 'Phone or email is required' });
    const id = identifier.trim().toLowerCase();
    let customer = await Customer.findOne({ identifier: id });
    if (!customer) customer = await Customer.create({ identifier: id, name, preferredLanguage: language });
    else if (name && name !== customer.name) { customer.name = name; await customer.save(); }

    const call = await Call.create({ customer: customer._id, customerName: customer.name, identifier: id, language, consent: true });
    const text = greeting(customer, customer.name, language);
    call.transcript.push({ role: 'assistant', text });
    await call.save();
    res.json({ callId: call._id, greeting: text, customer });
  } catch (e) { next(e); }
});

// POST /api/calls/:id/end { duration }  -> summary + status + memory update
router.post('/:id/end', async (req, res, next) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'not found' });
    if (call.status !== 'In Progress') return res.json(call); // idempotent
    const summary = await summarizeCall(call.transcript);
    call.summary = summary;
    call.status = summary.status;
    call.duration = Number(req.body.duration) || 0;
    call.endedAt = new Date();
    await call.save();
    if (call.customer) await updateMemory(call.customer, summary, summary.status, call.language);
    res.json(call);
  } catch (e) { next(e); }
});

// POST /api/calls/:id/recording  (multipart field "audio") -> stored in MongoDB
router.post('/:id/recording', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'audio file required' });
    await Recording.findOneAndUpdate(
      { callId: req.params.id },
      { data: req.file.buffer, mime: req.file.mimetype || 'audio/webm' },
      { upsert: true },
    );
    const url = `/api/calls/${req.params.id}/recording`;
    await Call.findByIdAndUpdate(req.params.id, { recordingUrl: url });
    res.json({ recordingUrl: url });
  } catch (e) { next(e); }
});

// GET /api/calls/:id/recording -> audio for the player
router.get('/:id/recording', async (req, res, next) => {
  try {
    const r = await Recording.findOne({ callId: req.params.id });
    if (!r) return res.sendStatus(404);
    res.set('Content-Type', r.mime || 'audio/webm').send(r.data);
  } catch (e) { next(e); }
});

router.get('/analytics/summary', async (_req, res) => {
  const done = { status: { $ne: 'In Progress' } };
  const [byStatus, totals] = await Promise.all([
    Call.aggregate([{ $match: done }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Call.aggregate([{ $match: done }, { $group: { _id: null, calls: { $sum: 1 }, avgDuration: { $avg: '$duration' } } }]),
  ]);
  const total = totals[0]?.calls || 0;
  const converted = byStatus.find(s => s._id === 'Converted')?.count || 0;
  res.json({ total, avgDuration: Math.round(totals[0]?.avgDuration || 0), conversionRate: total ? Math.round((converted / total) * 100) : 0,
    byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])) });
});

router.get('/', async (_req, res) => {
  res.json(await Call.find({ status: { $ne: 'In Progress' } }).sort({ startedAt: -1 }).limit(50));
});
router.get('/:id', async (req, res) => res.json(await Call.findById(req.params.id)));

export default router;