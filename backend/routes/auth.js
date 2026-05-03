const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const nodemailer = require('nodemailer');
const { sendEmail } = require('../utils/sendEmail');
const router = express.Router();

// Test Gmail connection
router.get('/test-gmail', async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    
    await transporter.verify();
    res.json({ message: 'Gmail connection successful!' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Gmail connection failed', 
      error: error.message 
    });
  }
});

// ⭐ Send OTP for Registration or Login
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });
  
  // Block admin email registration completely
  if (email === 'admin@gd.com') {
    return res.status(403).json({ message: 'Admin registration is not allowed through this system' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.create({ email, otp });

  const subject = 'GD Platform OTP Verification';
  const text = `Your OTP is ${otp}. Use this code to complete your registration or login.`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f4f6fb; color: #1f2937;">
      <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.02em;">GD Platform</h1>
          <p style="margin: 12px 0 0; font-size: 14px; opacity: 0.85;">Secure account verification</p>
        </div>
        <div style="padding: 32px 28px 24px;">
          <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75; color: #111827;">Hello,</p>
          <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.75;">Use the code below to verify your identity and continue with GD Platform.</p>
          <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 0.24em; color: #4338ca;">${otp}</span>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background: #eef2ff; color: #1d4ed8; border-radius: 9999px; padding: 10px 16px; font-size: 14px;">Expires in 5 minutes</span>
          </div>
          <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.75; color: #4b5563;">If you did not request this code, you can ignore this email and no changes will be made to your account.</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.75; color: #4b5563;">Thanks,<br>The GD Platform Team</p>
        </div>
        <div style="background: #f8fafc; padding: 18px 28px 24px; font-size: 13px; color: #6b7280;">
          <p style="margin: 0;">Need assistance? Reply to this email or visit our support center.</p>
        </div>
      </div>
    </div>
  `;

  try {
    await sendEmail(email, subject, html, text);
    console.log(`✅ OTP email sent to ${email}`);

    return res.json({ 
      message: `OTP sent to ${email}. Please check your inbox.`
    });
  } catch (error) {
    console.error('❌ OTP email delivery failed:', error.message || error);
    console.log(`🔧 FALLBACK - OTP for ${email}: ${otp}`);

    return res.json({ 
      message: 'Email failed, but here\'s your OTP', 
      otp: otp,
      error: error.message || 'Email delivery failed'
    });
  }
});

// ⭐ Verify OTP for Registration OR Login
router.post("/verify-otp", async (req, res) => {
  const { name, email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  const record = await OTP.findOne({ email, otp });
  if (!record)
    return res.status(400).json({ message: "Invalid or expired OTP" });

  let user = await User.findOne({ email });

  if (!user) {
    // Block admin email registration completely
    if (email === 'admin@gd.com') {
      return res.status(403).json({ message: 'Admin registration is not allowed through this system' });
    }
    
    // ⭐ NEW USER → Register with OTP as temporary password
    if (!name)
      return res.status(400).json({ message: "Name is required for registration" });

    user = new User({
      name,
      email,
      password: otp  // ⭐ your User model will auto-hash this
    });

    await user.save();

    // Delete used OTP
    await OTP.deleteOne({ email, otp });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    return res.json({
      message: "Registration successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, profilePicture: user.profilePicture || '' }
    });
  }

  // ⭐ EXISTING USER → Login with OTP
  // Delete used OTP
  await OTP.deleteOne({ email, otp });
  
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  return res.json({
    message: "Login successful",
    token,
    user: { id: user._id, name: user.name, email: user.email, profilePicture: user.profilePicture || '' }
  });
});

// Register (OTP Required)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    
    // Block admin email registration completely
    if (email === 'admin@gd.com') {
      return res.status(403).json({ message: 'Admin registration is not allowed through this system' });
    }
    
    // Check if OTP is provided and valid
    if (!otp) {
      return res.status(400).json({ message: 'OTP verification required for registration' });
    }

    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ name, email, password });
    await user.save();

    // Delete used OTP
    await OTP.deleteOne({ email, otp });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, profilePicture: user.profilePicture || '' } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, profilePicture: user.profilePicture || '' } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ email, otp });

    const subject = 'GD Platform Password Reset Code';
    const text = `Your password reset OTP is ${otp}. Enter this code in the app to reset your password.`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #f4f6fb; color: #1f2937;">
        <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #111827 0%, #1d4ed8 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: -0.02em;">GD Platform</h1>
            <p style="margin: 12px 0 0; font-size: 14px; opacity: 0.85;">Password reset confirmation</p>
          </div>
          <div style="padding: 32px 28px 24px;">
            <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.75; color: #111827;">Hello,</p>
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.75;">We received a request to reset your password. Enter the code below in the GD Platform app to continue.</p>
            <div style="background: #eef2ff; border: 1px solid #93c5fd; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 0.24em; color: #1e40af;">${otp}</span>
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="display: inline-block; background: #e0f2fe; color: #0369a1; border-radius: 9999px; padding: 10px 16px; font-size: 14px;">Expires in 5 minutes</span>
            </div>
            <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.75; color: #4b5563;">If you did not request a password reset, you can ignore this message. Your account will remain secure.</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.75; color: #4b5563;">Sincerely,<br>The GD Platform Security Team</p>
          </div>
          <div style="background: #f8fafc; padding: 18px 28px 24px; font-size: 13px; color: #6b7280;">
            <p style="margin: 0;">If you need additional support, contact our team at support@gdplatform.com.</p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail(email, subject, html, text);
      console.log(`✅ Password reset OTP email sent to ${email}`);

      return res.json({ 
        message: 'Password reset OTP sent. Please check your inbox.'
      });
    } catch (error) {
      console.error('❌ Password reset OTP email delivery failed:', error.message || error);
      console.log(`🔧 FALLBACK - Password reset OTP for ${email}: ${otp}`);
      return res.json({ 
        message: 'Email failed, but here\'s your password reset OTP',
        otp,
        error: error.message || 'Email delivery failed'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.password = newPassword;
    await user.save();
    
    await OTP.deleteOne({ email, otp });
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete specific user (temporary route)
router.get('/delete-user', async (req, res) => {
  try {
    // First, find the user
    const user = await User.findOne({ email: 'jav.anal.panal09@gmail.com' });
    console.log('Found user:', user);
    
    if (!user) {
      return res.json({ message: 'User not found in database' });
    }
    
    // Delete the user
    const result = await User.deleteOne({ email: 'jav.anal.panal09@gmail.com' });
    console.log('Delete result:', result);
    
    res.json({ 
      message: 'User deleted successfully',
      deletedCount: result.deletedCount,
      userWas: user.name
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});


module.exports = router;
