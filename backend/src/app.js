import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import shiftRoutes from './routes/shift.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import financeRoutes from './routes/finance.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import membershipRoutes from './routes/membership.routes.js';
import hrRoutes from './routes/hr.routes.js';
import notionRoutes from './routes/notion.routes.js';
import reportRoutes from './routes/report.routes.js';
import menuRoutes from './routes/menu.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import equipmentRoutes from './routes/equipment.routes.js';
import targetRoutes from './routes/target.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import stockRoutes from './routes/stock.routes.js';
import wasteRoutes from './routes/waste.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import checklistRoutes  from './routes/checklist.routes.js';
import memberAuthRouter from './routes/memberAuth.routes.js';
import memberDataRouter from './routes/memberData.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const allowedOrigins = (
  process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:5174']
);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});

app.use(limiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Fika Takeaway API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/shifts',      shiftRoutes);
app.use('/api/inventory',   inventoryRoutes);
app.use('/api/finance',     financeRoutes);
app.use('/api/expenses',    expenseRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/hr',          hrRoutes);
app.use('/api/notion',        notionRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/menu',          menuRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/equipment',     equipmentRoutes);
app.use('/api/targets',       targetRoutes);
app.use('/api/suppliers',     supplierRoutes);
app.use('/api/stock',         stockRoutes);
app.use('/api/waste',         wasteRoutes);
app.use('/api/schedule',      scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/checklist',  checklistRoutes);
app.use('/api/member',     memberAuthRouter);
app.use('/api/member',     memberDataRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
export function startServer(port = parseInt(process.env.PORT || '4000', 10)) {
  return app.listen(port, () => {
    console.log(`\n🟢 Fika API running on http://localhost:${port}`);
    console.log(`   Environment : ${process.env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${port}/api/health\n`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}

export default app;
