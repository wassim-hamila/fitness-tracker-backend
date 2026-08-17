const express = require('express');
const router = express.Router();
const {
  getPhotos,
  getPhoto,
  uploadPhoto,
  deletePhoto,
  getPhotoTimeline
} = require('../controllers/progressPhotoController');
const { protect } = require('../middleware/auth');
const { photoValidation, validate } = require('../middleware/validator');

router.route('/')
  .get(protect, getPhotos)
  .post(protect, photoValidation, validate, uploadPhoto);

router.get('/timeline', protect, getPhotoTimeline);

router.route('/:id')
  .get(protect, getPhoto)
  .delete(protect, deletePhoto);

module.exports = router;
