const mongoose = require('mongoose');

const socialInteractionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['like', 'comment']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['workout', 'goal', 'achievement']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  content: {
    type: String,
    maxlength: [300, 'Le contenu ne peut pas dépasser 300 caractères']
  }
}, {
  timestamps: true
});

socialInteractionSchema.index({ targetId: 1, type: 1 });
socialInteractionSchema.index({ user: 1, targetType: 1, targetId: 1, type: 1 }, { unique: true });

// Validate that content is required for comments
socialInteractionSchema.pre('save', function(next) {
  if (this.type === 'comment' && !this.content) {
    return next(new Error('Le contenu est requis pour un commentaire'));
  }
  next();
});

module.exports = mongoose.model('SocialInteraction', socialInteractionSchema);
