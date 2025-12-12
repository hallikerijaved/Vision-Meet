const express = require('express');
const GD = require('../models/GD');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all active GDs
router.get('/', auth, async (req, res) => {
  try {
    const gds = await GD.find({ isActive: true }).populate('moderator', 'name').populate('participants', 'name');
    res.json(gds);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new GD
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, maxParticipants } = req.body;
    const roomId = Date.now().toString();
    
    const gd = new GD({
      title,
      description,
      moderator: req.user._id,
      roomId,
      maxParticipants: maxParticipants || 10
    });
    
    await gd.save();
    await gd.populate('moderator', 'name');
    
    res.status(201).json(gd);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Join GD
router.post('/:id/join', auth, async (req, res) => {
  try {
    const gd = await GD.findById(req.params.id);
    if (!gd || !gd.isActive) {
      return res.status(404).json({ message: 'GD not found or inactive' });
    }
    
    if (gd.participants.length >= gd.maxParticipants) {
      return res.status(400).json({ message: 'GD is full' });
    }
    
    if (!gd.participants.includes(req.user._id)) {
      gd.participants.push(req.user._id);
      await gd.save();
    }
    
    await gd.populate(['moderator', 'participants'], 'name');
    res.json(gd);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave GD
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const gd = await GD.findById(req.params.id);
    if (!gd) {
      return res.status(404).json({ message: 'GD not found' });
    }
    
    gd.participants = gd.participants.filter(p => p.toString() !== req.user._id.toString());
    
    // Auto-close if no participants left
    if (gd.participants.length === 0) {
      gd.isActive = false;
    }
    
    await gd.save();
    res.json({ message: 'Left GD successfully', participantCount: gd.participants.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// End GD (moderator only)
router.patch('/:id/end', auth, async (req, res) => {
  try {
    const gd = await GD.findById(req.params.id);
    if (!gd) {
      return res.status(404).json({ message: 'GD not found' });
    }
    
    if (gd.moderator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only moderator can end GD' });
    }
    
    gd.isActive = false;
    await gd.save();
    
    res.json({ message: 'GD ended successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;