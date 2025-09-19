import adminRoutes from './admin.js';
import authRoutes from './auth.js';
import dashboardRoutes from './dashboard.js';
import fileRoutes from './files.js';
import healthRoutes from './health.js';
import uploadRoutes from './upload.js';
import websiteInfoRoutes from './websiteInfo.js';
import express, { Application, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupRoutes(app: Application): void {
  // API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/website-info', websiteInfoRoutes);

  // Serve dashboard static files
  app.use('/dashboard', express.static(path.join(__dirname, '../../public/dashboard'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res: Response, filePath: string) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // Dashboard route
  app.get('/dashboard', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../public/dashboard/index.html'));
  });
}