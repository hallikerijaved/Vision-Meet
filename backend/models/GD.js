const mongoose = require('mongoose');

const gdSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  roomId: { type: String, required: true, unique: true },
  maxParticipants: { type: Number, default: 10 }
}, { timestamps: true });

module.exports = mongoose.model('GD', gdSchema);