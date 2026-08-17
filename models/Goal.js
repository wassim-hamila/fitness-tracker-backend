const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Le type d\'objectif est requis'],
    enum: ['Poids', 'Heures d\'entraînement', 'Calories brûlées', 'Distance', 'Autre']
  },
  targetValue: {
    type: Number,
    required: [true, 'La valeur cible est requise'],
    min: [0, 'La valeur cible doit être positive']
  },
  currentValue: {
    type: Number,
    default: 0,
    min: [0, 'La valeur actuelle doit être positive']
  },
  deadline: {
    type: Date,
    required: [true, 'La date limite est requise']
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  }
}, {
  timestamps: true
});

// Middleware pour mettre à jour isCompleted
goalSchema.pre('save', function(next) {
  if (this.currentValue >= this.targetValue) {
    this.isCompleted = true;
  }
  next();
});

goalSchema.index({ user: 1, isCompleted: 1 });

module.exports = mongoose.model('Goal', goalSchema);