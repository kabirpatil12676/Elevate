import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

/**
 * Generate a JWT token for a user.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Cookie Configuration Helper
 *
 * - In production cross-origin deployment (e.g. Vercel frontend calling Render backend),
 *   sameSite must be 'none' and secure must be true for browsers to send the cookie.
 * - In local development (HTTP localhost), secure is false and sameSite is 'lax' for
 *   standard browser cookie behavior without local HTTPS certificates.
 * - Supports COOKIE_SAME_SITE override if a same-origin reverse proxy is configured.
 */
const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Public registration always creates a learner. Client-supplied role values
    // (including educator/admin) are ignored to prevent privilege escalation.
    const userRole = 'learner';

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, avatar_url, created_at`,
      [name, email, passwordHash, userRole]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.cookie('token', token, getAuthCookieOptions());

    res.status(201).json({ success: true, user, token });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, name, email, password_hash, role, avatar_url FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.cookie('token', token, getAuthCookieOptions());

    const { password_hash, ...userData } = user;
    res.json({ success: true, user: userData, token });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = (req, res) => {
  const { maxAge, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie('token', clearOptions);
  res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * GET /api/auth/me — Get current authenticated user
 */
export const getMe = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, avatar_url, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
