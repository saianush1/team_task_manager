const express = require('express');
const User = require('../models/User');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, data: req.user });
});

// @route   GET /api/users
// @desc    Get all users (admin sees all, member sees all for display purposes)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/me
// @desc    Update own profile name/avatar
// @access  Private
router.put('/me', protect, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();
    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NOTE: No role-change endpoint — role is system-assigned (single admin rule)

module.exports = router;
