const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');   // ⭐ ADD THIS
const nodemailer = require('nodemailer');
const router = express.Router();

// Test Gmail connection
router.get('/test-gmail', async (req, res) => {
  try {
    const transporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
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

  // Gmail configuration with detailed logging
  console.log('Attempting Gmail send with:', {
    user: process.env.GMAIL_USER,
    passLength: process.env.GMAIL_APP_PASSWORD?.length
  });

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Test connection first
  try {
    await transporter.verify();
    console.log('✅ Gmail connection verified');
  } catch (verifyError) {
    console.error('❌ Gmail connection failed:', verifyError.message);
  }

  try {
    const mailOptions = {
      from: `"GD Platform" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code - GD Platform',
      text: `Your OTP is: ${otp}. This code expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #007bff; text-align: center;">GD Platform</h2>
          <h3 style="color: #333;">Email Verification Required</h3>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background: #f8f9fa; border: 2px solid #007bff; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #007bff; border-radius: 8px; margin: 20px 0; letter-spacing: 3px;">
            ${otp}
          </div>
          <p><strong>Important:</strong> This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message from GD Platform.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}: ${otp}`);
    
    return res.json({ 
      message: "OTP sent to your email successfully!"
    });
  } catch (error) {
    console.error('❌ Gmail error:', error);
    
    // Fallback: show OTP if email fails
    console.log(`🔧 FALLBACK - OTP for ${email}: ${otp}`);
    return res.json({ 
      message: "Email failed, but here's your OTP", 
      otp: otp,
      error: "Gmail delivery failed"
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
      user: { id: user._id, name: user.name, email: user.email }
    });
  }

  // ⭐ EXISTING USER → Login with OTP
  // Delete used OTP
  await OTP.deleteOne({ email, otp });
  
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  return res.json({
    message: "Login successful",
    token,
    user: { id: user._id, name: user.name, email: user.email }
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
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
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
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
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
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();
    
    res.json({ 
      message: 'Reset link generated:', 
      resetLink: `http://localhost:3000/reset-password/${resetToken}`
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    
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