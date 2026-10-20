import mongoose from 'mongoose';

export const STATUSES = ['Converted', 'Interested', 'Follow-up Required', 'Demo Requested', 'Not Interested', 'No Response'];

const callSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
  customerName: String,
  identifier: String,
  language: { type: String, default: 'en' },
  consent: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  duration: { type: Number, default: 0 }, // seconds
  transcript: [{ role: { type: String, enum: ['user', 'assistant'] }, text: String, ts: { type: Date, default: Date.now } }],
  recordingUrl: String,
  status: { type: String, enum: [...STATUSES, 'In Progress'], default: 'In Progress' },
  summary: {
    bullets: [String],
    profile: { businessType: String, teamSize: String, industry: String, role: String },
    requirements: [String],
    budgetSignals: String,
    objections: [String],
    opportunities: [String],
    recommendedPlan: String,
    nextAction: String,
    followUpNotes: String,
  },
}, { timestamps: true });

export default mongoose.model('Call', callSchema);
