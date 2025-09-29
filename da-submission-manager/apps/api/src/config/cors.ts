/**
 * Production CORS Configuration
 * Replaces the overly permissive CORS in index.ts
 */

interface CorsOptions {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

// Production allowed origins
const PRODUCTION_ORIGINS = [
  'https://admin.yourdomain.com',
  'https://submit.yourdomain.com'
];

// Development origins are handled dynamically with localhost/127.0.0.1 prefix matching

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // In development, allow all localhost and 127.0.0.1 origins
    if (process.env.NODE_ENV !== 'production') {
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      // Also allow production origins in development for testing
      if (PRODUCTION_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked request from: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }

    // In production, only allow specific origins
    const allowedOrigins = PRODUCTION_ORIGINS;

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
