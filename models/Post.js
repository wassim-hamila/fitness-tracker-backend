const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  imageUrl: { type: String },
  postType: { type: String, enum: ['regular', 'question', 'poll', 'workout', 'achievement'], default: 'regular' },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  location: { type: String, trim: true, maxlength: 200 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
}, { timestamps: true });

postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);