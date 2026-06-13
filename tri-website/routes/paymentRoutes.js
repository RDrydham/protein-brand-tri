const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middlewares/auth');

// Middleware to optionally authenticate a request if a JWT is present
const optionalAuth = async (req, res, next) => {
  const jwt = require('jsonwebtoken');
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const parts = cookie.split('=');
      const key = parts[0] ? parts[0].trim() : '';
      const val = parts.slice(1).join('=');
      acc[key] = val;
      return acc;
    }, {});
    token = cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tri_perf_auth_secret_key_2026_dev_only_change_me');
      const prisma = require('../config/db');
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user) {
        req.user = user;
      }
    } catch (err) {
      // Ignore token verification errors for optional auth
    }
  }
  next();
};

router.post('/create-order', optionalAuth, paymentController.createPaymentOrder);
router.post('/verify', paymentController.verifyPayment);

module.exports = router;
