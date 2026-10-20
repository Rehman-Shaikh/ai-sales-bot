import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  identifier: { type: String, required: true, unique: true, index: true }, // phone or email
  name: String,
  profile: { businessType: String, teamSize: String, industry: String, role: String },
  requirements: [String],
  budget: String,
  objections: [String],
  lastRecommendedPlan: String,
  followUpStatus: { type: String, default: 'None' },
  lastStatus: String,
  lastSummary: String,
  nextAction: String,
  preferredLanguage: { type: String, default: 'en' },
  callCount: { type: Number, default: 0 },
  lastCallAt: Date,
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
