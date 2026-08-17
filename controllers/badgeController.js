const Badge = require('../models/Badge');
const Workout = require('../models/Workout');
const Goal = require('../models/Goal');
const Meal = require('../models/Meal');

// Définition des badges
const BADGE_DEFINITIONS = {
  first_workout: { name: 'Premier Entraînement', description: 'Premier entraînement effectué', icon: '🌟' },
  streak_7: { name: 'Semaine Consécutive', description: '7 jours consécutifs d\'entraînement', icon: '🔥' },
  streak_30: { name: 'Mois Consécutif', description: '30 jours consécutifs d\'entraînement', icon: '🔥' },
  streak_100: { name: 'Centenaire', description: '100 jours consécutifs d\'entraînement', icon: '🔥' },
  calories_1000: { name: 'Brûleur Débutant', description: '1 000 calories brûlées au total', icon: '💨' },
  calories_10000: { name: 'Brûleur Avancé', description: '10 000 calories brûlées au total', icon: '💨' },
  calories_50000: { name: 'Brûleur Légendaire', description: '50 000 calories brûlées au total', icon: '💨' },
  workouts_10: { name: 'Régulier', description: '10 entraînements effectués', icon: '💪' },
  workouts_50: { name: 'Assidu', description: '50 entraînements effectués', icon: '💪' },
  workouts_100: { name: 'Militant', description: '100 entraînements effectués', icon: '💪' },
  goals_5: { name: 'Objectifs Atteints', description: '5 objectifs complétés', icon: '🎯' },
  goals_10: { name: 'Chasseur d\'Objectifs', description: '10 objectifs complétés', icon: '🎯' },
  goals_25: { name: 'Maître des Objectifs', description: '25 objectifs complétés', icon: '🎯' },
  marathon: { name: 'Marathonien', description: '10+ entraînements de Course', icon: '🏃' },
  yoga_master: { name: 'Maître Yogi', description: '20+ entraînements de Yoga', icon: '🧘' },
  swimmer: { name: 'Nageur', description: '15+ entraînements de Natation', icon: '🏊' },
  cyclist: { name: 'Cycliste', description: '15+ entraînements de Cyclisme', icon: '🚴' },
  nutrition_tracker: { name: 'Traqueur Nutrition', description: '7 jours consécutifs avec repas enregistrés', icon: '🥗' },
  week_warrior: { name: 'Guerrier de la Semaine', description: 'Entraînements sur les 7 jours de la semaine', icon: '⚔️' },
  iron_pumping: { name: 'Fée du Logis', description: '50+ entraînements de Musculation', icon: '🏋️' }
};

// @desc    Obtenir tous les badges de l'utilisateur
// @route   GET /api/badges
// @access  Private
exports.getBadges = async (req, res) => {
  try {
    const badges = await Badge.find({ user: req.user.id }).sort({ earnedAt: -1 });
    res.json(badges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Marquer un badge comme lu
// @route   PUT /api/badges/:id/read
// @access  Private
exports.markBadgeAsRead = async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);

    if (!badge) {
      return res.status(404).json({ message: 'Badge non trouvé' });
    }

    if (badge.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    badge.isRead = true;
    await badge.save();

    res.json(badge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fonction utilitaire pour calculer le streak
const calculateStreak = async (userId) => {
  const workouts = await Workout.find({ user: userId })
    .select('date')
    .sort({ date: -1 });

  if (workouts.length === 0) return 0;

  const workoutDates = [...new Set(
    workouts.map(w => new Date(w.date).toISOString().split('T')[0])
  )].sort().reverse();

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestDate = new Date(workoutDates[0]);
  latestDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return 0;

  for (let i = 1; i < workoutDates.length; i++) {
    const current = new Date(workoutDates[i - 1]);
    const prev = new Date(workoutDates[i]);
    const diff = Math.floor((current - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

// Fonction utilitaire pour calculer le streak le plus long
const calculateLongestStreak = async (userId) => {
  const workouts = await Workout.find({ user: userId })
    .select('date')
    .sort({ date: 1 });

  if (workouts.length === 0) return 0;

  const workoutDates = [...new Set(
    workouts.map(w => new Date(w.date).toISOString().split('T')[0])
  )].sort();

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < workoutDates.length; i++) {
    const current = new Date(workoutDates[i]);
    const prev = new Date(workoutDates[i - 1]);
    const diff = Math.floor((current - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (diff > 1) {
      currentStreak = 1;
    }
  }

  return longestStreak;
};

// Fonction utilitaire pour vérifier le nutrition_tracker
const checkNutritionStreak = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const mealDays = await Meal.distinct('date', {
    user: userId,
    date: { $gte: sevenDaysAgo, $lt: today }
  });

  // Vérifier 7 jours consécutifs
  const days = mealDays.map(d => new Date(d).toISOString().split('T')[0]).sort();
  let streak = 1;
  let maxStreak = 1;

  for (let i = 1; i < days.length; i++) {
    const current = new Date(days[i]);
    const prev = new Date(days[i - 1]);
    const diff = Math.floor((current - prev) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else if (diff > 1) {
      streak = 1;
    }
  }

  return maxStreak >= 7;
};

// Fonction utilitaire pour vérifier week_warrior
const checkWeekWarrior = async (userId) => {
  const workouts = await Workout.find({ user: userId }).select('date');

  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
  const workoutDaySet = new Set();

  workouts.forEach(w => {
    const dayOfWeek = new Date(w.date).getDay();
    workoutDaySet.add(dayOfWeek);
  });

  // Vérifier s'il existe une semaine complète
  // On regroupe les workouts par semaine
  const workoutsByWeek = {};
  workouts.forEach(w => {
    const date = new Date(w.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    if (!workoutsByWeek[weekKey]) {
      workoutsByWeek[weekKey] = new Set();
    }
    workoutsByWeek[weekKey].add(date.getDay());
  });

  return Object.values(workoutsByWeek).some(days => days.size === 7);
};

// @desc    Vérifier et attribuer des badges
// @route   Internal use only
// @access  Private
exports.checkAndAwardBadges = async (userId) => {
  try {
    const newBadges = [];

    // Statistiques de base
    const totalWorkouts = await Workout.countDocuments({ user: userId });
    const completedGoals = await Goal.countDocuments({ user: userId, isCompleted: true });
    const currentStreak = await calculateStreak(userId);

    const calorieStats = await Workout.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, totalCalories: { $sum: '$caloriesBurned' } } }
    ]);
    const totalCalories = calorieStats[0]?.totalCalories || 0;

    // Workouts par type
    const workoutsByType = await Workout.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const typeCounts = {};
    workoutsByType.forEach(item => {
      typeCounts[item._id] = item.count;
    });

    // Vérifier et attribuer first_workout
    if (totalWorkouts >= 1) {
      const badge = await awardBadge(userId, 'first_workout');
      if (badge) newBadges.push(badge);
    }

    // Vérifier streak badges
    if (currentStreak >= 7) {
      const badge = await awardBadge(userId, 'streak_7');
      if (badge) newBadges.push(badge);
    }
    if (currentStreak >= 30) {
      const badge = await awardBadge(userId, 'streak_30');
      if (badge) newBadges.push(badge);
    }
    if (currentStreak >= 100) {
      const badge = await awardBadge(userId, 'streak_100');
      if (badge) newBadges.push(badge);
    }

    // Vérifier calories badges
    if (totalCalories >= 1000) {
      const badge = await awardBadge(userId, 'calories_1000');
      if (badge) newBadges.push(badge);
    }
    if (totalCalories >= 10000) {
      const badge = await awardBadge(userId, 'calories_10000');
      if (badge) newBadges.push(badge);
    }
    if (totalCalories >= 50000) {
      const badge = await awardBadge(userId, 'calories_50000');
      if (badge) newBadges.push(badge);
    }

    // Vérifier workouts count badges
    if (totalWorkouts >= 10) {
      const badge = await awardBadge(userId, 'workouts_10');
      if (badge) newBadges.push(badge);
    }
    if (totalWorkouts >= 50) {
      const badge = await awardBadge(userId, 'workouts_50');
      if (badge) newBadges.push(badge);
    }
    if (totalWorkouts >= 100) {
      const badge = await awardBadge(userId, 'workouts_100');
      if (badge) newBadges.push(badge);
    }

    // Vérifier goals badges
    if (completedGoals >= 5) {
      const badge = await awardBadge(userId, 'goals_5');
      if (badge) newBadges.push(badge);
    }
    if (completedGoals >= 10) {
      const badge = await awardBadge(userId, 'goals_10');
      if (badge) newBadges.push(badge);
    }
    if (completedGoals >= 25) {
      const badge = await awardBadge(userId, 'goals_25');
      if (badge) newBadges.push(badge);
    }

    // Vérifier marathon (10+ Course workouts)
    if ((typeCounts['Course'] || 0) >= 10) {
      const badge = await awardBadge(userId, 'marathon');
      if (badge) newBadges.push(badge);
    }

    // Vérifier yoga_master (20+ Yoga workouts)
    if ((typeCounts['Yoga'] || 0) >= 20) {
      const badge = await awardBadge(userId, 'yoga_master');
      if (badge) newBadges.push(badge);
    }

    // Vérifier swimmer (15+ Natation workouts)
    if ((typeCounts['Natation'] || 0) >= 15) {
      const badge = await awardBadge(userId, 'swimmer');
      if (badge) newBadges.push(badge);
    }

    // Vérifier cyclist (15+ Cyclisme workouts)
    if ((typeCounts['Cyclisme'] || 0) >= 15) {
      const badge = await awardBadge(userId, 'cyclist');
      if (badge) newBadges.push(badge);
    }

    // Vérifier iron_pumping (50+ Musculation workouts)
    if ((typeCounts['Musculation'] || 0) >= 50) {
      const badge = await awardBadge(userId, 'iron_pumping');
      if (badge) newBadges.push(badge);
    }

    // Vérifier nutrition_tracker
    const hasNutritionStreak = await checkNutritionStreak(userId);
    if (hasNutritionStreak) {
      const badge = await awardBadge(userId, 'nutrition_tracker');
      if (badge) newBadges.push(badge);
    }

    // Vérifier week_warrior
    const isWeekWarrior = await checkWeekWarrior(userId);
    if (isWeekWarrior) {
      const badge = await awardBadge(userId, 'week_warrior');
      if (badge) newBadges.push(badge);
    }

    return newBadges;
  } catch (error) {
    console.error('Erreur lors de la vérification des badges:', error.message);
    return [];
  }
};

// Fonction utilitaire pour attribuer un badge
const awardBadge = async (userId, badgeType) => {
  try {
    const existing = await Badge.findOne({ user: userId, type: badgeType });
    if (existing) return null;

    const definition = BADGE_DEFINITIONS[badgeType];
    if (!definition) return null;

    const badge = await Badge.create({
      user: userId,
      type: badgeType,
      name: definition.name,
      description: definition.description,
      icon: definition.icon
    });

    return badge;
  } catch (error) {
    console.error('Erreur lors de l\'attribution du badge:', error.message);
    return null;
  }
};
