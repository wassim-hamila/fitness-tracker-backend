const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, trim: true, maxlength: 2000, default: '' },
  attachmentType: { type: String, enum: ['image', 'video', null], default: null },
  attachmentUrl: { type: String, default: null },
  sharedProgram: { type: mongoose.Schema.Types.Mixed, default: null },
  read: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
