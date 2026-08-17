const express = require('express');
const router = express.Router();
const { getConversations, getUnreadCount, getThread, sendMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.get('/conversations', protect, getConversations);
router.get('/unread-count', protect, getUnreadCount);

// Doit rester en dernier : route générique qui matcherait sinon les chemins ci-dessus
router.route('/:userId')
  .get(protect, getThread)
  .post(protect, sendMessage);

module.exports = router;
