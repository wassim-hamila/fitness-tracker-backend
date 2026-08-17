const Workout = require('../models/Workout');
const Goal = require('../models/Goal');
const Meal = require('../models/Meal');

// @desc    Obtenir les statistiques avancées
// @route   GET /api/stats/advanced
// @access  Private
exports.getAdvancedStats = async (req, res) => {
  try {
    const period = parseInt(req.query.period) || 30;
    const userId = req.user.id;

    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - period);
    periodStart.setHours(0, 0, 0, 0);

    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - period);

    // 1. Évolution des workouts sur la période
    let groupFormat;
    if (period <= 30) {
      groupFormat = '%Y-%m-%d'; // Journalier
    } else {
      groupFormat = '%Y-%U'; // Hebdomadaire
    }

    const workoutEvolution = await Workout.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: periodStart }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$date' } },
          count: { $sum: 1 },
          totalCalories: { $sum: '$caloriesBurned' },
          totalDuration: { $sum: '$duration' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Tendances des calories
    const calorieTrends = await Workout.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: periodStart }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$date' } },
          caloriesBurned: { $sum: '$caloriesBurned' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Tendances de la durée
    const durationTrends = await Workout.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: periodStart }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$date' } },
          totalDuration: { $sum: '$duration' },
          avgDuration: { $avg: '$duration' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. Répartition par type de workout
    const typeDistribution = await Workout.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: periodStart }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalCalories: { $sum: '$caloriesBurned' },
          totalDuration: { $sum: '$duration' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 5. Meilleures performances
    const bestWorkout = await Workout.findOne({ user: userId, date: { $gte: periodStart } })
      .sort({ caloriesBurned: -1 })
      .limit(1);

    const longestWorkout = await Workout.findOne({ user: userId, date: { $gte: periodStart } })
      .sort({ duration: -1 })
      .limit(1);

    const periodStats = await Workout.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: periodStart }
        }
      },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$caloriesBurned' },
          totalDuration: { $sum: '$duration' },
          totalWorkouts: { $sum: 1 },
          avgCalories: { $avg: '$caloriesBurned' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    const bestPerformances = {
      mostCalories: bestWorkout ? { calories: bestWorkout.caloriesBurned, date: bestWorkout.date, type: bestWorkout.type } : null,
      longestDuration: longestWorkout ? { duration: longestWorkout.duration, date: longestWorkout.date, type: longestWorkout.type } : null,
      summary: periodStats[0] || {
        totalCalories: 0,
        totalDuration: 0,
        totalWorkouts: 0,
        avgCalories: 0,
        avgDuration: 0
      }
    };

    // 6. Informations de streak
    const streakInfo = await getStreakData(userId);

    // 7. Heatmap d'activité (365 derniers jours)
    const heatmapStart = new Date();
    heatmapStart.setDate(heatmapStart.getDate() - 365);
    heatmapStart.setHours(0, 0, 0, 0);

    const heatmapData = await Workout.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: heatmapStart }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
          calories: { $sum: '$caloriesBurned' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 8. Comparaison avec la période précédente
    const previousPeriodStats = await Workout.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: previousPeriodStart, $lt: periodStart }
        }
      },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$caloriesBurned' },
          totalDuration: { $sum: '$duration' },
          totalWorkouts: { $sum: 1 }
        }
      }
    ]);

    const currentStats = periodStats[0] || { totalCalories: 0, totalDuration: 0, totalWorkouts: 0 };
    const prevStats = previousPeriodStats[0] || { totalCalories: 0, totalDuration: 0, totalWorkouts: 0 };

    const comparison = {
      calories: {
        current: currentStats.totalCalories || 0,
        previous: prevStats.totalCalories || 0,
        change: prevStats.totalCalories
          ? (((currentStats.totalCalories || 0) - prevStats.totalCalories) / prevStats.totalCalories * 100).toFixed(1)
          : null
      },
      duration: {
        current: currentStats.totalDuration || 0,
        previous: prevStats.totalDuration || 0,
        change: prevStats.totalDuration
          ? (((currentStats.totalDuration || 0) - prevStats.totalDuration) / prevStats.totalDuration * 100).toFixed(1)
          : null
      },
      workouts: {
        current: currentStats.totalWorkouts || 0,
        previous: prevStats.totalWorkouts || 0,
        change: prevStats.totalWorkouts
          ? (((currentStats.totalWorkouts || 0) - prevStats.totalWorkouts) / prevStats.totalWorkouts * 100).toFixed(1)
          : null
      }
    };

    res.json({
      period,
      workoutEvolution,
      calorieTrends,
      durationTrends,
      typeDistribution,
      bestPerformances,
      streakInfo,
      heatmapData,
      comparison
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les informations de streak
// @route   GET /api/stats/streak
// @access  Private
exports.getStreakInfo = async (req, res) => {
  try {
    const streakInfo = await getStreakData(req.user.id);
    res.json(streakInfo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fonction utilitaire pour calculer les données de streak
const getStreakData = async (userId) => {
  const workouts = await Workout.find({ user: userId })
    .select('date')
    .sort({ date: -1 });

  if (workouts.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalWorkoutDays: 0,
      lastWorkoutDate: null
    };
  }

  const workoutDates = [...new Set(
    workouts.map(w => new Date(w.date).toISOString().split('T')[0])
  )].sort().reverse();

  // Streak actuel
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestDate = new Date(workoutDates[0]);
  latestDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) {
    currentStreak = 1;
    for (let i = 1; i < workoutDates.length; i++) {
      const current = new Date(workoutDates[i - 1]);
      const prev = new Date(workoutDates[i]);
      const diff = Math.floor((current - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Streak le plus long
  const sortedDates = [...workoutDates].sort();
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i]);
    const prev = new Date(sortedDates[i - 1]);
    const diff = Math.floor((current - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else if (diff > 1) {
      tempStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalWorkoutDays: workoutDates.length,
    lastWorkoutDate: workoutDates[0]
  };
};
