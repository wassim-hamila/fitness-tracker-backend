const express = require('express');
const router = express.Router();
const {
  getFeed,
  getUserPosts,
  createPost,
  likePost,
  addComment,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getFeed);
router.get('/user/:userId', protect, getUserPosts);
router.post('/', protect, createPost);
router.post('/:id/like', protect, likePost);
router.post('/:id/comments', protect, addComment);
router.delete('/:id', protect, deletePost);

module.exports = router;