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
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.findAll();

    const projectsWithMeta = await Promise.all(projects.map(async (project) => {
      const taskCount = await Project.taskCount(project.id);
      const completedCount = await Project.completedTaskCount(project.id);
      const isMember = project.members.some(m => m.id === req.user.id);
      const myJoinStatus = await Project.myJoinStatus(project.id, req.user.id);
      return {
        ...project,
        taskCount,
        completedCount,
        isMember,
        myJoinStatus
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
    const requests = await Project.getPendingRequestsAcrossProjects();
    res.json({ success: true, data: requests, count: requests.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
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
      owner_id: req.user.id,
      memberIds: members || []
    });

    res.status(201).json({ success: true, message: 'Project created', data: project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id
// @access  Admin
router.put('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Project not found' });

    const { title, description, status, color } = req.body;
    const project = await Project.update(req.params.id, { title, description, status, color });

    res.json({ success: true, message: 'Project updated', data: project });
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

    await Task.deleteByProject(project.id);
    await Project.delete(project.id);
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

    const userId = parseInt(req.body.userId, 10);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const alreadyMember = await Project.isMember(project.id, userId);
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User is already a member' });

    await Project.addMember(project.id, userId);

    // Auto-accept any pending join request from this user
    await Project.resolveJoinRequest(project.id, userId, 'accepted');

    const populated = await Project.findById(project.id);
    res.json({ success: true, message: `${user.name} added to project`, data: populated });
  } catch (error) {
    console.error('Add member error:', error);
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

    const userId = parseInt(req.params.userId, 10);
    if (project.owner.id === userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove project owner' });
    }

    await Project.removeMember(project.id, userId);
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

    const alreadyMember = await Project.isMember(project.id, req.user.id);
    if (alreadyMember) return res.status(400).json({ success: false, message: 'You are already a member' });

    const hasPending = await Project.hasPendingRequest(project.id, req.user.id);
    if (hasPending) {
      return res.status(400).json({ success: false, message: 'Join request already pending' });
    }

    await Project.addJoinRequest(project.id, req.user.id);
    res.json({ success: true, message: 'Join request sent! Waiting for admin approval.' });
  } catch (error) {
    console.error('Join request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id/join-request/:userId/accept
// @access  Admin
router.put('/:id/join-request/:userId/accept', protect, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const userId = parseInt(req.params.userId, 10);
    const hasPending = await Project.hasPendingRequest(project.id, userId);
    if (!hasPending) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    await Project.resolveJoinRequest(project.id, userId, 'accepted');
    const alreadyMember = await Project.isMember(project.id, userId);
    if (!alreadyMember) {
      await Project.addMember(project.id, userId);
    }

    const user = await User.findById(userId);
    res.json({ success: true, message: `${user.name} has been added to the project!` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id/join-request/:userId/reject
// @access  Admin
router.put('/:id/join-request/:userId/reject', protect, requireAdmin, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const userId = parseInt(req.params.userId, 10);
    const hasPending = await Project.hasPendingRequest(project.id, userId);
    if (!hasPending) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    await Project.resolveJoinRequest(project.id, userId, 'rejected');
    const user = await User.findById(userId);
    res.json({ success: true, message: `Request from ${user.name} rejected.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
