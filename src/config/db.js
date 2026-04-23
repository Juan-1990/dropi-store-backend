// backend/src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Opciones para evitar deprecation warnings
    });

    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error de MongoDB: ${error.message}`);
    process.exit(1); // Termina el proceso si no hay DB
  }
};

// Eventos de conexión para monitoreo
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB desconectado');
});

mongoose.connection.on('error', (err) => {
  console.error('Error de MongoDB:', err);
});

module.exports = { connectDB };