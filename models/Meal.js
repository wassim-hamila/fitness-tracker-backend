const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  mealType: {
    type: String,
    required: true,
    enum: ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation']
  },
  foods: [{
    name: String,
    quantity: Number,
    calories: Number
  }],
  totalCalories: {
    type: Number,
    required: true,
    min: 0
  },
  protein: {
    type: Number,
    default: 0,
    min: [0, 'Les protéines ne peuvent pas être négatives']
  },
  carbs: {
    type: Number,
    default: 0,
    min: [0, 'Les glucides ne peuvent pas être négatifs']
  },
  fats: {
    type: Number,
    default: 0,
    min: [0, 'Les lipides ne peuvent pas être négatifs']
  },
  water: {
    type: Number,
    default: 0,
    min: [0, 'L\'eau ne peut pas être négative']
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

mealSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Meal', mealSchema);