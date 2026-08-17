const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'first_workout',
      'streak_7', 'streak_30', 'streak_100',
      'calories_1000', 'calories_10000', 'calories_50000',
      'workouts_10', 'workouts_50', 'workouts_100',
      'goals_5', 'goals_10', 'goals_25',
      'marathon', 'yoga_master', 'swimmer', 'cyclist',
      'nutrition_tracker', 'week_warrior', 'iron_pumping'
    ]
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  earnedAt: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

badgeSchema.index({ user: 1, earnedAt: -1 });
badgeSchema.index({ user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Badge', badgeSchema);
