/**
 * ============================================================================
 * AUTH ROUTES — Login & Session Management
 * ============================================================================
 * POST /login — authenticate with email/password, receive JWT
 * GET  /me    — retrieve current user's profile (authenticated)
 *
 * CSC476 Group 16 — Blockchain-Based School Payment System
 * ============================================================================
 */

const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /login — Authenticate user and issue JWT
// ---------------------------------------------------------------------------
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Look up user by email
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password against bcrypt hash
    const passwordValid = bcryptjs.compareSync(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Build JWT payload (never include the password hash)
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      matric_number: user.matric_number,
      wallet_address: user.wallet_address
    };

    // Sign token with 24-hour expiry
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Log the login event
    db.prepare(`
      INSERT INTO audit_log (actor_id, action, details, ip_address)
      VALUES (?, 'USER_LOGIN', ?, ?)
    `).run(user.id, JSON.stringify({ email: user.email, role: user.role }), req.ip);

    // Return token and safe user object
    const { password: _, ...safeUser } = user;
    res.json({
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// ---------------------------------------------------------------------------
// GET /me — Return authenticated user's profile
// ---------------------------------------------------------------------------
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Strip password from response
    const { password, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('[Auth] /me error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = router;
