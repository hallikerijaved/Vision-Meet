const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  difficulty: { type: String, required: true },
  jobDescription: { type: String, default: '' },
  interviewType: { type: String, default: 'text' },
  currentQuestion: { type: String, default: null },
  questions: [{
    question: String,
    userAnswer: String,
    score: Number,
    feedback: String,
    videoData: String
  }],
  overallScore: Number,
  strengths: [String],
  weaknesses: [String],
  improvements: [String],
  status: { type: String, default: 'in-progress' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Interview', interviewSchema);
