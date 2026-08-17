const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getUserStats,
  followUser,
  unfollowUser,
  getSocialFeed,
  getSuggestedUsers,
  getUserById
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/stats', protect, getUserStats);
router.get('/feed', protect, getSocialFeed);
router.get('/suggested', protect, getSuggestedUsers);

router.route('/follow/:id')
  .post(protect, followUser)
  .delete(protect, unfollowUser);

// Doit rester en dernier : route générique qui matcherait sinon les chemins ci-dessus
router.get('/:id', protect, getUserById);

module.exports = router;