const express = require('express');
const router = express.Router();
const {
  likeWorkout,
  likeGoal,
  addComment,
  getComments,
  deleteComment,
  getLeaderboard
} = require('../controllers/socialInteractionController');
const { protect } = require('../middleware/auth');
const { commentValidation, validate } = require('../middleware/validator');

router.post('/like/workout/:id', protect, likeWorkout);
router.post('/like/goal/:id', protect, likeGoal);
router.post('/comment', protect, commentValidation, validate, addComment);
router.get('/comments/:targetType/:targetId', protect, getComments);
router.delete('/comment/:id', protect, deleteComment);
router.get('/leaderboard', protect, getLeaderboard);

module.exports = router;
