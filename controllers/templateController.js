const WorkoutTemplate = require('../models/WorkoutTemplate');

// @desc    Obtenir tous les templates (système + utilisateur)
// @route   GET /api/templates
// @access  Private
exports.getTemplates = async (req, res) => {
  try {
    const filter = {
      $or: [
        { isSystem: true },
        { user: req.user.id }
      ]
    };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const templates = await WorkoutTemplate.find(filter).sort({ isSystem: -1, createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un template spécifique
// @route   GET /api/templates/:id
// @access  Private
exports.getTemplate = async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template non trouvé' });
    }

    // Vérifier que l'utilisateur peut voir ce template
    if (!template.isSystem && template.user && template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer un template utilisateur
// @route   POST /api/templates
// @access  Private
exports.createTemplate = async (req, res) => {
  try {
    const {
      name, description, category, exercises,
      estimatedDuration, difficulty, tags
    } = req.body;

    const template = await WorkoutTemplate.create({
      user: req.user.id,
      name,
      description,
      category,
      isSystem: false,
      exercises,
      estimatedDuration,
      difficulty,
      tags
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un template (utilisateur uniquement)
// @route   PUT /api/templates/:id
// @access  Private
exports.updateTemplate = async (req, res) => {
  try {
    let template = await WorkoutTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template non trouvé' });
    }

    if (template.isSystem) {
      return res.status(400).json({ message: 'Les templates système ne peuvent pas être modifiés' });
    }

    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    template = await WorkoutTemplate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un template (utilisateur uniquement)
// @route   DELETE /api/templates/:id
// @access  Private
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template non trouvé' });
    }

    if (template.isSystem) {
      return res.status(400).json({ message: 'Les templates système ne peuvent pas être supprimés' });
    }

    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await template.deleteOne();
    res.json({ message: 'Template supprimé', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Utiliser un template (incrémenter le compteur)
// @route   POST /api/templates/:id/use
// @access  Private
exports.useTemplate = async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template non trouvé' });
    }

    // Vérifier que l'utilisateur peut utiliser ce template
    if (!template.isSystem && template.user && template.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    template.timesUsed += 1;
    await template.save();

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
