const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return null;
};

// @route   GET /api/projects
// @desc    Get projects. Admin: all. Member: member-of + all others (can see to request join)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar role')
      .populate('joinRequests.user', 'name email avatar')
      .sort({ createdAt: -1 });

    const projectsWithMeta = await Promise.all(projects.map(async (project) => {
      const taskCount = await Task.countDocuments({ project: project._id });
      const completedCount = await Task.countDocuments({ project: project._id, status: 'done' });
      const isMember = project.members.some(m => m._id.equals(req.user._id));
      const myRequest = project.joinRequests.find(r => r.user && r.user._id && r.user._id.equals(req.user._id));
      return {
        ...project.toJSON(),
        taskCount,
        completedCount,
        isMember,
        myJoinStatus: myRequest ? myRequest.status : null
      };
    }));

    res.json({ success: true, data: projectsWithMeta });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/projects/pending-requests
// @desc    Admin gets all pending join requests across all projects
// @access  Admin
router.get('/pending-requests', protect, requireAdmin, async (req, res) => {
  try {
    const projects = await Project.find({ 'joinRequests.status': 'pending' })
      .populate('joinRequests.user', 'name email avatar')
      .select('title color joinRequests');

    const requests = [];
    projects.forEach(project => {
      project.joinRequests
        .filter(r => r.status === 'pending')
        .forEach(r => {
          requests.push({
            projectId: project._id,
            projectTitle: project.title,
            projectColor: project.color,
            requestId: r._id,
            user: r.user,
            requestedAt: r.requestedAt
          });
        });
    });

    res.json({ success: true, data: requests, count: requests.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar role')
      .populate('joinRequests.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/projects
// @desc    Create new project (admin only)
// @access  Admin
router.post('/', protect, requireAdmin, [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('description').optional().trim(),
  body('status').optional().isIn(['active', 'completed', 'on-hold']),
], async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;

  try {
    const { title, description, status, color, members } = req.body;

    const project = await Project.create({
      title, description, status, color,
      owner: req.user._id,
      members: members || []
    });

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar role');

    res.status(201).json({ success: true, message: 'Project created', data: populated });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id
// @access  Admin
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { title, description, status, color } = req.body;
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (color) project.color = color;

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar role');

    res.json({ success: true, message: 'Project updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/projects/:id
// @access  Admin
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ success: true, message: 'Project and all tasks deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/projects/:id/members
// @desc    Admin directly adds a member to project
// @access  Admin
router.post('/:id/members', protect, requireAdmin, [
  body('userId').notEmpty().withMessage('User ID is required')
], async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const alreadyMember = project.members.some(m => m.equals(req.body.userId));
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User is already a member' });

    project.members.push(req.body.userId);

    // Auto-accept any pending join request from this user
    const reqIdx = project.joinRequests.findIndex(r => r.user.equals(req.body.userId) && r.status === 'pending');
    if (reqIdx !== -1) {
      project.joinRequests[reqIdx].status = 'accepted';
      project.joinRequests[reqIdx].resolvedAt = new Date();
    }

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar role');

    res.json({ success: true, message: `${user.name} added to project`, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/projects/:id/members/:userId
// @desc    Admin removes a member from project
// @access  Admin
router.delete('/:id/members/:userId', protect, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.owner.equals(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Cannot remove project owner' });
    }

    project.members = project.members.filter(m => !m.equals(req.params.userId));
    await project.save();

    res.json({ success: true, message: 'Member removed from project' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/projects/:id/join-request
// @desc    Member requests to join a project
// @access  Member
router.post('/:id/join-request', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin already has access to all projects' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const alreadyMember = project.members.some(m => m.equals(req.user._id));
    if (alreadyMember) return res.status(400).json({ success: false, message: 'You are already a member' });

    const existingRequest = project.joinRequests.find(r =>
      r.user.equals(req.user._id) && r.status === 'pending'
    );
    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'Join request already pending' });
    }

    // Remove any old rejected request before adding new one
    project.joinRequests = project.joinRequests.filter(r => !r.user.equals(req.user._id));
    project.joinRequests.push({ user: req.user._id, status: 'pending' });
    await project.save();

    res.json({ success: true, message: 'Join request sent! Waiting for admin approval.' });
  } catch (error) {
    console.error('Join request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id/join-request/:userId/accept
// @desc    Admin accepts a join request
// @access  Admin
router.put('/:id/join-request/:userId/accept', protect, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const requestIdx = project.joinRequests.findIndex(
      r => r.user.equals(req.params.userId) && r.status === 'pending'
    );
    if (requestIdx === -1) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    project.joinRequests[requestIdx].status = 'accepted';
    project.joinRequests[requestIdx].resolvedAt = new Date();

    // Add to members if not already there
    if (!project.members.some(m => m.equals(req.params.userId))) {
      project.members.push(req.params.userId);
    }

    await project.save();

    const user = await User.findById(req.params.userId).select('name email');
    res.json({ success: true, message: `${user.name} has been added to the project!` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id/join-request/:userId/reject
// @desc    Admin rejects a join request
// @access  Admin
router.put('/:id/join-request/:userId/reject', protect, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const requestIdx = project.joinRequests.findIndex(
      r => r.user.equals(req.params.userId) && r.status === 'pending'
    );
    if (requestIdx === -1) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    project.joinRequests[requestIdx].status = 'rejected';
    project.joinRequests[requestIdx].resolvedAt = new Date();
    await project.save();

    const user = await User.findById(req.params.userId).select('name');
    res.json({ success: true, message: `Request from ${user.name} rejected.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
