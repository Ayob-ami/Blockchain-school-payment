/**
 * ============================================================================
 * AUTH MIDDLEWARE — JWT Authentication & Role Authorization
 * ============================================================================
 * Provides two middleware functions:
 *
 *   • authenticateToken  — verifies JWT from Authorization header
 *   • authorizeRoles     — restricts access to specified roles
 *
 * CSC476 Group 16 — Blockchain-Based School Payment System
 * ============================================================================
 */

const jwt = require('jsonwebtoken');

// JWT secret key (shared across the application)
const JWT_SECRET = 'blockchain-school-payment-secret-key-csc476';

// ---------------------------------------------------------------------------
// authenticateToken — verify Bearer token and attach user to req.user
// ---------------------------------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Expect format: "Bearer <token>"
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No authorization header provided.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Access denied. Invalid authorization format. Use "Bearer <token>".' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach the decoded payload to the request object
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid or malformed token.' });
  }
}

// ---------------------------------------------------------------------------
// authorizeRoles — restrict route to specific user roles
// ---------------------------------------------------------------------------
/**
 * Returns a middleware that checks if the authenticated user's role
 * is included in the allowed roles list.
 *
 * Usage: router.get('/admin-only', authenticateToken, authorizeRoles('bursar', 'auditor'), handler)
 *
 * @param {...string} roles - one or more allowed roles
 * @returns {Function} Express middleware
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required before authorization.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`
      });
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = { authenticateToken, authorizeRoles, JWT_SECRET };
