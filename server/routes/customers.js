import { Router } from 'express';
import Customer from '../models/Customer.js';

const router = Router();
router.get('/lookup', async (req, res) => {
  const c = await Customer.findOne({ identifier: String(req.query.identifier || '').trim().toLowerCase() });
  res.json(c || null);
});
router.get('/', async (_req, res) => res.json(await Customer.find().sort({ lastCallAt: -1 }).limit(50)));
export default router;
