const User = require('../models/User');
const Workout = require('../models/Workout');
const Goal = require('../models/Goal');
const Post = require('../models/Post');
const { createNotification } = require('./notificationController');

// @desc    Obtenir le profil public d'un autre utilisateur (avec compteurs)
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id)
      .select('name profilePicture coverPhoto bio goal activityLevel followers following createdAt visibleProgram');

    if (!targetUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const viewerId = req.user.id;
    const isOwnProfile = targetUser._id.toString() === viewerId;
    const isFollowing = targetUser.followers.some((id) => id.toString() === viewerId);
    const isFollowedBy = targetUser.following.some((id) => id.toString() === viewerId);

    const postFilter = isOwnProfile || isFollowing
      ? { user: targetUser._id }
      : { user: targetUser._id, visibility: { $ne: 'private' } };
    const visiblePosts = await Post.find(postFilter).select('likes');
    const totalLikes = visiblePosts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);

    res.json({
      _id: targetUser._id,
      name: targetUser.name,
      profilePicture: targetUser.profilePicture,
      coverPhoto: targetUser.coverPhoto,
      bio: targetUser.bio,
      goal: targetUser.goal,
      activityLevel: targetUser.activityLevel,
      followersCount: targetUser.followers.length,
      followingCount: targetUser.following.length,
      postsCount: visiblePosts.length,
      totalLikes,
      isFollowing,
      isFollowedBy,
      isOwnProfile,
      memberSince: targetUser.createdAt,
      visibleProgram: targetUser.visibleProgram || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir le profil utilisateur
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('followers', 'name email')
      .populate('following', 'name email');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour le profil utilisateur
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, age, weight, height, profilePicture, bio, gender, activityLevel, goal, workoutsPerWeek, trainingType, mealsPerDay, onboardingCompleted, location, website, instagram, twitter, strava, coverPhoto, visibleProgram } = req.body;

    const user = await User.findById(req.user.id);

    if (user) {
      user.name = name || user.name;
      user.age = age !== undefined ? age : user.age;
      user.weight = weight !== undefined ? weight : user.weight;
      user.height = height !== undefined ? height : user.height;
      if (profilePicture !== undefined && profilePicture !== null && profilePicture !== '') {
        user.profilePicture = profilePicture;
      }
      // Champs optionnels si présents sur le modèle (strict:false via set)
      if (bio !== undefined) user.set('bio', bio);
      if (gender !== undefined) user.set('gender', gender);
      if (activityLevel !== undefined) user.set('activityLevel', activityLevel);
      if (goal !== undefined) user.set('goal', goal);
      if (workoutsPerWeek !== undefined) user.set('workoutsPerWeek', workoutsPerWeek);
      if (trainingType !== undefined) user.set('trainingType', trainingType);
      if (mealsPerDay !== undefined) user.set('mealsPerDay', mealsPerDay);
      if (onboardingCompleted !== undefined) user.set('onboardingCompleted', onboardingCompleted);
      if (location !== undefined) user.set('location', location);
      if (website !== undefined) user.set('website', website);
      if (instagram !== undefined) user.set('instagram', instagram);
      if (twitter !== undefined) user.set('twitter', twitter);
      if (strava !== undefined) user.set('strava', strava);
      if (coverPhoto !== undefined && coverPhoto !== '') user.set('coverPhoto', coverPhoto);
      if (visibleProgram !== undefined) user.set('visibleProgram', visibleProgram);

      const updatedUser = await user.save();

      if (profilePicture) {
        await createNotification({
          userId: updatedUser._id,
          title: 'Photo de profil mise à jour',
          message: 'Ta photo s\'affiche maintenant dans le social et dans la barre latérale.',
          type: 'success',
          relatedType: 'program',
        });
      }

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        weight: updatedUser.weight,
        height: updatedUser.height,
        profilePicture: updatedUser.profilePicture,
        bio: updatedUser.bio,
        gender: updatedUser.gender,
        activityLevel: updatedUser.activityLevel,
        goal: updatedUser.goal,
        workoutsPerWeek: updatedUser.workoutsPerWeek,
        trainingType: updatedUser.trainingType,
        mealsPerDay: updatedUser.mealsPerDay,
        onboardingCompleted: updatedUser.onboardingCompleted,
        visibleProgram: updatedUser.visibleProgram,
        location: updatedUser.location,
        website: updatedUser.website,
        instagram: updatedUser.instagram,
        twitter: updatedUser.twitter,
        strava: updatedUser.strava,
        coverPhoto: updatedUser.coverPhoto,
      });
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les statistiques de l'utilisateur
// @route   GET /api/users/stats
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Statistiques des workouts
    const totalWorkouts = await Workout.countDocuments({ user: userId });
    
    const workoutStats = await Workout.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$caloriesBurned' },
          totalDuration: { $sum: '$duration' },
          avgCalories: { $avg: '$caloriesBurned' },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    // Répartition par type d'exercice
    const workoutsByType = await Workout.aggregate([
      { $match: { user: userId } },
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

    // Workouts des 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentWorkouts = await Workout.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 },
          calories: { $sum: '$caloriesBurned' },
          duration: { $sum: '$duration' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Statistiques des objectifs
    const totalGoals = await Goal.countDocuments({ user: userId });
    const completedGoals = await Goal.countDocuments({ user: userId, isCompleted: true });
    const activeGoals = await Goal.countDocuments({ user: userId, isCompleted: false });

    res.json({
      workouts: {
        total: totalWorkouts,
        stats: workoutStats[0] || {
          totalCalories: 0,
          totalDuration: 0,
          avgCalories: 0,
          avgDuration: 0
        },
        byType: workoutsByType,
        recent: recentWorkouts
      },
      goals: {
        total: totalGoals,
        completed: completedGoals,
        active: activeGoals,
        completionRate: totalGoals > 0 ? ((completedGoals / totalGoals) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Suivre un utilisateur (Bonus)
// @route   POST /api/users/follow/:id
// @access  Private
exports.followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous suivre vous-même' });
    }

    if (currentUser.following.includes(req.params.id)) {
      return res.status(400).json({ message: 'Vous suivez déjà cet utilisateur' });
    }

    currentUser.following.push(req.params.id);
    userToFollow.followers.push(req.user.id);

    await currentUser.save();
    await userToFollow.save();

    await createNotification({
      userId: userToFollow._id,
      title: 'Nouveau follower',
      message: `${currentUser.name} a commencé à vous suivre.`,
      type: 'info',
      relatedId: currentUser._id,
      relatedType: 'program',
    });

    res.json({ message: 'Utilisateur suivi avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ne plus suivre un utilisateur (Bonus)
// @route   DELETE /api/users/follow/:id
// @access  Private
exports.unfollowUser = async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToUnfollow) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    currentUser.following = currentUser.following.filter(
      id => id.toString() !== req.params.id
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== req.user.id
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({ message: 'Utilisateur retiré des abonnements' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Utilisateurs suggérés
// @route   GET /api/users/suggested
// @access  Private
exports.getSuggestedUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const excludeIds = [req.user.id, ...currentUser.following.map((id) => id.toString())];

    const users = await User.find({ _id: { $nin: excludeIds } })
      .select('name profilePicture followers following')
      .limit(10);

    res.json(users.map((u) => ({
      _id: u._id,
      name: u.name,
      profilePicture: u.profilePicture,
      followers: u.followers?.length || 0,
      bio: 'Athlète Fitness Tracker',
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir le feed social (Bonus)
// @route   GET /api/users/feed
// @access  Private
exports.getSocialFeed = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    const feedWorkouts = await Workout.find({
      user: { $in: currentUser.following }
    })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(20);

    const recentAchievements = await Goal.find({
      user: { $in: currentUser.following },
      isCompleted: true
    })
      .populate('user', 'name profilePicture')
      .sort({ updatedAt: -1 })
      .limit(10);

    res.json({
      workouts: feedWorkouts,
      achievements: recentAchievements
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};