const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Erreur MongoDB: ${error.message}`);
    console.log('⚠️  Le serveur continue sans base de données.');
    console.log('⚠️  Les endpoints nécessitant la DB retourneront des erreurs.');
    console.log('⚠️  Pour connecter MongoDB: installez-le localement ou configurez MONGO_URI dans .env');
    // Ne pas crash le serveur - laisser tourner pour les endpoints qui n'ont pas besoin de DB
  }
};

module.exports = connectDB;
