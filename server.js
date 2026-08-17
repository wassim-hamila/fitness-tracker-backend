const express = require('express');
const dotenv = require('dotenv');
const cors = require("cors");
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
require("dotenv").config();
// Charger les variables d'environnement
dotenv.config();
const path = require("path");

// Connexion à la base de données
connectDB();

// Vérifier la config email (reset password) au démarrage
const { verifyEmailConfig } = require('./services/emailService');
verifyEmailConfig().catch(() => {});

const app = express();

// Middleware CORS - configuration unique
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://front-end-05.vercel.app'
  ],
  credentials: true
}));

// Sécurité — en-têtes HTTP durcis
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: false, limit: '25mb' }));

// Sécurité — assainit req.body/query/params contre l'injection NoSQL (opérateurs $, .)
app.use(mongoSanitize());
// Sécurité — bloque la pollution de paramètres HTTP
app.use(hpp());

// Sécurité — limite globale anti-flood / anti-scraping
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes, réessayez plus tard.' },
});
app.use('/api', globalLimiter);

// Sécurité — limite stricte sur l'authentification (anti brute-force / credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Sécurité — limite sur le coach IA (appels payants vers l'API IA)
const coachLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes vers le coach IA, réessayez plus tard.' },
});
app.use('/api/coach', coachLimiter);

app.use('/api/activities', require('./routes/activityRoutes'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/workouts', require('./routes/workoutRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/meals', require('./routes/mealRoutes'));
app.use('/api/badges', require('./routes/badgeRoutes'));
app.use('/api/programs', require('./routes/programRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/photos', require('./routes/progressPhotoRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/social', require('./routes/socialInteractionRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/coach', require('./routes/coachRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: '🏋️ API Fitness Tracker',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      workouts: '/api/workouts',
      goals: '/api/goals',
      users: '/api/users',
      meals: '/api/meals',
      badges: '/api/badges',
      programs: '/api/programs',
      notifications: '/api/notifications',
      photos: '/api/photos',
      templates: '/api/templates',
      social: '/api/social',
      stats: '/api/stats',
      coach: '/api/coach',
      posts: '/api/posts'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Route non trouvée',
    method: req.method,
    path: req.originalUrl,
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🏋️  SERVEUR DÉMARRÉ AVEC SUCCÈS  🏋️    ║
╠══════════════════════════════════════════╣
║  Port: ${PORT}                             ║
║  Environnement: ${process.env.NODE_ENV || 'development'}              ║
║  URL: http://localhost:${PORT}             ║
╚══════════════════════════════════════════╝
  `);
});

// Gestion des erreurs non gérées — ne pas crash le serveur
process.on('unhandledRejection', (err) => {
  console.error('⚠️ UNHANDLED REJECTION:', err?.message || err);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ UNCAUGHT EXCEPTION:', err?.message || err);
});