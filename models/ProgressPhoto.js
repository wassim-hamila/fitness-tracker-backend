const mongoose = require('mongoose');

const progressPhotoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  url: {
    type: String,
    required: [true, 'L\'URL de la photo est requise']
  },
  type: {
    type: String,
    enum: ['front', 'back', 'side'],
    required: [true, 'Le type de photo est requis']
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères']
  },
  weight: {
    type: Number,
    min: [20, 'Le poids minimum est 20 kg'],
    max: [300, 'Le poids maximum est 300 kg']
  }
}, {
  timestamps: true
});

progressPhotoSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('ProgressPhoto', progressPhotoSchema);
