import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { testConnection, db, pool, globalConnectionStatus } from "./db";
import { storage } from "./storage";
import customRoutes from "./routes-ext";
import refundRoutes from "./refund-routes";
import emailCampaignRoutes from "./email-campaign-routes";
import bizimHesapRoutes from "./bizimhesap-routes";
import { optimizedRoutes } from "./routes-optimized";
import { startTrackingScheduler, startBatchProcessingScheduler } from "./services/trackingScheduler";
import { dutyJobProcessor } from "./services/duty-job-processor";
import path from "path";
import rateLimit from "express-rate-limit";

// Set up unhandled rejection handler to avoid crashing on database errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Promise Rejection:', reason);
  // Don't exit the process, let Express handle the request/response lifecycle
});

const app = express();

// ========== SECURITY CONFIGURATION ==========

// Trust proxy for correct client IP behind Cloudflare/Render
app.set('trust proxy', 1);

// Disable X-Powered-By header to hide Express
app.disable('x-powered-by');

// Rate limiting for login attempts (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/login', loginLimiter);
app.use('/api/register', loginLimiter);
app.use('/api/forgot-password', loginLimiter);
app.use('/api/', apiLimiter);

// Redirect www/apex authenticated routes to app.moogship.com
// Marketing pages stay on www, auth and app pages go to app subdomain
// NOTE: Do NOT redirect /api/ - this causes CORS issues
app.use((req, res, next) => {
  const host = req.get('host') || '';
  if (host === 'www.moogship.com' || host === 'moogship.com') {
    // Routes that should redirect to app.moogship.com (page navigation only, NOT API)
    const appRoutes = [
      '/auth',
      '/mobile-auth',
      '/dashboard',
      '/shipments',
      '/draft-shipments',
      '/approved-shipments',
      '/my-pickups',
      '/recipients',
      '/package-templates',
      '/my-balance',
      '/notifications',
      '/profile',
      '/settings',
      '/support',
      '/advisor',
      '/admin',
      '/manage',
      '/reports'
    ];

    const shouldRedirect = appRoutes.some(route => req.path.startsWith(route));

    if (shouldRedirect) {
      const redirectUrl = `https://app.moogship.com${req.originalUrl}`;
      return res.redirect(301, redirectUrl);
    }
  }
  next();
});

// Security headers middleware
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// ========== END SECURITY CONFIGURATION ==========

// Serve static files with proper MIME types and cache headers
app.use('/public', express.static(path.join(process.cwd(), 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.mov')) {
      res.set('Content-Type', 'video/quicktime');
    }
    
    // Set cache headers based on file type
    if (filePath.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      // Static assets - long cache with immutable for hashed assets
      if (filePath.match(/\-[a-f0-9]{8,}\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.set('Cache-Control', 'public, max-age=3600');
      }
    } else {
      // Other files - shorter cache
      res.set('Cache-Control', 'public, max-age=300');
    }
  }
}));


// Direct static file serving for videos in root path
app.get('*.mp4', (req, res) => {
  const videoPath = path.join(process.cwd(), 'public', req.path);
  res.set('Content-Type', 'video/mp4');
  res.sendFile(videoPath);
});

app.get('*.webm', (req, res) => {
  const videoPath = path.join(process.cwd(), 'public', req.path);
  res.set('Content-Type', 'video/webm');
  res.sendFile(videoPath);
});

app.get('*.mov', (req, res) => {
  const videoPath = path.join(process.cwd(), 'public', req.path);
  res.set('Content-Type', 'video/quicktime');
  res.sendFile(videoPath);
});

// Redirect non-www to www for moogship.com domain
app.use((req, res, next) => {
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';

  // Handle app.moogship.com - redirect root to /auth
  if (host && (host === 'app.moogship.com' || host.startsWith('app.')) && req.originalUrl === '/') {
    console.log(`App subdomain root redirect to: /auth`);
    return res.redirect(302, '/auth');
  }

  // Handle moogship.com redirects (both http and https)
  if (host === 'moogship.com' || host === 'http://moogship.com' || host === 'https://moogship.com') {
    const redirectUrl = `https://www.moogship.com${req.originalUrl}`;
    console.log(`Redirecting to: ${redirectUrl}`);
    return res.redirect(301, redirectUrl);
  }

  // Also handle case where host includes protocol (but exclude app subdomain)
  if (host && host.includes('moogship.com') && !host.includes('www.') && !host.includes('app.')) {
    const redirectUrl = `https://www.moogship.com${req.originalUrl}`;
    console.log(`Protocol-included redirect to: ${redirectUrl}`);
    return res.redirect(301, redirectUrl);
  }

  next();
});

// Enhanced CORS headers for deployment compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_URL?.includes('moogship.com');

  // Allowed origins list
  const allowedOrigins = [
    'https://www.moogship.com',
    'https://moogship.com',
    'https://app.moogship.com',
    'https://moogship.onrender.com',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'https://localhost'
  ];

  // In development, also allow localhost
  if (!isProduction) {
    allowedOrigins.push('http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000');
  }

  // Check if origin is allowed
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (origin && !isAllowed) {
    console.log(`[CORS] Blocked unauthorized origin: ${origin}`);
    // For non-allowed origins, don't set CORS headers (browser will block)
    return next();
  }

  // Only set CORS headers for allowed origins
  if (origin && isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // For same-origin requests (no Origin header), allow
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, X-CSRF-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');
  res.header('Vary', 'Origin');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Increase body parser limits to handle large requests (e.g., bulk uploads, shipment data)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Mobile app authentication fallback middleware
// When cookies don't work (Capacitor/WKWebView), use X-User-Id header
app.use(async (req, res, next) => {
  // Skip non-API routes
  if (!req.path.startsWith('/api')) {
    return next();
  }

  // Skip if user is already authenticated via session
  if (req.user) {
    return next();
  }

  // Check for user ID in header (mobile app fallback)
  const userId = req.headers['x-user-id'] as string;

  if (userId) {
    try {
      const user = await storage.getUser(parseInt(userId));
      if (user) {
        (req as any).user = user;
        console.log(`[AUTH] Mobile fallback: authenticated user ${user.username} (ID: ${userId})`);
      }
    } catch (error) {
      console.error('[AUTH] Mobile fallback error:', error);
    }
  }

  next();
});

// Serve static files from uploads directory with cache headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, filePath) => {
    // Uploads are user-generated content - shorter cache and private
    res.set('Cache-Control', 'private, max-age=3600');
  }
}));

// Add a database connection health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'error',
      message: 'Failed to check database connection',
      timestamp: new Date().toISOString()
    });
  }
});

// Register our custom routes for direct price updates
app.use('/api', customRoutes);

// Register optimized routes for faster data loading
app.use(optimizedRoutes);

// Register Bizim Hesap integration routes
app.use('/api/bizimhesap', bizimHesapRoutes);

// Add global database error handling middleware
app.use((req, res, next) => {
  // Skip for static assets, health checks, and other non-API endpoints
  if (!req.path.startsWith('/api') || req.path === '/api/health') {
    return next();
  }
  
  // Check database connection before proceeding using global connection status
  if (!globalConnectionStatus.isConnected) {
    console.warn(`[DB] Rejected ${req.method} ${req.path} due to database unavailability`);
    return res.status(503).json({
      message: "Database connection issue - Please try again later",
      error: "service_unavailable",
      retryable: true
    });
  }
  
  next();
});

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Error handler middleware to make database errors more robust
app.use((req, res, next) => {
  try {
    next();
  } catch (error) {
    console.error('[API Error]', error);
    
    // Handle database-specific errors without exposing internal details
    const statusCode = (error as any).code === 'ECONNREFUSED' ? 503 : 500;
    const userMessage = statusCode === 503 
      ? 'Database service temporarily unavailable' 
      : 'An internal server error occurred';
    
    res.status(statusCode).json({
      message: userMessage,
      status: 'error'
    });
  }
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Global error handler for Express
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error(`[ERROR] ${status} - ${message}`);
      console.error(err.stack);

      // Determine if it's a database connection issue
      const isDbConnectionError = err.message?.includes('database') || 
                                err.message?.includes('connection') ||
                                err.message?.includes('pool') ||
                                err.message?.includes('neon');
      
      const userFriendlyMessage = isDbConnectionError
        ? "Database connection issue - Please try again later"
        : message;
      
      res.status(status).json({ 
        message: userFriendlyMessage,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      });
    });
    
    // Add cache control middleware for HTML files and service worker before setting up static serving
    app.use((req, res, next) => {
      // Set no-cache headers for HTML files, navigation requests, and service worker
      if (req.path === '/' || req.path.endsWith('.html') || 
          req.path === '/sw.js' || req.path.endsWith('.worker.js') ||
          req.headers.accept?.includes('text/html')) {
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
      next();
    });

    // Serve chrome-extension files as static content for download
    // This must be BEFORE vite setup to prevent the React app from catching it
    app.use('/chrome-extension', express.static(path.join(process.cwd(), 'chrome-extension'), {
      setHeaders: (res, filePath) => {
        // Set appropriate headers for Chrome extension files
        if (filePath.endsWith('.json')) {
          res.set('Content-Type', 'application/json');
        } else if (filePath.endsWith('.js')) {
          res.set('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.html')) {
          res.set('Content-Type', 'text/html');
        } else if (filePath.endsWith('.md')) {
          res.set('Content-Type', 'text/markdown');
        }
        // Allow listing and downloading
        res.set('Cache-Control', 'public, max-age=300');
      }
    }));

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_URL?.includes('moogship.com');
    if (!isProduction && app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // For deployment and local development, use the PORT env variable or fall back to 5000
    // For production domains, try to use standard HTTP port if available
    let port = process.env.PORT || 5000;
    
    // If we're in production and no PORT is set, try port 80 first
    if (process.env.NODE_ENV === 'production' && !process.env.PORT) {
      port = 80;
    }
    
    const startServer = (portToTry: number) => {
      server.listen({
        port: portToTry,
        host: "0.0.0.0",
        reusePort: true,
      }, () => {
        log(`serving on port ${portToTry}`);
        
        // Start the automatic tracking scheduler after server is running
        startTrackingScheduler();
        
        // Start the batch processing scheduler for consolidated tracking emails
        startBatchProcessingScheduler();
        
        // Start the duty calculation job processor
        dutyJobProcessor.start();
      }).on('error', (err: any) => {
        if (err.code === 'EACCES' && portToTry === 80) {
          console.log('Port 80 access denied, falling back to port 5000');
          startServer(5000);
        } else if (err.code === 'EADDRINUSE' && portToTry === 80) {
          console.log('Port 80 in use, falling back to port 5000');
          startServer(5000);
        } else {
          console.error('Server failed to start:', err);
          process.exit(1);
        }
      });
    };
    
    startServer(Number(port));
  } catch (error) {
    console.error("[CRITICAL] Failed to start server:", error);
    process.exit(1);
  }
})();
