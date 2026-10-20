import mongoose from 'mongoose';

// Call audio is stored in MongoDB so it survives server restarts on free hosting.
export default mongoose.model('Recording', new mongoose.Schema({
  callId: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  data: Buffer,
  mime: String,
}));