import jwt from 'jsonwebtoken';

/**
 * Middleware: Verify JWT token from Authorization header or cookie.
 * Attaches decoded user payload to req.user.
 */
export const authenticate = (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Middleware: Authorize specific roles.
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'educator', 'learner')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};
