const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Get profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -resetToken -resetTokenExpiry');
    res.json(user);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update name and bio
router.put('/', auth, async (req, res) => {
  try {
    const { name, bio } = req.body;
    if (!name || name.trim().length < 2)
      return res.status(400).json({ message: 'Name must be at least 2 characters' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim(), bio: bio?.trim() || '' },
      { new: true }
    ).select('-password -resetToken -resetTokenExpiry');

    res.json({ message: 'Profile updated', user });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile picture (base64)
router.put('/picture', auth, async (req, res) => {
  try {
    const { profilePicture } = req.body;
    if (!profilePicture)
      return res.status(400).json({ message: 'No image provided' });

    // Limit size ~1MB base64
    if (profilePicture.length > 1400000)
      return res.status(400).json({ message: 'Image too large. Max 1MB.' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture },
      { new: true }
    ).select('-password -resetToken -resetTokenExpiry');

    res.json({ message: 'Profile picture updated', user });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both fields are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    const match = await user.comparePassword(currentPassword);
    if (!match)
      return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
