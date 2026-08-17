module.exports = {
  port: process.env.PORT || 8080,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE,
  nodeEnv: process.env.NODE_ENV
};