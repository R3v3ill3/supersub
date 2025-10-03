import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import diagnosticRoutes from './routes/diagnostic';
import bulkEmailRoutes from './routes/bulkEmail';
import { EmailQueueService } from './services/emailQueue';
import { errorHandler } from './services/errorHandler';
import { corsOptions } from './config/cors';
// TODO: Re-enable Sentry once we figure out why it causes tsx to hang
// import {
//   initSentry,
//   getSentryRequestHandler,
//   getSentryTracingHandler,
//   getSentryErrorHandler
// } from './lib/sentry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy - required for Railway, Heroku, and other cloud platforms
// This allows rate limiting and logging to work correctly with X-Forwarded-For headers
app.set('trust proxy', true);

console.log('[env check] OPENAI key prefix:', (process.env.OPENAI_API_KEY || 'missing').slice(0, 8));

// Initialize Sentry (before all middleware)
// initSentry(app);

// Sentry request and tracing handlers (must be first)
// app.use(getSentryRequestHandler());
// app.use(getSentryTracingHandler());

// Security middleware - must be early in the chain
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some file uploads
}));

app.use(express.json({ limit: '1mb' }));
app.use(cors(corsOptions));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

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
app.use(diagnosticRoutes);
app.use(bulkEmailRoutes);
app.use('/api/templates', templatesRoutes);

// Sentry error handler (must be before other error handlers)
// app.use(getSentryErrorHandler());

// Centralized error handling middleware (must be last)
app.use(errorHandler.middleware());

// Serve simple dev UI from public (resolve relative to this file)
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

const port = Number(process.env.PORT || 3500);

// Initialize email queue processor
const emailQueue = new EmailQueueService();
let emailQueueInterval: NodeJS.Timeout | null = null;

// Start email queue with error handling
function startEmailQueue() {
  emailQueueInterval = setInterval(async () => {
    try {
      await emailQueue.processQueue();
    } catch (error) {
      console.error('[api] Email queue processing error:', error);
      // Don't stop the interval - continue processing on next cycle
    }
  }, 60 * 1000); // Process every 60 seconds
  console.log('[api] Email queue processor started (60s interval)');
}

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  console.log(`\n[api] ${signal} received, shutting down gracefully...`);

  // Clear email queue interval
  if (emailQueueInterval) {
    clearInterval(emailQueueInterval);
    emailQueueInterval = null;
    console.log('[api] Email queue processor stopped');
  }

  // Give ongoing requests time to complete
  setTimeout(() => {
    console.log('[api] Server closed');
    process.exit(0);
  }, 5000); // 5 second grace period
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[api] Uncaught exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[api] Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
});

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);
  startEmailQueue();
});

export default app;

