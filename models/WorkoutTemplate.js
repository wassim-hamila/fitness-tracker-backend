const mongoose = require('mongoose');

const workoutTemplateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  category: {
    type: String,
    enum: ['Full Body', 'Upper Body', 'Lower Body', 'Cardio', 'HIIT', 'Yoga', 'Strength', 'Stretching', 'Autre'],
    default: 'Autre'
  },
  difficulty: {
    type: String,
    enum: ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'],
    default: 'Intermédiaire'
  },
  estimatedDuration: {
    type: Number
  },
  exercises: [{
    name: {
      type: String,
      required: true
    },
    sets: Number,
    reps: Number,
    duration: Number,
    restTime: Number,
    notes: String,
    order: Number
  }],
  tags: [{
    type: String
  }],
  timesUsed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

workoutTemplateSchema.index({ isSystem: 1, category: 1 });

module.exports = mongoose.model('WorkoutTemplate', workoutTemplateSchema);
