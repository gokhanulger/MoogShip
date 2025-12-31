import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware to ensure user is logged in
 */
export function requireLogin(req: Request, res: Response, next: NextFunction) {
  // Check if user is in session
  if (req.user && req.user.id) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized: Please log in to access this resource' });
}

/**
 * Authorization middleware to ensure user has admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if user is in session
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Unauthorized: Please log in to access this resource' });
  }
  
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  
  next();
}