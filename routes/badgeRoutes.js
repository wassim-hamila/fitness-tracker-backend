const express = require('express');
const router = express.Router();
const {
  getBadges,
  markBadgeAsRead
} = require('../controllers/badgeController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getBadges);

router.put('/:id/read', protect, markBadgeAsRead);

module.exports = router;
