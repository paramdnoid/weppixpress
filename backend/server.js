// ============================================================================
// Backend Server Entrypoint for weppixpress
// ----------------------------------------------------------------------------
// - Loads configuration from .env
// - Sets up Express with middleware: CORS, cookies, JSON body parsing
// - Mounts all authentication routes under /api/auth
// - Listens on configurable port (default: 3000)
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import express, { json } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';

const app = express();

// --- Middleware ---
app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',  // Uses env for frontend URL
  credentials: true
}));

app.use(json());

// --- Routes ---
app.use('/api/auth', authRoutes);

// --- Server Startup ---
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () =>
    console.log(`Backend running on port ${PORT}`)
  );
}

export default app;

// End of server entrypoint file.