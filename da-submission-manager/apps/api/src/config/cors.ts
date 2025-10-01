/**
 * Production CORS Configuration
 * Dynamically configures allowed origins based on environment variables
 */

interface CorsOptions {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

// Get production origins from environment variables
function getProductionOrigins(): string[] {
  const origins: string[] = [];

  // Add admin origin if configured
  if (process.env.ADMIN_ORIGIN) {
    origins.push(process.env.ADMIN_ORIGIN);
  }

  // Add web origin if configured
  if (process.env.WEB_ORIGIN) {
    origins.push(process.env.WEB_ORIGIN);
  }

  // Add any custom origins from comma-separated list
  if (process.env.ADDITIONAL_ORIGINS) {
    const additionalOrigins = process.env.ADDITIONAL_ORIGINS.split(',')
      .map(o => o.trim())
      .filter(Boolean);
    origins.push(...additionalOrigins);
  }

  // Fallback to default if no origins configured (for safety)
  if (origins.length === 0) {
    console.warn('[CORS] No origins configured! Using defaults. Set ADMIN_ORIGIN and WEB_ORIGIN.');
    origins.push('https://admin.yourdomain.com', 'https://submit.yourdomain.com');
  }

  return origins;
}

const PRODUCTION_ORIGINS = getProductionOrigins();

// Log configured origins on startup
console.log('[CORS] Configured origins:', PRODUCTION_ORIGINS);

// Development origins are handled dynamically with localhost/127.0.0.1 prefix matching
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // In development, allow all localhost and 127.0.0.1 origins
    if (process.env.NODE_ENV !== 'production') {
      if (!origin ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('https://localhost') ||
          origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      // Also allow configured production origins in development for testing
      if (PRODUCTION_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked request from: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }

    // In production, only allow configured origins
    const allowedOrigins = PRODUCTION_ORIGINS;

    // Allow requests with no origin (server-to-server, some mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Production: Blocked request from unauthorized origin: ${origin}`);
      console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
