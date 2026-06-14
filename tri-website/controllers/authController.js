const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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

// Helper to send reset email
const sendResetEmail = async (email, name, code) => {
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email';
  const SMTP_PORT = process.env.SMTP_PORT || 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  let transporter;
  let isMock = false;

  if (SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        password: SMTP_PASS
      }
    });
  } else {
    isMock = true;
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`[Email Setup] Mock SMTP for Reset configured successfully. User: ${testAccount.user}`);
    } catch (e) {
      console.warn('[Email Warning] Could not initialize Ethereal mail; writing logs locally.', e.message);
    }
  }

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your TRI Password</title>
    </head>
    <body style="background-color: #0b0b0c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f5f5f7; margin: 0; padding: 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0b0c; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="500" border="0" cellspacing="0" cellpadding="0" style="background-color: #121214; border: 1px solid #1c1c1e; border-radius: 12px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.6);">
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  <span style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">△ TRI</span>
                </td>
              </tr>
              <tr>
                <td style="border-top: 1px solid #2c2c2e; padding-top: 20px;">
                  <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px;">Password Reset Request</h2>
                  <p style="font-size: 14px; color: #a1a1a6; line-height: 1.5; margin-bottom: 20px;">
                    Hello ${name || 'User'},<br><br>
                    We received a request to reset your password. Use the verification code below to proceed. This code will expire in 15 minutes.
                  </p>
                  <div style="background-color: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #e6a2a4;">${code}</span>
                  </div>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5;">
                    If you did not request a password reset, please ignore this email or contact support if you have concerns.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const mailOptions = {
    from: SMTP_USER ? `"TRI Security" <${SMTP_USER}>` : '"TRI Security" <security@therealinside.com>',
    to: email,
    subject: `Reset Your TRI Password — Verification Code: ${code}`,
    html: emailHTML
  };

  const saveEmailLocally = (emailAddr, html) => {
    try {
      const dir = path.join(__dirname, '../mock_emails');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const safeEmail = emailAddr.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = path.join(dir, `${safeEmail}_reset.html`);
      fs.writeFileSync(filePath, html, 'utf8');
      console.log(`[Local Email Copy] Reset HTML email saved locally to: ${filePath}`);
    } catch (error) {
      console.error('[Local Email Save Error] Failed to write HTML log:', error.message);
    }
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      if (isMock) {
        console.log(`[Email Mock Success] Reset code sent. Link: ${nodemailer.getTestMessageUrl(info)}`);
      } else {
        console.log(`[Email Production Success] Reset code sent: ${info.messageId}`);
      }
      return true;
    } catch (mailError) {
      console.error('[Email Dispatch Error] Failed to send reset email via SMTP:', mailError.message);
      saveEmailLocally(email, emailHTML);
      return false;
    }
  } else {
    console.warn('[Email System] Transporter not initialized. Saving reset email locally.');
    saveEmailLocally(email, emailHTML);
    return false;
  }
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

    if (!user || !user.password) {
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

// 5. GOOGLE AUTH (SIMULATED)
exports.googleAuth = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: 'Email and Google ID are required.'
      });
    }

    const emailLower = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (!user) {
      // Create user
      const count = await prisma.user.count();
      const role = count === 0 ? 'admin' : 'user';
      user = await prisma.user.create({
        data: {
          name: name ? name.trim() : 'Google User',
          email: emailLower,
          googleId,
          role
        }
      });
    } else if (!user.googleId) {
      // Link Google ID
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId }
      });
    }

    const token = generateToken(user.id);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Authenticated with Google successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Google Auth Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during Google auth.'
    });
  }
};

// 6. APPLE AUTH (SIMULATED)
exports.appleAuth = async (req, res) => {
  try {
    const { email, name, appleId } = req.body;
    if (!email || !appleId) {
      return res.status(400).json({
        success: false,
        message: 'Email and Apple ID are required.'
      });
    }

    const emailLower = email.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (!user) {
      const count = await prisma.user.count();
      const role = count === 0 ? 'admin' : 'user';
      user = await prisma.user.create({
        data: {
          name: name ? name.trim() : 'Apple User',
          email: emailLower,
          appleId,
          role
        }
      });
    } else if (!user.appleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { appleId }
      });
    }

    const token = generateToken(user.id);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Authenticated with Apple successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Apple Auth Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during Apple auth.'
    });
  }
};

// 7. FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.'
      });
    }

    const emailLower = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (!user) {
      // For security, don't reveal if email doesn't exist, say code was sent if email matches system.
      // But for local testing, we can return success.
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset code has been sent.'
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save code to database
    await prisma.passwordResetCode.create({
      data: {
        email: emailLower,
        code,
        expiresAt
      }
    });

    // Send email using nodemailer transporter if configured
    try {
      const nodemailer = require('nodemailer');
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      const info = await transporter.sendMail({
        from: '"TRI Support" <support@therealinside.com>',
        to: emailLower,
        subject: 'Your Password Reset Code - TRI',
        text: `Your password reset code is: ${code}. It expires in 10 minutes.`,
        html: `<p>Your password reset code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p>`
      });
      console.log(`[Forgot Password] Ethereal email sent. Link: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (e) {
      console.log(`[Forgot Password Mock] Code for ${emailLower} is: ${code}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to email.'
    });
  } catch (error) {
    console.error('[Forgot Password Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process forgot password request.'
    });
  }
};

// 8. RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, code, and new password are required.'
      });
    }

    const emailLower = email.toLowerCase().trim();
    // Find valid code
    const resetEntry = await prisma.passwordResetCode.findFirst({
      where: {
        email: emailLower,
        code: code.trim(),
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!resetEntry) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.'
      });
    }

    // Update user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email: emailLower },
      data: { password: hashedPassword }
    });

    // Delete verification codes for this email
    await prisma.passwordResetCode.deleteMany({
      where: { email: emailLower }
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('[Reset Password Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password.'
    });
  }
};


// 5. GOOGLE LOGIN
exports.googleLogin = async (req, res) => {
  try {
    const { token, idToken } = req.body;
    const incomingToken = token || idToken;

    if (!incomingToken) {
      return res.status(400).json({
        success: false,
        message: 'Google auth token is required.'
      });
    }

    let email = null;
    let name = null;
    let googleId = null;

    // 1. Try JWT decode if token is structured like a JWT
    try {
      const parts = incomingToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
        const decoded = JSON.parse(payloadJson);
        email = decoded.email;
        name = decoded.name || decoded.email.split('@')[0];
        googleId = decoded.sub || decoded.email;
      }
    } catch (e) {
      console.log('[Google Auth JWT Decode Fallback]: Token is not a JWT or invalid structure.');
    }

    // 2. Try JSON parsing if token is a JSON string
    if (!email) {
      try {
        const decoded = JSON.parse(incomingToken);
        email = decoded.email;
        name = decoded.name || decoded.email.split('@')[0];
        googleId = decoded.googleId || decoded.sub || decoded.email;
      } catch (e) {}
    }

    // 3. Fallback: Treat as raw email or generate a mock
    if (!email) {
      if (typeof incomingToken === 'string' && incomingToken.includes('@')) {
        email = incomingToken.trim();
        name = email.split('@')[0];
        googleId = `google_mock_${name}`;
      } else {
        email = 'google_mock@atriwellness.com';
        name = 'Google Mock User';
        googleId = 'google_mock_12345';
      }
    }

    const emailLower = email.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: emailLower }
        ]
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email: emailLower,
          googleId,
          role: 'user'
        }
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId }
      });
    }

    const jwtToken = generateToken(user.id);
    setAuthCookie(res, jwtToken);

    return res.status(200).json({
      success: true,
      message: 'Google login successful.',
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Google Login Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during Google authentication.'
    });
  }
};

// 6. APPLE LOGIN
exports.appleLogin = async (req, res) => {
  try {
    const { token, idToken } = req.body;
    const incomingToken = token || idToken;

    if (!incomingToken) {
      return res.status(400).json({
        success: false,
        message: 'Apple auth token is required.'
      });
    }

    let email = null;
    let name = null;
    let appleId = null;

    // 1. Try JWT decode if token is structured like a JWT
    try {
      const parts = incomingToken.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
        const decoded = JSON.parse(payloadJson);
        email = decoded.email;
        name = decoded.name || decoded.email.split('@')[0];
        appleId = decoded.sub || decoded.email;
      }
    } catch (e) {
      console.log('[Apple Auth JWT Decode Fallback]: Token is not a JWT or invalid structure.');
    }

    // 2. Try JSON parsing if token is a JSON string
    if (!email) {
      try {
        const decoded = JSON.parse(incomingToken);
        email = decoded.email;
        name = decoded.name || decoded.email.split('@')[0];
        appleId = decoded.appleId || decoded.sub || decoded.email;
      } catch (e) {}
    }

    // 3. Fallback: Treat as raw email or generate a mock
    if (!email) {
      if (typeof incomingToken === 'string' && incomingToken.includes('@')) {
        email = incomingToken.trim();
        name = email.split('@')[0];
        appleId = `apple_mock_${name}`;
      } else {
        email = 'apple_mock@atriwellness.com';
        name = 'Apple Mock User';
        appleId = 'apple_mock_12345';
      }
    }

    const emailLower = email.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { appleId },
          { email: emailLower }
        ]
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email: emailLower,
          appleId,
          role: 'user'
        }
      });
    } else if (!user.appleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { appleId }
      });
    }

    const jwtToken = generateToken(user.id);
    setAuthCookie(res, jwtToken);

    return res.status(200).json({
      success: true,
      message: 'Apple login successful.',
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Apple Login Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during Apple authentication.'
    });
  }
};

// 7. FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    const emailLower = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a 6-digit reset code has been sent.'
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetCode.create({
      data: {
        email: emailLower,
        code,
        expiresAt
      }
    });

    await sendResetEmail(emailLower, user.name, code);

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a 6-digit reset code has been sent.'
    });
  } catch (error) {
    console.error('[Forgot Password Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error processing password reset.'
    });
  }
};

// 8. RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, code, and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const emailLower = email.toLowerCase().trim();

    const resetRecord = await prisma.passwordResetCode.findFirst({
      where: {
        email: emailLower,
        code: code.trim(),
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset code.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email: emailLower },
      data: { password: hashedPassword }
    });

    await prisma.passwordResetCode.deleteMany({
      where: { email: emailLower }
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully.'
    });
  } catch (error) {
    console.error('[Reset Password Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error resetting password.'
    });
  }
};
