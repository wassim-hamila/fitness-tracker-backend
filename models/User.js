const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: 6,
    select: false
  },
  age: {
    type: Number,
    min: 13,
    max: 120
  },
  weight: {
    type: Number,
    min: 20,
    max: 300
  },
  height: {
    type: Number,
    min: 50,
    max: 300
  },
  profilePicture: {
    type: String,
    default: ''
  },
  coverPhoto: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  gender: {
    type: String,
    default: ''
  },
  activityLevel: {
    type: String,
    default: ''
  },
  goal: {
    type: String,
    default: ''
  },
  workoutsPerWeek: {
    type: String,
    default: ''
  },
  trainingType: {
    type: String,
    default: ''
  },
  mealsPerDay: {
    type: String,
    default: ''
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  visibleProgram: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  location: {
    type: String,
    default: ''
  },
  website: String,
  instagram: String,
  twitter: String,
  strava: String,
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Hash password avant sauvegarde (uniquement si le mot de passe a changé)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Méthode pour comparer les mots de passe
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);