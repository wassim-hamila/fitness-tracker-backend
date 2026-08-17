const express = require('express');
const router = express.Router();
const {
  getAdvancedStats,
  getStreakInfo
} = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

router.get('/advanced', protect, getAdvancedStats);
router.get('/streak', protect, getStreakInfo);

module.exports = router;
