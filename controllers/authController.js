const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail } = require('../services/emailService');

const normalizeEmail = (email = '') => String(email).toLowerCase().trim();

// Générer JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Inscription
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, password, age, weight, height } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe sont requis' });
    }

    // Vérifier si l'utilisateur existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Créer l'utilisateur (persisté en base MongoDB)
    const user = await User.create({
      name: String(name).trim(),
      email,
      password,
      age,
      weight,
      height,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      weight: user.weight,
      height: user.height,
      profilePicture: user.profilePicture,
      bio: user.bio,
      gender: user.gender,
      activityLevel: user.activityLevel,
      goal: user.goal,
      workoutsPerWeek: user.workoutsPerWeek,
      trainingType: user.trainingType,
      mealsPerDay: user.mealsPerDay,
      onboardingCompleted: user.onboardingCompleted,
      visibleProgram: user.visibleProgram,
      location: user.location,
      website: user.website,
      instagram: user.instagram,
      twitter: user.twitter,
      strava: user.strava,
      coverPhoto: user.coverPhoto,
      createdAt: user.createdAt,
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Connexion
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Vérifier email et password en base
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        weight: user.weight,
        height: user.height,
        profilePicture: user.profilePicture,
        bio: user.bio,
        gender: user.gender,
        activityLevel: user.activityLevel,
        goal: user.goal,
        workoutsPerWeek: user.workoutsPerWeek,
        trainingType: user.trainingType,
        mealsPerDay: user.mealsPerDay,
        onboardingCompleted: user.onboardingCompleted,
        visibleProgram: user.visibleProgram,
        location: user.location,
        website: user.website,
        instagram: user.instagram,
        twitter: user.twitter,
        strava: user.strava,
        coverPhoto: user.coverPhoto,
        createdAt: user.createdAt,
        token: generateToken(user._id),
      });
    }

    return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Obtenir profil utilisateur
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Changer le mot de passe
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mot de passe oublié
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });

    // Toujours le même message pour ne pas révéler si le compte existe
    const publicMessage =
      'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé';

    if (!user) {
      return res.json({ message: publicMessage });
    }

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    try {
      const result = await sendPasswordResetEmail(user.email, resetToken);

      if (result.sent) {
        return res.json({
          message: publicMessage,
          sent: true,
        });
      }

      // Email non parti (Gmail refuse le mdp normal sans App Password) :
      // on ne bloque PAS l'utilisateur — on renvoie le lien pour qu'il puisse reset.
      console.warn('[forgot-password] Email non envoyé:', result.error || result.reason);
      return res.json({
        message:
          "L'email n'a pas pu être envoyé automatiquement. Utilise le lien ci-dessous pour réinitialiser ton mot de passe.",
        sent: false,
        resetUrl: result.resetUrl || resetUrl,
        emailHint:
          "Pour recevoir un vrai email : crée un Mot de passe d'application Gmail (https://myaccount.google.com/apppasswords) et mets-le dans EMAIL_PASS du backend .env, puis redémarre le serveur.",
      });
    } catch (emailError) {
      console.error('Erreur envoi email reset:', emailError.message);
      // Fallback : le lien fonctionne quand même
      return res.json({
        message:
          "L'email n'a pas pu être envoyé automatiquement. Utilise le lien ci-dessous pour réinitialiser ton mot de passe.",
        sent: false,
        resetUrl,
        emailHint:
          "Pour recevoir un vrai email : crée un Mot de passe d'application Gmail (https://myaccount.google.com/apppasswords) et mets-le dans EMAIL_PASS du backend .env.",
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Réinitialiser le mot de passe
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose && decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    const user = await User.findById(decoded.id).select('+password');

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    // Nouveau mot de passe → hashé par le pre-save du modèle User
    user.password = password;
    await user.save();

    return res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }
    res.status(500).json({ message: error.message });
  }
};