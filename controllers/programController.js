const Program = require('../models/Program');

// @desc    Obtenir tous les programmes de l'utilisateur
// @route   GET /api/programs
// @access  Private
exports.getPrograms = async (req, res) => {
  try {
    const programs = await Program.find({ user: req.user.id }).sort({ isActive: -1, createdAt: -1 });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un programme spécifique
// @route   GET /api/programs/:id
// @access  Private
exports.getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }

    if (program.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    res.json(program);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer un programme
// @route   POST /api/programs
// @access  Private
exports.createProgram = async (req, res) => {
  try {
    const { name, description, totalWorkouts, startDate, endDate, schedule } = req.body;

    const program = await Program.create({
      user: req.user.id,
      name,
      description,
      totalWorkouts: totalWorkouts || (schedule ? schedule.length : 0),
      startDate,
      endDate,
      schedule
    });

    res.status(201).json(program);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un programme
// @route   PUT /api/programs/:id
// @access  Private
exports.updateProgram = async (req, res) => {
  try {
    let program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }

    if (program.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    program = await Program.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json(program);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un programme
// @route   DELETE /api/programs/:id
// @access  Private
exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }

    if (program.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await program.deleteOne();
    res.json({ message: 'Programme supprimé', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Marquer un jour comme complété
// @route   PUT /api/programs/:id/complete-day
// @access  Private
exports.completeProgramDay = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }

    if (program.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    const { dayIndex } = req.body;

    if (dayIndex === undefined || dayIndex < 0 || dayIndex >= program.schedule.length) {
      return res.status(400).json({ message: 'Index de jour invalide' });
    }

    // Marquer le jour comme complété dans le schedule
    if (!program.schedule[dayIndex].isCompleted) {
      program.schedule[dayIndex].isCompleted = true;
      program.completedWorkouts += 1;
      await program.save();
    }

    res.json(program);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Activer/désactiver un programme
// @route   PUT /api/programs/:id/toggle-active
// @access  Private
exports.toggleProgramActive = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Programme non trouvé' });
    }

    if (program.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    program.isActive = !program.isActive;
    await program.save();

    res.json(program);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
