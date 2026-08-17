const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Le nom du programme est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  totalWorkouts: {
    type: Number,
    default: 0,
    min: 0
  },
  completedWorkouts: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  schedule: [{
    day: Number,
    workoutType: String,
    duration: Number,
    description: String,
    isCompleted: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

programSchema.index({ user: 1, isActive: -1 });

module.exports = mongoose.model('Program', programSchema);
