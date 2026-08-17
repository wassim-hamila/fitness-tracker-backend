const express = require('express');
const router = express.Router();
const {
  getMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  getMealStats
} = require('../controllers/mealController');
const { protect } = require('../middleware/auth');
const { mealValidation, validate } = require('../middleware/validator');

router.route('/')
  .get(protect, getMeals)
  .post(protect, mealValidation, validate, createMeal);

router.get('/stats', protect, getMealStats);

router.route('/:id')
  .get(protect, getMeal)
  .put(protect, mealValidation, validate, updateMeal)
  .delete(protect, deleteMeal);

module.exports = router;
