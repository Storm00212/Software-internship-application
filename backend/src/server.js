require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const pool = require('../config/db');
const authRoutes   = require('./routes/auth.routes');
const fieldRoutes  = require('./routes/field.routes');
const userRoutes   = require('./routes/user.routes');
const updateRoutes = require('./routes/update.routes');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/fields',  fieldRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/updates', updateRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MAX_RETRIES = 10;

const startServer = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('Database: connected');
      app.listen(PORT, () => console.log(`SmartSeason API running on port ${PORT}`));
      return;
    } catch (err) {
      console.error(`Database: connection attempt ${attempt}/${MAX_RETRIES} failed - ${err.message}`);
      if (attempt === MAX_RETRIES) {
        console.error('Database: failed to connect after 10 attempts');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};

startServer();
