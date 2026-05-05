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

const POPULATE_TASK = [
  { path: 'assignees', select: 'name email avatar' },
  { path: 'creator', select: 'name email' },
  { path: 'project', select: 'title color' }
];

// @route   GET /api/tasks/dashboard
// @desc    Dashboard stats + recent/overdue tasks for current user
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    // Admin sees all tasks; member sees tasks they are assigned to
    const baseQuery = isAdmin ? {} : { assignees: req.user._id };
    const now = new Date();

    const [total, todo, inProgress, done, overdue] = await Promise.all([
      Task.countDocuments(baseQuery),
      Task.countDocuments({ ...baseQuery, status: 'todo' }),
      Task.countDocuments({ ...baseQuery, status: 'in-progress' }),
      Task.countDocuments({ ...baseQuery, status: 'done' }),
      Task.countDocuments({ ...baseQuery, status: { $ne: 'done' }, dueDate: { $lt: now } })
    ]);

    const recentTasks = await Task.find(baseQuery)
      .populate(POPULATE_TASK)
      .sort({ updatedAt: -1 }).limit(5);

    const overdueTasks = await Task.find({
      ...baseQuery, status: { $ne: 'done' }, dueDate: { $lt: now }
    }).populate(POPULATE_TASK).sort({ dueDate: 1 }).limit(5);

    res.json({ success: true, data: { stats: { total, todo, inProgress, done, overdue }, recentTasks, overdueTasks } });
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
    let query = {};
    const isAdmin = req.user.role === 'admin';

    if (req.query.projectId) {
      const project = await Project.findById(req.query.projectId);
      if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
      if (!isAdmin && !project.members.some(m => m.equals(req.user._id))) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      query.project = req.query.projectId;
    } else {
      // Admin: all tasks; Member: only tasks they're assigned to
      if (!isAdmin) query.assignees = req.user._id;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;

    const tasks = await Task.find(query)
      .populate(POPULATE_TASK)
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(POPULATE_TASK);
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

    const project = await Project.findById(projectId).populate('members', '_id name');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Auto-assign to ALL project members
    const assignees = project.members.map(m => m._id);

    const task = await Task.create({
      title, description, project: projectId,
      assignees,           // <-- all members
      creator: req.user._id,
      status, priority, dueDate: dueDate || null, tags
    });

    const populated = await Task.findById(task._id).populate(POPULATE_TASK);
    res.status(201).json({ success: true, message: `Task created & assigned to ${assignees.length} member(s)`, data: populated });
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
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssignee = task.assignees.some(a => a.equals(req.user._id));

    if (!isAdmin && !isAssignee) return res.status(403).json({ success: false, message: 'Access denied' });

    if (isAdmin) {
      const { title, description, status, priority, dueDate, tags } = req.body;
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate || null;
      if (tags) task.tags = tags;
    } else {
      if (req.body.status) task.status = req.body.status;
    }

    await task.save();
    const populated = await Task.findById(task._id).populate(POPULATE_TASK);
    res.json({ success: true, message: 'Task updated', data: populated });
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
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isAdmin = req.user.role === 'admin';
    const isAssignee = task.assignees.some(a => a.equals(req.user._id));

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ success: false, message: 'Only assignees or admin can update status' });
    }

    task.status = req.body.status;
    await task.save();
    res.json({ success: true, message: 'Status updated', data: task });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/tasks/:id (admin only)
router.delete('/:id', protect, requireAdmin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted' });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
