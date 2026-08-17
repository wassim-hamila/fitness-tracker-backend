const Meal = require('../models/Meal');
const { createNotification } = require('./notificationController');

// @desc    Obtenir tous les repas de l'utilisateur
// @route   GET /api/meals
// @access  Private
exports.getMeals = async (req, res) => {
  try {
    const filter = { user: req.user.id };

    if (req.query.date) {
      const startDate = new Date(req.query.date);
      const endDate = new Date(req.query.date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    if (req.query.mealType) {
      filter.mealType = req.query.mealType;
    }

    const meals = await Meal.find(filter).sort({ date: -1 });
    res.json(meals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir un repas spécifique
// @route   GET /api/meals/:id
// @access  Private
exports.getMeal = async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);

    if (!meal) {
      return res.status(404).json({ message: 'Repas non trouvé' });
    }

    if (meal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    res.json(meal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Créer un repas
// @route   POST /api/meals
// @access  Private
exports.createMeal = async (req, res) => {
  try {
    const {
      name,
      mealType,
      foods,
      totalCalories,
      calories,
      protein,
      carbs,
      fats,
      date,
      notes,
    } = req.body;

    let calculatedCalories = totalCalories ?? calories;
    if ((calculatedCalories === undefined || calculatedCalories === null || calculatedCalories === '') && foods && foods.length > 0) {
      calculatedCalories = foods.reduce((sum, food) => sum + (Number(food.calories) || 0), 0);
    }

    const mealPayload = {
      user: req.user.id,
      name: name || (foods?.[0]?.name) || mealType || 'Repas',
      mealType,
      foods: Array.isArray(foods) ? foods : [],
      totalCalories: Number(calculatedCalories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      notes: notes || '',
    };

    if (date) {
      mealPayload.date = new Date(date);
    }

    const meal = await Meal.create(mealPayload);

    await createNotification({
      userId: req.user.id,
      title: 'Repas enregistré',
      message: `${meal.name || meal.mealType} · ${meal.totalCalories} kcal (P${meal.protein}g / G${meal.carbs}g / L${meal.fats}g)`,
      type: 'success',
      relatedId: meal._id,
      relatedType: 'meal',
    });

    res.status(201).json(meal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mettre à jour un repas
// @route   PUT /api/meals/:id
// @access  Private
exports.updateMeal = async (req, res) => {
  try {
    let meal = await Meal.findById(req.params.id);

    if (!meal) {
      return res.status(404).json({ message: 'Repas non trouvé' });
    }

    if (meal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    // Recalculer les calories si les aliments sont modifiés
    if (req.body.foods && req.body.foods.length > 0) {
      req.body.totalCalories = req.body.foods.reduce(
        (sum, food) => sum + (food.calories || 0), 0
      );
    }

    meal = await Meal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json(meal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Supprimer un repas
// @route   DELETE /api/meals/:id
// @access  Private
exports.deleteMeal = async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);

    if (!meal) {
      return res.status(404).json({ message: 'Repas non trouvé' });
    }

    if (meal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Non autorisé' });
    }

    await meal.deleteOne();
    res.json({ message: 'Repas supprimé', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir les statistiques nutritionnelles
// @route   GET /api/meals/stats
// @access  Private
exports.getMealStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Statistiques d'aujourd'hui
    const todayStats = await Meal.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalCalories: { $sum: '$totalCalories' },
          totalProtein: {
            $sum: {
              $reduce: {
                input: '$foods',
                initialValue: 0,
                in: { $add: ['$$value', { $ifNull: ['$$this.protein', 0] }] }
              }
            }
          },
          totalCarbs: {
            $sum: {
              $reduce: {
                input: '$foods',
                initialValue: 0,
                in: { $add: ['$$value', { $ifNull: ['$$this.carbs', 0] }] }
              }
            }
          },
          totalFats: {
            $sum: {
              $reduce: {
                input: '$foods',
                initialValue: 0,
                in: { $add: ['$$value', { $ifNull: ['$$this.fats', 0] }] }
              }
            }
          },
          mealCount: { $sum: 1 }
        }
      }
    ]);

    // Les 7 derniers jours
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekBreakdown = await Meal.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: sevenDaysAgo, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalCalories: { $sum: '$totalCalories' },
          mealCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Eau - somme du champ water si présent dans les repas
    const todayWater = await Meal.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalWater: {
            $sum: {
              $reduce: {
                input: '$foods',
                initialValue: 0,
                in: { $add: ['$$value', { $ifNull: ['$$this.water', 0] }] }
              }
            }
          }
        }
      }
    ]);

    res.json({
      today: todayStats[0] || {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        mealCount: 0
      },
      todayWater: todayWater[0]?.totalWater || 0,
      last7Days: weekBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
