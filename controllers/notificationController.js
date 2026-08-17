const Notification = require('../models/Notification');
const Workout = require('../models/Workout');
const Goal = require('../models/Goal');
const Meal = require('../models/Meal');
const Post = require('../models/Post');

const ensureDailyReminders = async (userId) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const totalNotifs = await Notification.countDocuments({ user: userId });
  if (totalNotifs === 0) {
    await exports.createNotification({
      userId,
      title: 'Bienvenue sur FitTrack ! 💪',
      message: 'Explore les exercices, suis ta nutrition, publie sur le social et suis tes objectifs.',
      type: 'info',
    });
    await exports.createNotification({
      userId,
      title: 'Astuce du jour',
      message: 'Ajoute une photo de profil : elle s\'affiche dans le fil social et à côté du thème clair/sombre.',
      type: 'info',
      relatedType: 'program',
    });
  }

  const todayWorkouts = await Workout.countDocuments({
    user: userId,
    date: { $gte: todayStart, $lt: tomorrow },
  });

  if (todayWorkouts === 0 && now.getHours() >= 10) {
    const existing = await Notification.findOne({
      user: userId,
      type: 'reminder',
      title: 'Rappel entraînement',
      createdAt: { $gte: todayStart },
    });

    if (!existing) {
      await exports.createNotification({
        userId,
        title: 'Rappel entraînement',
        message: "Tu n'as pas encore enregistré de séance aujourd'hui. Ouvre Programmes ou la bibliothèque d'exercices !",
        type: 'reminder',
        relatedType: 'workout',
      });
    }
  }

  const todayMeals = await Meal.countDocuments({
    user: userId,
    date: { $gte: todayStart, $lt: tomorrow },
  });

  if (todayMeals === 0 && now.getHours() >= 12 && now.getHours() < 15) {
    const existingMeal = await Notification.findOne({
      user: userId,
      type: 'reminder',
      title: 'Nutrition',
      createdAt: { $gte: todayStart },
    });
    if (!existingMeal) {
      await exports.createNotification({
        userId,
        title: 'Nutrition',
        message: "N'oublie pas de logger ton déjeuner pour suivre tes macros du jour.",
        type: 'reminder',
        relatedType: 'meal',
      });
    }
  }

  const myPosts = await Post.countDocuments({ user: userId });
  if (myPosts === 0) {
    const existingSocial = await Notification.findOne({
      user: userId,
      title: 'Rejoins le social',
      createdAt: { $gte: todayStart },
    });
    if (!existingSocial) {
      await exports.createNotification({
        userId,
        title: 'Rejoins le social',
        message: 'Partage ta première séance ou pose une question à la communauté !',
        type: 'info',
        relatedType: 'program',
      });
    }
  }

  const activeGoals = await Goal.find({ user: userId, isCompleted: false });
  for (const goal of activeGoals) {
    if (!goal.deadline) continue;
    const daysLeft = Math.ceil((new Date(goal.deadline) - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0 && daysLeft <= 3) {
      const existing = await Notification.findOne({
        user: userId,
        type: 'warning',
        relatedId: goal._id,
        createdAt: { $gte: todayStart },
      });
      if (!existing) {
        await exports.createNotification({
          userId,
          title: 'Objectif bientôt expiré',
          message: `"${goal.type}" expire dans ${daysLeft} jour(s). Donne tout !`,
          type: 'warning',
          relatedId: goal._id,
          relatedType: 'goal',
        });
      }
    }
  }

  // Récap hebdo simple (lundi matin)
  if (now.getDay() === 1 && now.getHours() >= 8 && now.getHours() < 12) {
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekWorkouts = await Workout.countDocuments({
      user: userId,
      date: { $gte: weekStart, $lt: tomorrow },
    });
    const existingWeekly = await Notification.findOne({
      user: userId,
      title: 'Récap de la semaine',
      createdAt: { $gte: todayStart },
    });
    if (!existingWeekly) {
      await exports.createNotification({
        userId,
        title: 'Récap de la semaine',
        message: `Tu as fait ${weekWorkouts} séance(s) la semaine dernière. Consulte tes stats pour progresser !`,
        type: 'success',
        relatedType: 'workout',
      });
    }
  }
};

// @desc    Obtenir toutes les notifications de l'utilisateur
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    await ensureDailyReminders(req.user.id);

    const filter = { user: req.user.id };

    if (req.query.unread === 'true') {
      filter.isRead = false;
    }

    const limit = parseInt(req.query.limit, 10) || 50;
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir le nombre de notifications non lues
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.id,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Marquer une notification comme lue
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Marquer toutes les notifications comme lues
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer une notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await notification.deleteOne();
    res.json({ message: 'Notification supprimée', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer une notification (utilisateur interne)
// @access  Internal helper function
exports.createNotification = async ({ userId, title, message, type = 'info', relatedId = null, relatedType = null, link = null }) => {
  try {
    if (!userId || !title || !message) {
      console.warn('[notification] createNotification: userId/title/message requis');
      return null;
    }

    // Ne pas envoyer null aux champs enum/ObjectId (sinon validation Mongoose échoue)
    const payload = {
      user: userId,
      title: String(title).trim(),
      message: String(message).trim(),
      type: type || 'info',
      isRead: false,
    };

    if (relatedId) payload.relatedId = relatedId;
    if (relatedType) payload.relatedType = relatedType;
    if (link) payload.link = link;

    const notification = await Notification.create(payload);
    return notification;
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error.message);
    return null;
  }
};
