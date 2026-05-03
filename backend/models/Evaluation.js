const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  gdId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  gdTitle: { type: String, required: true },
  scores: {
    clarity: { type: Number, required: true },
    relevance: { type: Number, required: true },
    engagement: { type: Number, required: true },
    professionalism: { type: Number, required: true },
    totalScore: { type: Number, required: true }
  },
  feedback: { type: String, required: true },
  strengths: [String],
  improvements: [String],
  messageCount: { type: Number, default: 0 },
  speakingTime: { type: Number, default: 0 },
  blockchainCertificate: {
    certificateId: String,
    blockHash: String,
    blockIndex: Number,
    timestamp: Date
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Evaluation', evaluationSchema);
