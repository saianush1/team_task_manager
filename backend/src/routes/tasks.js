const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  return null;
};

// @route   GET /api/tasks/dashboard
// @desc    Dashboard stats + recent/overdue tasks for current user
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const assigneeId = isAdmin ? null : req.user.id;

    const [total, todo, inProgress, done, overdue] = await Promise.all([
      Task.count({ assigneeId }),
      Task.count({ assigneeId, status: 'todo' }),
      Task.count({ assigneeId, status: 'in-progress' }),
      Task.count({ assigneeId, status: 'done' }),
      Task.count({ assigneeId, notStatus: 'done', overdue: true })
    ]);

    const recentTasks = await Task.findRecent({ assigneeId, limit: 5 });
    const overdueTasks = await Task.findOverdue({ assigneeId, limit: 5 });

    res.json({
      success: true,
      data: { stats: { total, todo, inProgress, done, overdue }, recentTasks, overdueTasks }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks
// @desc    Get tasks filtered by project and/or user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter = {};

    if (req.query.projectId) {
      const projectId = parseInt(req.query.projectId, 10);
      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
      const isMember = await Project.isMember(projectId, req.user.id);
      if (!isAdmin && !isMember) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      filter.projectId = projectId;
    } else if (!isAdmin) {
      filter.assigneeId = req.user.id;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const tasks = await Task.find(filter);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tasks
// @desc    Create task (admin only) — auto-assigns to ALL project members
// @access  Admin
router.post('/', protect, requireAdmin, [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('status').optional().isIn(['todo', 'in-progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  const ve = handleValidation(req, res);
  if (ve) return;

  try {
    const { title, description, projectId, status, priority, dueDate, tags } = req.body;
    const projectIdInt = parseInt(projectId, 10);

    const project = await Project.findById(projectIdInt);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Auto-assign to ALL project members
    const assigneeIds = project.members.map(m => m.id);

    const task = await Task.create({
      title, description,
      projectId: projectIdInt,
      assigneeIds,
      creatorId: req.user.id,
      status, priority,
      dueDate: dueDate || null,
      tags: tags || []
    });

    res.status(201).json({
      success: true,
      message: `Task created & assigned to ${assigneeIds.length} member(s)`,
      data: task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task (admin: all fields; member: only status if they are an assignee)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssignee = await Task.isAssignee(taskId, req.user.id);

    if (!isAdmin && !isAssignee) return res.status(403).json({ success: false, message: 'Access denied' });

    let updated;
    if (isAdmin) {
      const { title, description, status, priority, dueDate, tags } = req.body;
      updated = await Task.update(taskId, { title, description, status, priority, dueDate, tags });
    } else {
      updated = await Task.updateStatus(taskId, req.body.status);
    }

    res.json({ success: true, message: 'Task updated', data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/tasks/:id/status
// @desc    Quick status update (assignee or admin)
router.patch('/:id/status', protect, [
  body('status').isIn(['todo', 'in-progress', 'done']).withMessage('Invalid status')
], async (req, res) => {
  const ve = handleValidation(req, res);
  if (ve) return;

  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssignee = await Task.isAssignee(taskId, req.user.id);

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ success: false, message: 'Only assignees or admin can update status' });
    }

    const updated = await Task.updateStatus(taskId, req.body.status);
    res.json({ success: true, message: 'Status updated', data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/tasks/:id (admin only)
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    await Task.delete(taskId);
    res.json({ success: true, message: 'Task deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
