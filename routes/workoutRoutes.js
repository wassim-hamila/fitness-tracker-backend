const express = require('express');
const router = express.Router();
const {
  getWorkouts,
  getWorkout,
  createWorkout,
  updateWorkout,
  deleteWorkout
} = require('../controllers/workoutController');
const { protect } = require('../middleware/auth');
const { workoutValidation, validate } = require('../middleware/validator');

router.route('/')
  .get(protect, getWorkouts)
  .post(protect, workoutValidation, validate, createWorkout);

router.route('/:id')
  .get(protect, getWorkout)
  .put(protect, workoutValidation, validate, updateWorkout)
  .delete(protect, deleteWorkout);

module.exports = router;