import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { checkDatabase } from './config/database.js';
import { requireAuth } from './middleware/require-auth.js';
import profileRouter from './routes/profile.js';
import eventsRouter from './routes/events.js';

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Allow requests without an Origin header for health checks and server tools.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.use('/api/profile', profileRouter);
app.use('/api/events', eventsRouter);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'pravaah-api' });
});

app.get('/api/health/database', async (_req, res) => {
  try {
    await checkDatabase();
    return res.status(200).json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.status(200).json({ ok: true, user: req.user });
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  if (err.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  }

  console.error(err);
  return res.status(500).json({ ok: false, error: 'Internal server error' });
});

export default app;

