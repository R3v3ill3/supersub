import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import surveyRoutes from './routes/survey';
import generateRoutes from './routes/generate';
import devRoutes from './routes/dev';
import webhooksRoutes from './routes/webhooks';
import documentsRoutes from './routes/documents';
import projectsRoutes from './routes/projects';
import submissionsRoutes from './routes/submissions';
import templatesRoutes from './routes/templates';
import dashboardRoutes from './routes/dashboard';
import integrationsRoutes from './routes/integrations';
import monitoringRoutes from './routes/monitoring';
import healthRoutes from './routes/health';
import { EmailQueueService } from './services/emailQueue';
import { errorHandler } from './services/errorHandler';
// import authRoutes from './routes/auth'; // Disabled for development

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(cors({
  origin: [
    process.env.ADMIN_ORIGIN || 'http://localhost:5173',
    process.env.WEB_ORIGIN || 'http://localhost:5174'
  ],
  credentials: true,
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// app.use(authRoutes); // Disabled for development
app.use(surveyRoutes);
app.use(generateRoutes);
app.use(devRoutes);
app.use(webhooksRoutes);
app.use(documentsRoutes);
app.use(projectsRoutes);
app.use(submissionsRoutes);
app.use(dashboardRoutes);
app.use(integrationsRoutes);
app.use(monitoringRoutes);
app.use(healthRoutes);
app.use('/api/templates', templatesRoutes);

// Centralized error handling middleware (must be last)
app.use(errorHandler.middleware());

// Serve simple dev UI from public (resolve relative to this file)
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);

  // Start the email queue processor
  const emailQueue = new EmailQueueService();
  setInterval(() => {
    emailQueue.processQueue();
  }, 60 * 1000); // Process every 60 seconds
  console.log('[api] Email queue processor started.');
});

export default app;

