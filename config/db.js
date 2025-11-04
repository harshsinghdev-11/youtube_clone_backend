// config/db.js
const mongoose = require('mongoose');

async function connectDB(retries = 10, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB connected');
      return;
    } catch (error) {
      console.error(`MongoDB connection failed (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

module.exports = connectDB;