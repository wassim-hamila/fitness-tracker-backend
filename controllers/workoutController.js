const Workout = require('../models/Workout');
const { checkAndAwardBadges } = require('./badgeController');
const { createNotification } = require('./notificationController');

// @desc    Obtenir tous les workouts de l'utilisateur
// @route   GET /api/workouts
// @access  Private
exports.getWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id }).sort({ date: -1 });
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un workout spécifique
// @route   GET /api/workouts/:id
// @access  Private
exports.getWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ message: 'Workout non trouvé' });
    }

    if (workout.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    res.json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer un workout
// @route   POST /api/workouts
// @access  Private
exports.createWorkout = async (req, res) => {
  try {
    const {
      type,
      duration,
      caloriesBurned,
      date,
      notes,
      exercises,
      intensity,
      rating,
    } = req.body;

    const workout = await Workout.create({
      user: req.user.id,
      type,
      duration,
      caloriesBurned,
      date,
      notes,
      exercises: exercises || [],
      intensity: intensity || 'Modérée',
      rating,
    });

    await createNotification({
      userId: req.user.id,
      title: 'Séance terminée !',
      message: `Bravo ! Séance de ${type} enregistrée (${duration} min, ${caloriesBurned || 0} kcal).`,
      type: 'success',
      relatedId: workout._id,
      relatedType: 'workout',
    });

    const newBadges = await checkAndAwardBadges(req.user.id);
    for (const badge of newBadges) {
      await createNotification({
        userId: req.user.id,
        title: 'Nouveau badge débloqué !',
        message: `${badge.icon || '🏆'} ${badge.name} — ${badge.description}`,
        type: 'achievement',
        relatedId: badge._id,
        relatedType: 'badge',
      });
    }

    res.status(201).json({ ...workout.toObject(), newBadges });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un workout
// @route   PUT /api/workouts/:id
// @access  Private
exports.updateWorkout = async (req, res) => {
  try {
    let workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ message: 'Workout non trouvé' });
    }

    if (workout.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    workout = await Workout.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un workout
// @route   DELETE /api/workouts/:id
// @access  Private
exports.deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ message: 'Workout non trouvé' });
    }

    if (workout.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await workout.deleteOne();
    res.json({ message: 'Workout supprimé', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};