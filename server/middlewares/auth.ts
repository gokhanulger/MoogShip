import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestPath = req.path;
    
    // Priority 0: Check Bearer token authentication (for API clients like Chrome extension)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Decode the simple base64 token format: "userId:email"
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [userIdStr, email] = decoded.split(':');
        const userId = parseInt(userIdStr, 10);
        
        if (!isNaN(userId)) {
          const user = await storage.getUser(userId);
          if (user && user.email === email) {
            req.user = user;
            console.log(`[AUTH] ${requestPath} - Bearer token: User ${user.username} (ID: ${user.id})`);
            return next();
          }
        }
      } catch (error) {
        console.error('[AUTH] Bearer token decode failed:', error);
      }
    }
    
    // Priority 1: Check Express session authentication
    if (req.user?.id) {
      console.log(`[AUTH] ${requestPath} - Priority 1 (Express session): User ${req.user.username} (ID: ${req.user.id})`);
      return next();
    }
    
    // Priority 2: Check passport authentication
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log(`[AUTH] ${requestPath} - Priority 2 (Passport): User ${req.user?.username} (ID: ${req.user?.id})`);
      return next();
    }
    
    // Priority 3: Check session object directly
    if (req.session?.passport?.user) {
      try {
        const user = await storage.getUser(req.session.passport.user);
        if (user) {
          req.user = user;
          console.log(`[AUTH] ${requestPath} - Priority 3 (Session lookup): User ${user.username} (ID: ${user.id})`);
          return next();
        }
      } catch (error) {
        console.error('[AUTH] Session user lookup failed:', error);
      }
    }
    
    // Priority 4: Production deployment - direct database session lookup
    const isProduction = req.headers.host?.includes('moogship.com') ||
                        req.headers['x-forwarded-host']?.includes('moogship.com') ||
                        process.env.REPLIT_DEPLOYMENT === '1';
    
    if (isProduction) {
      console.log('[AUTH] Production authentication attempt:', {
        host: req.headers.host,
        forwardedHost: req.headers['x-forwarded-host'],
        replitDeployment: process.env.REPLIT_DEPLOYMENT,
        hasCookie: !!req.headers.cookie,
        cookiePreview: req.headers.cookie?.substring(0, 100) + '...'
      });
      
      const cookieHeader = req.headers.cookie;
      
      if (cookieHeader?.includes('moogship_session')) {
        // Extract session ID from various cookie formats
        const patterns = [
          /moogship_session=s%3A([^;]+)/,  // URL encoded
          /moogship_session=s:([^;]+)/,    // Standard
          /moogship_session=([^;]+)/       // Direct
        ];
        
        let sessionId = null;
        for (const pattern of patterns) {
          const match = cookieHeader.match(pattern);
          if (match) {
            let value = match[1];
            if (pattern === patterns[0]) {
              value = decodeURIComponent(value);
            }
            sessionId = value.split('.')[0];
            console.log('[AUTH] Extracted session ID:', sessionId.substring(0, 8) + '...');
            break;
          }
        }
        
        if (sessionId) {
          try {
            const { Client } = require('pg');
            const client = new Client({ connectionString: process.env.DATABASE_URL });
            await client.connect();
            
            const result = await client.query(
              'SELECT sess FROM session WHERE sid = $1 AND expire > NOW()', 
              [sessionId]
            );
            
            await client.end();
            
            console.log('[AUTH] Session lookup result:', {
              found: result.rows.length > 0,
              sessionId: sessionId.substring(0, 8) + '...'
            });
            
            if (result.rows.length > 0) {
              const sessionData = JSON.parse(result.rows[0].sess);
              
              if (sessionData?.passport?.user) {
                const user = await storage.getUser(sessionData.passport.user);
                if (user) {
                  console.log(`[AUTH] ${requestPath} - Priority 4 (Production DB): User ${user.username} (ID: ${user.id}) [Session ID: ${sessionId.substring(0, 8)}...]`);
                  req.user = user;
                  return next();
                }
              } else {
                console.log(`[AUTH] ${requestPath} - Priority 4: Session found but no user data`);
              }
            } else {
              console.log(`[AUTH] ${requestPath} - Priority 4: No session found in database`);
            }
          } catch (dbError) {
            console.log('[AUTH] Production session lookup failed:', dbError.message);
          }
        } else {
          console.log('[AUTH] Could not extract session ID from cookie');
        }
      } else {
        console.log('[AUTH] No moogship_session cookie found in production');
      }
    }
    
    return res.status(401).json({ message: 'Authentication required' });
    
  } catch (error) {
    return res.status(500).json({ message: 'Authentication error' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};

export const isSelfOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const userId = parseInt(req.params.id || req.params.userId || '0');
  if (req.user.role === 'admin' || req.user.id === userId) {
    return next();
  }
  
  return res.status(403).json({ message: 'Access denied' });
};

export const isOwnerOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role === 'admin') {
    return next();
  }
  
  try {
    const shipmentId = parseInt(req.params.id || '0');
    const shipment = await storage.getShipment(shipmentId);
    
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    
    if (shipment.userId === req.user.id) {
      return next();
    }
    
    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    console.error('Error checking shipment ownership:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const hasReturnSystemAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Check if user has return system access
  if (req.user.canAccessReturnSystem !== true) {
    return res.status(403).json({ 
      message: 'Return system access required. Please contact support to request access.',
      code: 'RETURN_SYSTEM_ACCESS_REQUIRED'
    });
  }
  
  next();
};