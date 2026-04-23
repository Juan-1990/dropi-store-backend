// backend/server.js
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Conectar a MongoDB y luego iniciar el servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`
    Servidor corriendo en modo: ${process.env.NODE_ENV}
    URL: http://localhost:${PORT}
    Base de datos: conectada
    `);
  });
}).catch((error) => {
  console.error(' Error al iniciar el servidor:', error);
  process.exit(1);
});