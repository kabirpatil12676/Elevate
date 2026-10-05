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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// ── API Routes ─────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/journeys',    journeyRoutes);
app.use('/api/capsules',    capsuleRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/feedback',    feedbackRoutes);
app.use('/api/portfolio',   portfolioRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/diagnostic',  diagnosticRoutes);

// ── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'ELEVATE', timestamp: new Date().toISOString() });
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
app.listen(PORT, () => {
  console.log(`\n🚀 ELEVATE Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
