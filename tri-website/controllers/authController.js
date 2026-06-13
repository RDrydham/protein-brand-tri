const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'tri_perf_auth_secret_key_2026_dev_only_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Helper to serialize cookie header
const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  let cookieString = `token=${token}; Path=/; HttpOnly; Max-Age=604800; SameSite=Strict`;
  if (isProd) {
    cookieString += '; Secure';
  }
  res.setHeader('Set-Cookie', cookieString);
};

// Helper to clear cookie header
const clearAuthCookie = (res) => {
  res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict');
};

// 1. REGISTER USER
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user exists
    const emailLower = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (first user is admin, otherwise user)
    const count = await prisma.user.count();
    const role = count === 0 ? 'admin' : 'user';

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        password: hashedPassword,
        role
      }
    });

    // Generate JWT and set cookie
    const token = generateToken(newUser.id);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('[Register Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration.'
    });
  }
};

// 2. LOGIN USER
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const emailLower = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT and set cookie
    const token = generateToken(user.id);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Login Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login.'
    });
  }
};

// 3. GET USER PROFILE
exports.getProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('[Profile Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching profile.'
    });
  }
};

// 4. LOGOUT USER
exports.logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('[Logout Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during logout.'
    });
  }
};
