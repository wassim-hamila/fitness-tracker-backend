const Goal = require('../models/Goal');
const { createNotification } = require('./notificationController');

exports.getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ message: 'Objectif non trouvé' });
    }

    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// FIX: Vérification de la date dans le contrôleur
exports.createGoal = async (req, res) => {
  try {
    const { type, targetValue, currentValue, deadline, description } = req.body;

    // Vérifier que la date est dans le futur
    const deadlineDate = new Date(deadline);
    const now = new Date();
    
    if (deadlineDate <= now) {
      return res.status(400).json({ message: 'La date limite doit être dans le futur' });
    }

    const goal = await Goal.create({
      user: req.user.id,
      type,
      targetValue,
      currentValue: currentValue || 0,
      deadline: deadlineDate,
      description
    });

    await createNotification({
      userId: req.user.id,
      title: 'Nouvel objectif 🎯',
      message: `Objectif « ${type} » créé (cible : ${targetValue}). Deadline : ${deadlineDate.toLocaleDateString('fr-FR')}.`,
      type: 'info',
      relatedId: goal._id,
      relatedType: 'goal',
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ message: 'Objectif non trouvé' });
    }

    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Vérifier la date si elle est modifiée
    if (req.body.deadline) {
      const deadlineDate = new Date(req.body.deadline);
      const now = new Date();
      
      if (deadlineDate <= now) {
        return res.status(400).json({ message: 'La date limite doit être dans le futur' });
      }
    }

    const wasCompleted = goal.isCompleted;
    if (req.body.currentValue && req.body.currentValue >= goal.targetValue) {
      req.body.isCompleted = true;
    }

    goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (goal.isCompleted && !wasCompleted) {
      await createNotification({
        userId: req.user.id,
        title: 'Objectif atteint ! 🏆',
        message: `Bravo ! Tu as complété l'objectif « ${goal.type} ».`,
        type: 'achievement',
        relatedId: goal._id,
        relatedType: 'goal',
      });
    }

    res.json(goal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ message: 'Objectif non trouvé' });
    }

    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await goal.deleteOne();
    res.json({ message: 'Objectif supprimé', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};