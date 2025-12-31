import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { generateVerificationToken, sendVerificationEmail } from "./email";
import { sendNewUserRegistrationNotification } from "./notification-emails";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Export hashPassword function so it can be used outside of setupAuth
export async function hashPassword(password: string): Promise<string> {
  // Use bcrypt for password hashing with a lower cost factor for better mobile performance
  // Cost factor 8 is still secure but much faster than 10 (4x faster)
  return bcrypt.hash(password, 8);
}

export function setupAuth(app: Express) {

  // Helper function to get the default price multiplier from system settings
  async function getDefaultPriceMultiplier(): Promise<number> {
    try {
      // Get the default price multiplier setting
      const setting = await storage.getSystemSetting('DEFAULT_PRICE_MULTIPLIER');
      if (setting) {
        const value = parseFloat(setting.value);
        // Ensure it's a valid positive number
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
      // Return default value of 1.45 if setting doesn't exist or is invalid
      return 1.45;
    } catch (error) {
      console.error("Error getting default price multiplier:", error);
      // Fallback to default value in case of error
      return 1.45;
    }
  }

  async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
    try {
      // Check if the stored password uses bcrypt format (modern format)
      if (stored.startsWith('$2')) {
        const result = await bcrypt.compare(supplied, stored);
        // Remove verbose logging for better performance
        return result;
      } 
      // Legacy format - handle scrypt with custom salt (old format)
      else if (stored.includes('.')) {
        const [hashed, salt] = stored.split(".");
        const hashedBuf = Buffer.from(hashed, "hex");
        const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
        const result = timingSafeEqual(hashedBuf, suppliedBuf);
        return result;
      }

      // Unknown format - authentication fails
      console.error('Unknown password format detected:', stored.substring(0, 10) + '...');
      return false;
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  }

  // Enhanced production detection for deployed environments
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.REPLIT_DEPLOYMENT === '1' ||
                       process.env.APP_URL?.includes('moogship.com');
  const isReplit = process.env.REPLIT || process.env.REPL_ID;
  const isDeployed = process.env.APP_URL?.includes('moogship.com') || 
                     (typeof window !== 'undefined' && window.location?.hostname?.includes('moogship.com'));
  
  // CRITICAL: Detect if running on HTTPS
  // Only use secure cookies when ACTUALLY on HTTPS, not just when in Replit
  // Development uses HTTP even with REPL_ID set
  const isHTTPS = process.env.REPLIT_DEPLOYMENT === '1' || // Published production
                  process.env.APP_URL?.startsWith('https://') || // Explicit HTTPS URL
                  (isProduction && process.env.APP_URL?.includes('moogship.com')); // Production domain
  
  // Don't use REPL_ID alone as it's set in HTTP development too

  console.log(`[AUTH] Environment: ${isHTTPS ? 'HTTPS' : 'HTTP'}, REPL_ID: ${process.env.REPL_ID ? 'set' : 'not set'}, REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT || 'not set'}`);
  
  // Determine cookie domain for production
  const cookieDomain = process.env.APP_URL?.includes('moogship.com') 
    ? '.moogship.com'  // Use wildcard for all subdomains
    : undefined;       // Let browser handle domain in dev/deployment preview
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false, // Don't force session save to prevent database conflicts
    saveUninitialized: false, // Don't create session until something stored
    rolling: false, // Disable rolling to prevent session ID changes
    store: storage.sessionStore,
    name: 'moogship_session', // Use consistent name
    cookie: {
      secure: isHTTPS, // Use secure cookies in production HTTPS
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for better stability
      sameSite: 'lax' as 'strict' | 'lax' | 'none', // Use 'lax' for maximum compatibility
      httpOnly: false, // Allow client-side access for debugging
      path: '/', // Available across the entire site
      domain: cookieDomain // Explicit domain for production
    }
  };
  


  // Session middleware
  app.use((req, res, next) => {
    next();
  });
  
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Debug endpoint to check protocol detection and session state
  app.get("/api/debug-protocol", (req, res) => {
    res.json({
      protocol: req.protocol,
      secure: req.secure,
      headers: {
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
        'cookie': req.headers.cookie ? 'present' : 'missing'
      },
      session: {
        id: req.sessionID || 'none',
        exists: !!req.session,
        hasPassport: !!(req.session as any)?.passport,
        hasUser: !!(req.session as any)?.passport?.user,
        userId: (req.session as any)?.passport?.user || null
      },
      environment: {
        isHTTPS: isHTTPS,
        cookieSecure: sessionSettings.cookie?.secure,
        cookieDomain: sessionSettings.cookie?.domain || 'none',
        REPL_ID: process.env.REPL_ID ? 'set' : 'not set',
        REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT || 'not set',
        APP_URL: process.env.APP_URL || 'not set'
      },
      cookies: req.headers.cookie ? 
        req.headers.cookie.split(';').map(c => c.trim().split('=')[0]) : 
        []
    });
  });
  
  // Session middleware
  app.use((req, res, next) => {
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {


        const user = await storage.getUserByUsername(username);

        // First check if user exists
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Then verify password
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Finally check approval status - only after successful username/password validation
        if (!user.isApproved && user.role !== "admin") {
          return done(null, false, { message: "Your account is pending approval by an administrator" });
        }

        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        done(null, user);
      } else {
        done(null, false);
      }
    } catch (err) {
      console.error(`[PASSPORT] Error deserializing user ID ${id}:`, err);
      done(err, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists",
          field: "username"
        });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({
          message: "Email address already exists",
          field: "email"
        });
      }

      // Delete confirmPassword field since it's not part of our user schema
      const { confirmPassword, ...userData } = req.body;

      // First admin user is auto-approved, all others need approval
      const isFirstUser = (await storage.getUserCount()) === 0;

      // Process company type - ensure it follows schema expectations
      let companyType = userData.companyType;
      if (companyType === "business") {
        companyType = "company"; // Align with our enum values in schema
      }

      // Determine if this account should be an admin
      const isAdmin = isFirstUser || userData.role === "admin";

      // Create the user with sanitized data
      const user = await storage.createUser({
        ...userData,
        companyType,
        phone: userData.phone || null, // Store phone number
        shipmentCapacity: userData.monthlyShipmentCapacity ? parseInt(userData.monthlyShipmentCapacity) : null,
        password: await hashPassword(userData.password),
        isApproved: isAdmin ? true : false, // Admin accounts are auto-approved
        role: isAdmin ? "admin" : "user", // Set role accordingly
        isEmailVerified: isAdmin ? true : false, // Admin accounts bypass email verification
        priceMultiplier: await getDefaultPriceMultiplier() // Use the system setting or fallback to default
      });

      let message;
      let emailSent = false;

      if (isAdmin) {
        // Admin accounts don't need email verification
        message = "Admin account created successfully. You can log in immediately.";
      } else {
        // For regular users, generate and store email verification token
        const token = generateVerificationToken();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        await storage.setVerificationToken(user.id, token, expires);

        // Send verification email
        console.log('Registration - sending verification email to user:', {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username
        });
        const emailResult = await sendVerificationEmail(user, token);
        emailSent = emailResult.success;

        if (emailResult.success) {
          message = "Account created successfully. Please check your email to verify your address. " + 
            (isFirstUser ? "" : "An administrator will also need to approve your account.");
        } else {
          // Email failed to send
          console.warn(`Failed to send verification email to ${user.email}: ${emailResult.error}`);
          message = "Account created successfully. There was an issue sending the verification email. " +
            "Please try to request a new verification email after logging in. " +
            (isFirstUser ? "" : "An administrator will also need to approve your account.");
        }
      }

      // Send notification to administrators about the new user registration
      if (!isAdmin) {
        try {
          console.log('Sending admin notification about new user registration:', {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username
          });

          // Don't wait for the notification email to complete
          sendNewUserRegistrationNotification(user)
            .then(result => {
              if (result.success) {
                console.log(`Admin notification about new user registration sent successfully`);
              } else {
                console.warn(`Failed to send admin notification about new user:`, result.error);
              }
            })
            .catch(err => {
              console.error('Error sending admin notification email:', err);
            });
        } catch (notifyError) {
          console.error('Error sending admin notification:', notifyError);
          // Continue even if notification fails
        }
      }

      // Return success but don't automatically log in
      // Users will need to verify their email and wait for admin approval before logging in
      res.status(201).json({
        message: message,
        emailSent: emailSent,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          isApproved: user.isApproved,
          isEmailVerified: user.isEmailVerified
        }
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      // Enhanced mobile device detection
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
      
      console.log(`[AUTH] Login attempt - Mobile: ${isMobile}`);

      // Validate request body
      if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).json({
          success: false,
          message: "Username and password are required"
        });
      }

      console.log(`[AUTH] User attempting to login: "${req.body.username}"`);

      // Wrap passport authentication in a promise for better error handling
      const authenticateUser = () => {
        return new Promise((resolve, reject) => {
          passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) {
              console.error("Authentication error:", err);
              return reject(err);
            }
            if (!user) {
              return reject(new Error(info?.message || "Invalid credentials"));
            }
            resolve(user);
          })(req, res, next);
        });
      };

      let user: any;
      try {
        user = await authenticateUser();
      } catch (authError: any) {
        console.log("[AUTH] Authentication failed:", authError.message);
        return res.status(401).json({
          success: false,
          message: "Invalid username or password"
        });
      }

      // Check email verification - bypass for admin accounts
      if (!user.isEmailVerified && user.email !== "admin@moogship.com" && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Email verification required. Please verify your email address before logging in.",
          email: user.email
        });
      }

      // Check if user account is approved
      if (!user.isApproved) {
        return res.status(403).json({
          success: false,
          message: "Your account is pending approval. Please wait for an administrator to approve your account."
        });
      }

      // CRITICAL FIX: Delete ALL old sessions for this user from database
      // This prevents the authenticateToken middleware from resurrecting old sessions
      try {
        const { Client } = require('pg');
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        await client.connect();
        
        // Delete ALL sessions for this user ID
        const deleteResult = await client.query(
          `DELETE FROM session WHERE sess::text LIKE '%"user":${user.id}%'`
        );
        
        await client.end();
        
        console.log(`[LOGIN] Deleted ${deleteResult.rowCount} old session(s) for user ${user.id} before creating new session`);
      } catch (dbError) {
        console.error('[LOGIN] Failed to delete old sessions from database:', dbError);
        // Continue with login even if cleanup fails
      }

      // CRITICAL FIX: Regenerate session to prevent user ID reuse
      // Without this, old session data (including previous user's ID) persists
      const regenerateSession = () => {
        return new Promise((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) {
              console.error("Session regeneration error:", err);
              return reject(err);
            }
            resolve(true);
          });
        });
      };

      try {
        await regenerateSession();
        console.log(`[AUTH] Session regenerated for user: ${user.username}`);
      } catch (regenerateError) {
        console.error("Session regeneration failed:", regenerateError);
        return res.status(500).json({
          success: false,
          message: "Session initialization failed. Please try again."
        });
      }

      // Create session using promisified login
      const loginUser = () => {
        return new Promise((resolve, reject) => {
          req.login(user, (err) => {
            if (err) {
              console.error("Session creation error:", err);
              return reject(err);
            }
            resolve(user);
          });
        });
      };

      try {
        await loginUser();
      } catch (loginError) {
        console.error("Login session error:", loginError);
        return res.status(500).json({
          success: false,
          message: "Session creation failed. Please try again."
        });
      }

      // Save session with promise wrapper
      const saveSession = () => {
        return new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
              return reject(err);
            }
            resolve(true);
          });
        });
      };

      try {
        await saveSession();
      } catch (saveError) {
        console.error("Session save failed:", saveError);
        return res.status(500).json({
          success: false,
          message: "Session save failed. Please try again."
        });
      }

      console.log(`[AUTH] SUCCESS: User "${user.username}" (ID: ${user.id}) logged in successfully`);

      // Don't manually set cookie - express-session already handles this correctly
      // with environment-aware secure flag (isHTTPS)
      
      // Don't send password to client
      const { password, ...userWithoutPassword } = user;

      return res.status(200).json({
        success: true,
        ...userWithoutPassword,
        sessionId: req.sessionID,
        isMobile
      });

    } catch (error) {
      console.error("Login endpoint error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later."
      });
    }
  });



  // Handle preflight OPTIONS requests for mobile browsers
  app.options("/api/login", (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);

    console.log("[AUTH] OPTIONS preflight request for login - Mobile:", isMobile);

    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');

    res.sendStatus(200);
  });

  app.options("/api/mobile-login", (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.sendStatus(200);
  });

  app.post("/api/logout", async (req, res, next) => {
    // Get session ID for logging
    const sessionID = req.sessionID;
    const username = req.user?.username;
    const userId = req.user?.id;

    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }

      // Destroy the session completely
      req.session.destroy(async (err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return next(err);
        }

        // CRITICAL FIX: Explicitly delete session from database
        // This ensures the production middleware can't reconstruct the user
        try {
          const { Client } = require('pg');
          const client = new Client({ connectionString: process.env.DATABASE_URL });
          await client.connect();
          
          // Delete ALL sessions for this user ID to prevent any resurrection
          const deleteResult = await client.query(
            `DELETE FROM session 
             WHERE sess::text LIKE '%"user":${userId}%' 
             OR sid = $1`,
            [sessionID]
          );
          
          await client.end();
          
          console.log(`[LOGOUT] Deleted ${deleteResult.rowCount} session(s) from database for user ${userId}`);
        } catch (dbError) {
          console.error('[LOGOUT] Failed to delete session from database:', dbError);
          // Continue with logout even if DB delete fails
        }

        // CRITICAL FIX: Clear cookie with EXACT same options used when setting it
        // Cookie clearing must match the exact options from sessionSettings
        const cookieDomain = process.env.APP_URL?.includes('moogship.com') 
          ? '.moogship.com'
          : undefined;
        
        const cookieOptions = {
          path: '/',
          httpOnly: false, // Must match sessionSettings
          secure: isHTTPS, // Must match sessionSettings
          sameSite: 'lax' as const, // Must match sessionSettings
          domain: cookieDomain // Must match sessionSettings - CRITICAL!
        };
        
        console.log(`[LOGOUT] Attempting to clear cookies with isHTTPS=${isHTTPS}, domain=${cookieDomain}`);
        
        // Clear ALL possible cookie variations to ensure complete logout
        // This is necessary because deployment environments might set cookies differently
        const cookieNames = ['moogship_session', 'connect.sid', 'session'];
        const cookieVariations = [
          { ...cookieOptions }, // With all original options
          { ...cookieOptions, domain: undefined }, // Without domain
          { ...cookieOptions, secure: true }, // Force secure=true (for HTTPS)
          { ...cookieOptions, secure: false }, // Force secure=false (for HTTP fallback)
          { ...cookieOptions, secure: true, domain: undefined }, // Secure without domain
          { ...cookieOptions, secure: false, domain: undefined }, // Insecure without domain
        ];
        
        // Clear all combinations to ensure complete logout
        cookieNames.forEach(name => {
          cookieVariations.forEach((options, index) => {
            res.clearCookie(name, options);
            if (index === 0 && name === 'moogship_session') {
              console.log(`[LOGOUT] Primary clear: ${name} with options:`, options);
            }
          });
        });
        
        console.log(`[LOGOUT] Cleared all cookie variations for user ${username}`);

        console.log(`[LOGOUT] User ${username} (ID: ${userId}) logged out successfully`);
        console.log(`[LOGOUT] Session destroyed: ${sessionID}`);

        res.sendStatus(200);
      });
    });
  });

  // Force logout endpoint - clears all session data even if not authenticated
  app.post("/api/force-logout", async (req, res) => {
    const sessionID = req.sessionID;
    const userId = req.user?.id;
    console.log("Force logout requested for session:", sessionID);

    // Clear any user from request
    req.user = undefined;

    // Force logout without checking authentication
    req.logout((err) => {
      // Continue even if logout fails
      if (err) {
        console.warn("Force logout error (continuing):", err);
      }

      // Force destroy session
      req.session.destroy(async (err) => {
        if (err) {
          console.warn("Force session destruction error (continuing):", err);
        }

        // CRITICAL FIX: Explicitly delete session from database
        if (userId || sessionID) {
          try {
            const { Client } = require('pg');
            const client = new Client({ connectionString: process.env.DATABASE_URL });
            await client.connect();
            
            if (userId) {
              // Delete ALL sessions for this user
              const deleteResult = await client.query(
                `DELETE FROM session WHERE sess::text LIKE '%"user":${userId}%' OR sid = $1`,
                [sessionID]
              );
              console.log(`[FORCE-LOGOUT] Deleted ${deleteResult.rowCount} session(s) from database`);
            } else {
              // Just delete this specific session
              await client.query('DELETE FROM session WHERE sid = $1', [sessionID]);
              console.log(`[FORCE-LOGOUT] Deleted session ${sessionID} from database`);
            }
            
            await client.end();
          } catch (dbError) {
            console.error('[FORCE-LOGOUT] Failed to delete session from database:', dbError);
          }
        }

        // CRITICAL FIX: Clear cookies with EXACT same options used when setting it
        const cookieDomain = process.env.APP_URL?.includes('moogship.com') 
          ? '.moogship.com'
          : undefined;
        
        const cookieOptions = {
          path: '/',
          httpOnly: false, // Must match sessionSettings
          secure: isHTTPS, // Must match sessionSettings
          sameSite: 'lax' as const, // Must match sessionSettings
          domain: cookieDomain // Must match sessionSettings - CRITICAL!
        };
        
        console.log(`[FORCE-LOGOUT] Attempting to clear cookies with isHTTPS=${isHTTPS}, domain=${cookieDomain}`);
        
        // Clear ALL possible cookie variations to ensure complete logout
        // This is necessary because deployment environments might set cookies differently
        const cookieNames = ['moogship_session', 'connect.sid', 'session'];
        const cookieVariations = [
          { ...cookieOptions }, // With all original options
          { ...cookieOptions, domain: undefined }, // Without domain
          { ...cookieOptions, secure: true }, // Force secure=true (for HTTPS)
          { ...cookieOptions, secure: false }, // Force secure=false (for HTTP fallback)
          { ...cookieOptions, secure: true, domain: undefined }, // Secure without domain
          { ...cookieOptions, secure: false, domain: undefined }, // Insecure without domain
        ];
        
        // Clear all combinations to ensure complete logout
        cookieNames.forEach(name => {
          cookieVariations.forEach((options, index) => {
            res.clearCookie(name, options);
            if (index === 0 && name === 'moogship_session') {
              console.log(`[FORCE-LOGOUT] Primary clear: ${name} with options:`, options);
            }
          });
        });
        
        console.log(`[FORCE-LOGOUT] Cleared all cookie variations`);

        console.log("[FORCE-LOGOUT] Force logout completed for session:", sessionID);
        res.sendStatus(200);
      });
    });
  });

  // Admin-specific user endpoint to bypass session confusion
  app.get("/api/admin/user", async (req, res) => {
    console.log(`[ADMIN_USER] Session check - ID: ${req.sessionID}`);
    console.log("[ADMIN_USER] Session authenticated:", req.isAuthenticated());
    console.log("[ADMIN_USER] User object exists:", !!req.user);

    if (!req.isAuthenticated() || !req.user) {
      console.log("[ADMIN_USER] Unauthenticated access attempt");
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const freshUser = await storage.getUser(req.user.id);
      
      if (!freshUser) {
        console.log("[ADMIN_USER] User not found in database:", req.user.id);
        return res.status(404).json({ message: "User not found" });
      }

      // Only allow admin users
      if (freshUser.role !== 'admin') {
        console.log("[ADMIN_USER] Non-admin access denied:", freshUser.username);
        return res.status(403).json({ message: "Access denied - admin only" });
      }

      console.log(`[ADMIN_USER] Admin access granted for ${freshUser.username} (ID: ${freshUser.id})`);
      console.log("[ADMIN_USER] Session ID:", req.sessionID);

      const { password, ...userWithoutPassword } = freshUser;
      console.log("[ADMIN_USER] Returning admin user data with role:", freshUser.role);
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('[ADMIN_USER] Error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/user", async (req, res) => {
    // Add mobile device detection
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

    // CRITICAL: Verify session exists and is valid FIRST
    // This prevents returning old user data if session was destroyed
    if (!req.session || !req.sessionID) {
      console.log('[/api/user] No valid session - rejecting request');
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check multiple authentication methods like the middleware does
    let user = req.user;
    
    // If no direct user, try session-based authentication
    // Type assertion needed because passport middleware adds passport property to session
    const passportSession = req.session as any;
    if (!user && passportSession?.passport?.user) {
      try {
        user = await storage.getUser(passportSession.passport.user);
        if (user) {
          req.user = user; // Set for this request
          // Successfully authenticated via session
        }
      } catch (error) {
        console.error("[/api/user] Error getting user from session:", error);
      }
    }

    // Check if the user is authenticated
    if (!user) {
      // Authentication failed - no user found
      console.log('[/api/user] No user in session - rejecting request');
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Fetch fresh user data from database to ensure we have latest return system access permissions
      const freshUser = await storage.getUser(user.id);
      
      if (!freshUser) {
        // User not found in database
        return res.status(404).json({ message: "User not found" });
      }
      
      // Successfully returning user data



      // Remove sensitive information before sending to client
      const { password, ...userWithoutPassword } = freshUser;

      
      // Add cache-busting headers to ensure fresh data is returned
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("[USER] Error fetching user data:", error);
      return res.status(500).json({ message: "Error fetching user data" });
    }
  });

  // Resend verification email
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          message: "Email address is required"
        });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);

      if (!user) {
        // Don't reveal that the email doesn't exist for security reasons
        return res.status(200).json({
          message: "If your email exists in our system, a verification email has been sent."
        });
      }

      // Check if email is already verified
      if (user.isEmailVerified) {
        return res.status(400).json({
          message: "Email is already verified"
        });
      }

      // Generate new verification token
      const token = generateVerificationToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Save the new token
      await storage.setVerificationToken(user.id, token, expires);

      // Send new verification email
      const emailResult = await sendVerificationEmail(user, token);

      if (emailResult.success) {
        return res.status(200).json({
          success: true,
          message: "Verification email sent successfully"
        });
      } else {
        // Log the error but don't expose details to client
        console.error(`Failed to send verification email to ${user.email}:`, emailResult.error);
        return res.status(500).json({
          success: false,
          message: "Failed to send verification email. Please try again later or contact support."
        });
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      return res.status(500).json({
        message: "An error occurred while sending the verification email"
      });
    }
  });

  // Admin API to resend verification email to any user
  app.post("/api/admin/resend-verification", async (req, res) => {
    try {
      // Check if user is an admin
      if (!req.isAuthenticated() || !req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          message: "User ID is required"
        });
      }

      // Find user by ID
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      // Check if email is already verified
      if (user.isEmailVerified) {
        return res.status(400).json({
          message: "This user's email is already verified"
        });
      }

      // Generate new verification token
      const token = generateVerificationToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Save the new token
      await storage.setVerificationToken(user.id, token, expires);

      // Send new verification email
      console.log('Admin resend - sending verification email to user:', {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username
      });
      const emailResult = await sendVerificationEmail(user, token);

      if (emailResult.success) {
        console.log(`Admin ${req.user.username} (ID: ${req.user.id}) resent verification email to ${user.email} (ID: ${user.id})`);
        return res.status(200).json({
          success: true,
          message: `Verification email sent successfully to ${user.email}`
        });
      } else {
        // Log the error but don't expose details to client
        console.error(`Failed to send verification email to ${user.email}:`, emailResult.error);
        return res.status(500).json({
          success: false,
          message: "Failed to send verification email. Please check the logs for details."
        });
      }
    } catch (error) {
      console.error("Error in admin resend verification:", error);
      return res.status(500).json({
        message: "An error occurred while sending the verification email"
      });
    }
  });

  // Admin API to get verification status for all users
  app.get("/api/admin/verification-status", async (req, res) => {
    try {
      // Check if user is an admin
      if (!req.isAuthenticated() || !req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all users with verification status
      const users = await storage.getAllUsers();

      // Map users to only include necessary information for verification status tracking
      const verificationStatuses = users.map(user => {
        return {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          isApproved: user.isApproved,
          role: user.role,
          hasVerificationToken: !!user.emailVerificationToken,
          verificationExpires: user.emailVerificationExpires,
          createdAt: user.createdAt
        };
      });

      console.log(`Admin ${req.user.username} (ID: ${req.user.id}) accessed verification status list`);
      return res.status(200).json(verificationStatuses);
    } catch (error) {
      console.error("Error getting verification status:", error);
      return res.status(500).json({
        message: "An error occurred while retrieving verification status"
      });
    }
  });

  // Email verification endpoint with CORS support for cross-domain verification
  // Helper functions for creating HTML templates
  const getHtmlErrorTemplate = (title: string, message: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MoogShip - ${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .logo {
      margin-bottom: 20px;
      max-width: 200px;
    }
    h1 {
      color: #d32f2f;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #555;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .error-icon {
      color: #d32f2f;
      font-size: 48px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      background-color: #1170c9;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: bold;
      transition: background-color 0.3s;
    }
    .btn:hover {
      background-color: #0d5ca0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">✗</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://app.moogship.com/auth" class="btn">Go to Login</a>
  </div>
</body>
</html>
  `;

  const getHtmlSuccessTemplate = (message: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MoogShip - Email Verification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .logo {
      margin-bottom: 20px;
      max-width: 200px;
    }
    h1 {
      color: #1170c9;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #555;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .success-icon {
      color: #4caf50;
      font-size: 48px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      background-color: #1170c9;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: bold;
      transition: background-color 0.3s;
    }
    .btn:hover {
      background-color: #0d5ca0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✓</div>
    <h1>Email Verification Successful</h1>
    <p>${message}</p>
    <a href="https://app.moogship.com/auth" class="btn">Go to Login</a>
  </div>
</body>
</html>
  `;

  /**
   * Email verification endpoint
   * - This endpoint processes email verification tokens
   * - For app.moogship.com verification links
   * - Completely rewired to use redirection instead of direct HTML responses
   */
  app.get("/api/verify-email/:token", async (req, res) => {
    // Enable CORS for all origins to allow verification from any domain
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      const { token } = req.params;

      // Enhanced logging for debugging
      console.log(`[VERIFICATION] Verification attempt with token: ${token}`);
      console.log(`[VERIFICATION] Request URL: ${req.originalUrl}`);
      console.log(`[VERIFICATION] Host: ${req.headers.host}`);
      console.log(`[VERIFICATION] Origin: ${req.headers.origin}`);
      console.log(`[VERIFICATION] Referer: ${req.headers.referer}`);
      console.log(`[VERIFICATION] Accept: ${req.headers.accept}`);
      console.log(`[VERIFICATION] User-Agent: ${req.headers['user-agent']}`);

      // Check if token is provided
      if (!token) {
        console.log('[VERIFICATION] Failed: No token provided');
        // Redirect to frontend verification page with error
        return res.redirect('/verification-result?status=error&message=Invalid+verification+token.+Please+request+a+new+verification+email.');
      }

      // Try to verify the email with the provided token
      const user = await storage.verifyEmail(token);

      // Handle invalid or expired token
      if (!user) {
        console.log(`[VERIFICATION] Failed: Invalid or expired token ${token}`);
        // Redirect to frontend verification page with error
        return res.redirect('/verification-result?status=error&message=Invalid+or+expired+verification+token.+Please+request+a+new+verification+email.');
      }

      // Token is valid and email is now verified
      console.log(`[VERIFICATION] Success: Email verified for user ${user.email} (ID: ${user.id})`);

      // Prepare success message based on approval status
      const successMsg = user.isApproved 
        ? "Email verified successfully. You can now log in."
        : "Email verified successfully. Please wait for an administrator to approve your account.";

      // Determine status for the redirect
      const status = user.isApproved ? 'success' : 'pending';

      // Redirect to frontend verification page with success
      const encodedMsg = encodeURIComponent(successMsg);

      // Check if we're on the production domain, otherwise use relative path
      const isProduction = req.headers.host?.includes('moogship.com');
      const redirectBase = isProduction ? 'https://app.moogship.com' : '';
      return res.redirect(`${redirectBase}/verification-result?status=${status}&message=${encodedMsg}`);

    } catch (error) {
      console.error("[VERIFICATION] Error:", error);

      // Redirect to frontend verification page with error
      // Check if we're on the production domain, otherwise use relative path
      const isProduction = req.headers.host?.includes('moogship.com');
      const redirectBase = isProduction ? 'https://app.moogship.com' : '';
      return res.redirect(`${redirectBase}/verification-result?status=error&message=An+error+occurred+during+email+verification.+Please+try+again+later+or+contact+support.`);
    }
  });

  /**
   * Verification result page - new endpoint to handle verification results
   * This should be used by the React app to display verification results
   */
  app.get("/verification-result", (req, res) => {
    // Just render HTML directly - this endpoint is accessed directly
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Get query parameters
    const status = req.query.status || 'error';
    const message = req.query.message || 'Verification status unknown.';

    // Check if we're on the production domain
    const isProduction = req.headers.host?.includes('moogship.com');

    // Determine title and colors based on status
    let title, iconColor, titleColor, icon;

    if (status === 'success') {
      title = 'Email Verification Successful';
      iconColor = '#4caf50';
      titleColor = '#1170c9';
      icon = '✓';
    } else if (status === 'pending') {
      title = 'Email Verified - Approval Pending';
      iconColor = '#ff9800';
      titleColor = '#ff9800';
      icon = '⏳';
    } else {
      title = 'Email Verification Failed';
      iconColor = '#d32f2f';
      titleColor = '#d32f2f';
      icon = '✗';
    }

    // Send the HTML response with customized content
    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MoogShip - ${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    h1 {
      color: ${titleColor};
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #555;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .icon {
      color: ${iconColor};
      font-size: 48px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      background-color: #1170c9;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: bold;
      transition: background-color 0.3s;
    }
    .btn:hover {
      background-color: #0d5ca0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${req.headers.host?.includes('moogship.com') ? 'https://app.moogship.com/auth' : '/auth'}" class="btn">Go to Login</a>
  </div>
</body>
</html>
    `);
  });

  // Refresh user session data from database
  app.post("/api/refresh-session", (req, res) => {
    try {
      // Check if the user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        console.log("Unauthenticated attempt to refresh session");
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.user.id;

      // Get fresh user data
      storage.getUser(userId).then(freshUserData => {
        if (!freshUserData) {
          return res.status(404).json({ message: "User not found" });
        }

        // Update the session user data
        req.login(freshUserData, (err) => {
          if (err) {
            console.error("Error refreshing user session:", err);
            return res.status(500).json({ message: "Failed to refresh session" });
          }

          // Save the session to ensure changes are persisted
          req.session.save((err) => {
            if (err) {
              console.error("Error saving session after refresh:", err);
              return res.status(500).json({ message: "Failed to save refreshed session" });
            }

            console.log(`Session refreshed for user ${freshUserData.username} (ID: ${freshUserData.id})`);
            console.log("Updated session ID:", req.sessionID);

            // Return success without the password
            const { password, ...userWithoutPassword } = freshUserData;
            return res.json({ 
              success: true,
              message: "Session refreshed successfully",
              user: userWithoutPassword
            });
          });
        });
      }).catch(error => {
        console.error("Error fetching fresh user data:", error);
        res.status(500).json({ message: "Failed to refresh user data" });
      });
    } catch (error) {
      console.error("Unexpected error in refresh-session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}