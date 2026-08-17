const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  passwordChangeValidation,
  validate
} = require('../middleware/validator');

// POST /api/auth/register
router.post('/register', registerValidation, validate, authController.register);

// POST /api/auth/login
router.post('/login', loginValidation, validate, authController.login);

// GET /api/auth/me
router.get('/me', protect, authController.getMe);

// PUT /api/auth/change-password
router.put('/change-password', protect, passwordChangeValidation, validate, authController.changePassword);

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email')
    .trim()
    .notEmpty().withMessage('Email requis')
    .isEmail().withMessage('Email invalide')
    .customSanitizer((value) => String(value).toLowerCase().trim()),
], authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caracteres')
], authController.resetPassword);

module.exports = router;
