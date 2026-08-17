const { body, validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

exports.registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('L\'email est requis')
    .isEmail()
    .withMessage('Email invalide')
    // lowercase only — avoid normalizeEmail() which strips Gmail dots/+aliases
    .customSanitizer((value) => String(value).toLowerCase().trim()),
  
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 })
    .withMessage('L\'âge doit être entre 13 et 120 ans'),
  
  body('weight')
    .optional()
    .isFloat({ min: 20, max: 300 })
    .withMessage('Le poids doit être entre 20 et 300 kg'),
  
  body('height')
    .optional()
    .isFloat({ min: 50, max: 300 })
    .withMessage('La taille doit être entre 50 et 300 cm')
];

exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('L\'email est requis')
    .isEmail()
    .withMessage('Email invalide')
    .customSanitizer((value) => String(value).toLowerCase().trim()),
  
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis')
];

exports.workoutValidation = [
  body('type')
    .notEmpty()
    .withMessage('Le type d\'entraînement est requis')
    .isIn(['Cardio', 'Musculation', 'Yoga', 'Course', 'Natation', 'Cyclisme', 'Autre'])
    .withMessage('Type invalide'),
  
  body('duration')
    .notEmpty()
    .withMessage('La durée est requise')
    .isInt({ min: 1, max: 1440 })
    .withMessage('La durée doit être entre 1 et 1440 minutes'),
  
  body('caloriesBurned')
    .notEmpty()
    .withMessage('Les calories sont requises')
    .isInt({ min: 0, max: 10000 })
    .withMessage('Les calories doivent être entre 0 et 10000'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date invalide'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères')
];

// FIX: Validation des objectifs SANS custom validator
exports.goalValidation = [
  body('type')
    .notEmpty()
    .withMessage('Le type d\'objectif est requis')
    .isIn(['Poids', 'Heures d\'entraînement', 'Calories brûlées', 'Distance', 'Autre'])
    .withMessage('Type invalide'),
  
  body('targetValue')
    .notEmpty()
    .withMessage('La valeur cible est requise')
    .isFloat({ min: 0.1 })
    .withMessage('La valeur cible doit être positive'),
  
  body('currentValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La valeur actuelle doit être positive'),
  
  body('deadline')
    .notEmpty()
    .withMessage('La date limite est requise')
    .isISO8601()
    .withMessage('Date invalide'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères')
];

// Normalise les types de repas (accents, casse, aliases)
const MEAL_TYPE_MAP = {
  'petit-dejeuner': 'Petit-déjeuner',
  'petit-déjeuner': 'Petit-déjeuner',
  'petit dejeuner': 'Petit-déjeuner',
  'petit déjeuner': 'Petit-déjeuner',
  breakfast: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  déjeuner: 'Déjeuner',
  lunch: 'Déjeuner',
  diner: 'Dîner',
  dîner: 'Dîner',
  dinner: 'Dîner',
  collation: 'Collation',
  snack: 'Collation',
};

const normalizeMealType = (value) => {
  if (value == null || value === '') return value;
  const raw = String(value).trim();
  const key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents for lookup
  const withAccentKey = raw.toLowerCase();
  return (
    MEAL_TYPE_MAP[withAccentKey] ||
    MEAL_TYPE_MAP[key] ||
    MEAL_TYPE_MAP[key.replace(/\s+/g, '-')] ||
    raw
  );
};

exports.mealValidation = [
  body('mealType')
    .notEmpty().withMessage('Le type de repas est requis')
    .customSanitizer(normalizeMealType)
    .isIn(['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'])
    .withMessage('Type de repas invalide'),
  body('foods')
    .optional({ nullable: true })
    .isArray().withMessage('Les aliments doivent être un tableau'),
  body('foods.*.name')
    .optional()
    .trim()
    .notEmpty().withMessage('Le nom de l\'aliment est requis'),
  body('foods.*.calories')
    .optional()
    .isFloat({ min: 0 }).withMessage('Les calories doivent être positives'),
  body('foods.*.quantity')
    .optional()
    .isFloat({ min: 0 }).withMessage('La quantité doit être positive'),
  body('totalCalories')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Les calories doivent être positives'),
  body('calories')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Les calories doivent être positives'),
  body('protein')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Les protéines doivent être positives'),
  body('carbs')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Les glucides doivent être positifs'),
  body('fats')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Les lipides doivent être positifs'),
  body('water')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('L\'eau doit être positive'),
  body('date')
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer((v) => {
      if (!v) return undefined;
      // Accepte "YYYY-MM-DD" en ISO complet
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return `${v}T12:00:00.000Z`;
      return v;
    })
    .isISO8601().withMessage('Date invalide'),
  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 }).withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
  // totalCalories OU calories doit être présent
  body().custom((_, { req }) => {
    const total = req.body.totalCalories ?? req.body.calories;
    if (total === undefined || total === null || total === '') {
      throw new Error('Les calories totales sont requises');
    }
    if (req.body.totalCalories === undefined || req.body.totalCalories === null || req.body.totalCalories === '') {
      req.body.totalCalories = Number(total);
    }
    return true;
  }),
];

exports.programValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom du programme est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  body('difficulty')
    .optional()
    .isIn(['Débutant', 'Intermédiaire', 'Avancé', 'Expert'])
    .withMessage('Difficulté invalide'),
  body('days')
    .optional()
    .isArray().withMessage('Les jours doivent être un tableau'),
  body('days.*.dayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 }).withMessage('Le jour de la semaine doit être entre 0 et 6'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Date de début invalide'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('Date de fin invalide')
];

exports.photoValidation = [
  body('url')
    .notEmpty().withMessage('L\'URL de la photo est requise'),
  body('type')
    .optional()
    .isIn(['front', 'back', 'side', 'other'])
    .withMessage('Type de photo invalide'),
  body('weight')
    .optional()
    .isFloat({ min: 20, max: 300 }).withMessage('Le poids doit être entre 20 et 300 kg'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Les notes ne peuvent pas dépasser 500 caractères')
];

exports.templateValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Le nom du template est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  body('category')
    .optional()
    .isIn(['Full Body', 'Upper Body', 'Lower Body', 'Cardio', 'HIIT', 'Yoga', 'Strength', 'Stretching', 'Autre'])
    .withMessage('Catégorie invalide'),
  body('difficulty')
    .optional()
    .isIn(['Débutant', 'Intermédiaire', 'Avancé', 'Expert'])
    .withMessage('Difficulté invalide'),
  body('estimatedDuration')
    .optional()
    .isInt({ min: 1, max: 480 }).withMessage('La durée estimée doit être entre 1 et 480 minutes'),
  body('exercises')
    .optional()
    .isArray().withMessage('Les exercices doivent être un tableau')
];

exports.commentValidation = [
  body('targetType')
    .notEmpty().withMessage('Le type de cible est requis')
    .isIn(['workout', 'goal', 'achievement'])
    .withMessage('Type de cible invalide'),
  body('targetId')
    .notEmpty().withMessage('L\'ID de cible est requis'),
  body('content')
    .notEmpty().withMessage('Le contenu du commentaire est requis')
    .trim()
    .isLength({ min: 1, max: 300 }).withMessage('Le commentaire ne peut pas dépasser 300 caractères')
];

exports.passwordChangeValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Le mot de passe actuel est requis'),
  body('newPassword')
    .notEmpty().withMessage('Le nouveau mot de passe est requis')
    .isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
];