const ProgressPhoto = require('../models/ProgressPhoto');

// @desc    Obtenir toutes les photos de progression
// @route   GET /api/progress-photos
// @access  Private
exports.getPhotos = async (req, res) => {
  try {
    const filter = { user: req.user.id };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const photos = await ProgressPhoto.find(filter).sort({ date: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir une photo spécifique
// @route   GET /api/progress-photos/:id
// @access  Private
exports.getPhoto = async (req, res) => {
  try {
    const photo = await ProgressPhoto.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ message: 'Photo non trouvée' });
    }

    if (photo.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    res.json(photo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer une photo de progression
// @route   POST /api/progress-photos
// @access  Private
exports.uploadPhoto = async (req, res) => {
  try {
    const { url, type, date, notes, weight } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'L\'URL de la photo est requise' });
    }

    if (!type) {
      return res.status(400).json({ message: 'Le type de photo est requis' });
    }

    const photo = await ProgressPhoto.create({
      user: req.user.id,
      url,
      type,
      date,
      notes,
      weight
    });

    res.status(201).json(photo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer une photo de progression
// @route   DELETE /api/progress-photos/:id
// @access  Private
exports.deletePhoto = async (req, res) => {
  try {
    const photo = await ProgressPhoto.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({ message: 'Photo non trouvée' });
    }

    if (photo.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await photo.deleteOne();
    res.json({ message: 'Photo supprimée', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les photos groupées par mois (timeline)
// @route   GET /api/progress-photos/timeline
// @access  Private
exports.getPhotoTimeline = async (req, res) => {
  try {
    const photos = await ProgressPhoto.find({ user: req.user.id }).sort({ date: -1 });

    const timeline = {};
    photos.forEach(photo => {
      const date = new Date(photo.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!timeline[monthKey]) {
        timeline[monthKey] = [];
      }

      timeline[monthKey].push(photo);
    });

    // Convertir en tableau trié
    const result = Object.entries(timeline)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, photos]) => ({ month, photos }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
