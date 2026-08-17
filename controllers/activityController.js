const Activity = require('../models/Activity');
const Workout = require('../models/Workout');
const { createNotification } = require('./notificationController');

const WORKOUT_TYPE_MAP = {
  running: 'Course',
  walking: 'Course',
  hiking: 'Course',
  cycling: 'Cyclisme',
};

exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.id }).sort({ date: -1 }).limit(100);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const {
      type, distance, duration, calories, steps, elevationGain,
      avgPace, routePoints, laps, date,
    } = req.body;

    const activity = await Activity.create({
      user: req.user.id,
      type,
      distance: distance || 0,
      duration: duration || 0,
      calories: calories || 0,
      steps: steps || 0,
      elevationGain: elevationGain || 0,
      avgPace: avgPace || 0,
      routePoints: routePoints || [],
      laps: laps || [],
      date: date || new Date(),
    });

    const workoutType = WORKOUT_TYPE_MAP[type] || 'Autre';
    const workout = await Workout.create({
      user: req.user.id,
      type: workoutType,
      duration: Math.max(1, Math.round((duration || 0) / 60)),
      caloriesBurned: calories || 0,
      date: date || new Date(),
      notes: `GPS ${type} — ${(distance || 0).toFixed(2)} km en ${Math.round((duration || 0) / 60)} min`,
      intensity: 'Modérée',
    });

    await createNotification({
      userId: req.user.id,
      title: 'Activité GPS enregistrée',
      message: `${workoutType} : ${(distance || 0).toFixed(2)} km, ${calories || 0} kcal brûlées.`,
      type: 'success',
      relatedId: activity._id,
      relatedType: 'workout',
    });

    res.status(201).json({ activity, workout });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activité non trouvée' });
    if (activity.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }
    await activity.deleteOne();
    res.json({ message: 'Activité supprimée', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};