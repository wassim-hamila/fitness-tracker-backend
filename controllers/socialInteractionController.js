const SocialInteraction = require('../models/SocialInteraction');
const Workout = require('../models/Workout');
const Goal = require('../models/Goal');
const User = require('../models/User');

// @desc    Liker/unliker un workout
// @route   POST /api/social/like/workout/:id
// @access  Private
exports.likeWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(404).json({ message: 'Workout non trouvé' });
    }

    const existingLike = await SocialInteraction.findOne({
      user: req.user.id,
      targetId: req.params.id,
      targetType: 'workout',
      type: 'like'
    });

    if (existingLike) {
      await existingLike.deleteOne();
      res.json({ liked: false, message: 'Like retiré' });
    } else {
      await SocialInteraction.create({
        type: 'like',
        user: req.user.id,
        targetId: req.params.id,
        targetType: 'workout'
      });
      res.json({ liked: true, message: 'Workout liké' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Liker/unliker un objectif
// @route   POST /api/social/like/goal/:id
// @access  Private
exports.likeGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ message: 'Objectif non trouvé' });
    }

    const existingLike = await SocialInteraction.findOne({
      user: req.user.id,
      targetId: req.params.id,
      targetType: 'goal',
      type: 'like'
    });

    if (existingLike) {
      await existingLike.deleteOne();
      res.json({ liked: false, message: 'Like retiré' });
    } else {
      await SocialInteraction.create({
        type: 'like',
        user: req.user.id,
        targetId: req.params.id,
        targetType: 'goal'
      });
      res.json({ liked: true, message: 'Objectif liké' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ajouter un commentaire
// @route   POST /api/social/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { targetId, targetType, content } = req.body;

    if (!targetId || !targetType || !content) {
      return res.status(400).json({ message: 'TargetId, targetType et contenu sont requis' });
    }

    if (!['workout', 'goal'].includes(targetType)) {
      return res.status(400).json({ message: 'Type de cible invalide' });
    }

    // Vérifier que la cible existe
    const TargetModel = targetType === 'workout' ? Workout : Goal;
    const target = await TargetModel.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: `${targetType === 'workout' ? 'Workout' : 'Objectif'} non trouvé` });
    }

    const comment = await SocialInteraction.create({
      type: 'comment',
      user: req.user.id,
      targetId,
      targetType,
      content
    });

    await comment.populate('user', 'name profilePicture');

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les commentaires d'une cible
// @route   GET /api/social/comments/:targetType/:targetId
// @access  Private
exports.getComments = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    if (!['workout', 'goal'].includes(targetType)) {
      return res.status(400).json({ message: 'Type de cible invalide' });
    }

    const comments = await SocialInteraction.find({
      targetId,
      targetType,
      type: 'comment'
    })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un commentaire
// @route   DELETE /api/social/comments/:id
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const comment = await SocialInteraction.findOne({
      _id: req.params.id,
      type: 'comment'
    });

    if (!comment) {
      return res.status(404).json({ message: 'Commentaire non trouvé' });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await comment.deleteOne();
    res.json({ message: 'Commentaire supprimé', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir le classement
// @route   GET /api/social/leaderboard
// @access  Private
exports.getLeaderboard = async (req, res) => {
  try {
    const period = req.query.period || 'all';

    let dateFilter = {};
    const now = new Date();

    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      dateFilter = { date: { $gte: weekAgo } };
    } else if (period === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      dateFilter = { date: { $gte: monthAgo } };
    }

    // Classement par calories brûlées
    const caloriesLeaderboard = await Workout.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$user',
          totalCalories: { $sum: '$caloriesBurned' }
        }
      },
      { $sort: { totalCalories: -1 } },
      { $limit: 10 }
    ]);

    // Classement par nombre de workouts
    const workoutsLeaderboard = await Workout.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$user',
          totalWorkouts: { $sum: 1 }
        }
      },
      { $sort: { totalWorkouts: -1 } },
      { $limit: 10 }
    ]);

    // Classement par streak
    const userIds = await Workout.distinct('user', dateFilter);
    const streakData = [];

    for (const uId of userIds) {
      const workouts = await Workout.find({ user: uId }).select('date').sort({ date: -1 });
      const workoutDates = [...new Set(
        workouts.map(w => new Date(w.date).toISOString().split('T')[0])
      )].sort().reverse();

      let streak = 0;
      if (workoutDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const latestDate = new Date(workoutDates[0]);
        latestDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          streak = 1;
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
        }
      }

      streakData.push({ userId: uId, streak });
    }

    streakData.sort((a, b) => b.streak - a.streak);

    // Peupler les informations utilisateur
    const userIdsCalories = caloriesLeaderboard.map(item => item._id);
    const userIdsWorkouts = workoutsLeaderboard.map(item => item._id);
    const allUserIds = [...new Set([...userIdsCalories, ...userIdsWorkouts, ...streakData.map(s => s.userId)])];

    const users = await User.find({ _id: { $in: allUserIds } }).select('name profilePicture');
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = { name: u.name, profilePicture: u.profilePicture };
    });

    const formatLeaderboard = (data, valueKey) =>
      data.map((item, index) => ({
        rank: index + 1,
        user: userMap[item._id?.toString()] || userMap[item.userId?.toString()] || { name: 'Inconnu', profilePicture: '' },
        userId: item._id || item.userId,
        [valueKey]: item[valueKey]
      }));

    res.json({
      calories: formatLeaderboard(caloriesLeaderboard, 'totalCalories'),
      workouts: formatLeaderboard(workoutsLeaderboard, 'totalWorkouts'),
      streak: formatLeaderboard(streakData.slice(0, 10), 'streak')
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
