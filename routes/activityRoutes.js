const express = require('express');
const router = express.Router();
const { getActivities, createActivity, deleteActivity } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getActivities);
router.post('/', protect, createActivity);
router.delete('/:id', protect, deleteActivity);

module.exports = router;