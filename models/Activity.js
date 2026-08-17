const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['running', 'cycling', 'walking', 'hiking'],
    required: true,
  },
  distance: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  calories: { type: Number, default: 0 },
  steps: { type: Number, default: 0 },
  elevationGain: { type: Number, default: 0 },
  avgPace: { type: Number, default: 0 },
  routePoints: [{
    lat: Number,
    lng: Number,
    alt: Number,
    timestamp: Number,
  }],
  laps: [{
    distance: Number,
    duration: Number,
    avgSpeed: Number,
    timestamp: Number,
  }],
  date: { type: Date, default: Date.now },
}, { timestamps: true });

activitySchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Activity', activitySchema);