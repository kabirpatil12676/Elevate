import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import journeyRoutes from './routes/journey.routes.js';
import capsuleRoutes from './routes/capsule.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import adminRoutes from './routes/admin.routes.js';
import diagnosticRoutes from './routes/diagnostic.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import educatorRoutes from './routes/educator.routes.js';
import learnerRoutes from './routes/learner.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import eventRoutes from './routes/event.routes.js';
import { query } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Webhook must receive raw body BEFORE express.json() parses it ────────────
// Only the /api/payments/webhook endpoint needs express.raw(); all others use JSON.
import { handleWebhook } from './controllers/payment.controller.js';

// CORS must apply to all routes including the webhook
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => { req.rawBody = req.body; next(); },
  handleWebhook,
);

// ── JSON + URL-encoded body parsing (all other routes) ───────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/journeys',     journeyRoutes);
app.use('/api/capsules',     capsuleRoutes);
app.use('/api/submissions',  submissionRoutes);
app.use('/api/feedback',     feedbackRoutes);
app.use('/api/portfolio',    portfolioRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/diagnostic',   diagnosticRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/educator',     educatorRoutes);
app.use('/api/learn',        learnerRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/events',       eventRoutes);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }
  res.json({
    status: 'ok',
    platform: 'ELEVATE',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Start ──────────────────────────────────────────────────
import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith('src\\index.js') ||
  process.argv[1].endsWith('src/index.js')
);

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`\n🚀 ELEVATE Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

export default app;
