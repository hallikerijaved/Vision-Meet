const express = require('express');
const GD = require('../models/GD');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Admin middleware
const adminAuth = async (req, res, next) => {
  if (req.user.email !== 'admin@gd.com') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get all GDs (active and inactive)
router.get('/gds', auth, adminAuth, async (req, res) => {
  try {
    const gds = await GD.find().populate('moderator', 'name email').populate('participants', 'name email').sort({ createdAt: -1 });
    res.json(gds);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Force end GD
router.patch('/gds/:id/force-end', auth, adminAuth, async (req, res) => {
  try {
    const gd = await GD.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.json({ message: 'GD ended by admin' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent admin from deleting themselves or other admins
    if (user.email === 'admin@gd.com') {
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }
    
    // Ensure only one admin exists
    if (req.user.email !== 'admin@gd.com') {
      return res.status(403).json({ message: 'Only admin can delete users' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `User ${user.name} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;