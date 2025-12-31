import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "moogship_super_secret_key";

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  // Get the token from the authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token.' });
  }
};

// Middleware to check if user is an admin
export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin rights required.' });
  }
  
  next();
};

// Middleware to check if user is the owner of the resource or an admin
export const isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  
  // If user is admin, allow access
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Check if user is the owner of the resource
  const resourceUserId = parseInt(req.params.userId || req.body.userId);
  
  if (req.user.id !== resourceUserId) {
    return res.status(403).json({ message: 'Access denied. Not the owner of this resource.' });
  }
  
  next();
};
