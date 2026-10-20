import dotenv from 'dotenv';
dotenv.config({ override: true }); // .env always wins over old system variables
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import callRoutes from './routes/calls.js';
import chatRoutes from './routes/chat.js';
import customerRoutes from './routes/customers.js';
import ttsRoutes from './routes/tts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = k => process.env[k]?.trim();

if (!env('MONGODB_URI')) {
  console.error('MONGODB_URI is missing. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}
if (!env('GROQ_API_KEY') && !env('GEMINI_API_KEY')) {
  console.warn('WARNING: no GROQ_API_KEY or GEMINI_API_KEY in server/.env, so the AI cannot reply.');
}
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

const app = express();
app.use(cors({ origin: env('CLIENT_URL') ? env('CLIENT_URL').split(',').map(s => s.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/calls', callRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/tts', ttsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

try {
  await mongoose.connect(env('MONGODB_URI'), { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected');
} catch (e) {
  console.error('Could not connect to MongoDB:', e.message);
  console.error('Check the username/password in MONGODB_URI and that Atlas Network Access allows your IP (0.0.0.0/0).');
  process.exit(1);
}
const port = env('PORT') || 5000;
app.listen(port, () => console.log(`API on port ${port}  |  AI check: http://localhost:${port}/api/chat/diagnose`));
