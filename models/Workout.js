const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Le type d\'entraînement est requis'],
    enum: ['Cardio', 'Musculation', 'Yoga', 'Course', 'Natation', 'Cyclisme', 'Autre']
  },
  duration: {
    type: Number,
    required: [true, 'La durée est requise'],
    min: [1, 'La durée doit être au moins 1 minute'],
    max: [1440, 'La durée ne peut pas dépasser 1440 minutes']
  },
  caloriesBurned: {
    type: Number,
    required: [true, 'Les calories brûlées sont requises'],
    min: [0, 'Les calories ne peuvent pas être négatives'],
    max: [10000, 'Les calories ne peuvent pas dépasser 10000']
  },
  date: {
    type: Date,
    default: Date.now
  },
  exercises: [{
    name: String,
    sets: Number,
    reps: Number,
    weight: Number,
    duration: Number,
    restTime: Number,
    notes: String
  }],
  rating: {
    type: Number,
    min: [1, 'La note minimale est 1'],
    max: [5, 'La note maximale est 5']
  },
  intensity: {
    type: String,
    enum: ['Légère', 'Modérée', 'Intense', 'Extrême'],
    default: 'Modérée'
  },
  notes: {
    type: String,
    maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères']
  }
}, {
  timestamps: true
});

workoutSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Workout', workoutSchema);