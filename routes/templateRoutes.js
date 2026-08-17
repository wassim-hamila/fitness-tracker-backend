const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate
} = require('../controllers/templateController');
const { protect } = require('../middleware/auth');
const { templateValidation, validate } = require('../middleware/validator');

router.route('/')
  .get(protect, getTemplates)
  .post(protect, templateValidation, validate, createTemplate);

router.route('/:id')
  .get(protect, getTemplate)
  .put(protect, templateValidation, validate, updateTemplate)
  .delete(protect, deleteTemplate);

router.post('/:id/use', protect, useTemplate);

module.exports = router;
