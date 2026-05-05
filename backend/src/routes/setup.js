/**
 * One-time Setup/Reset Endpoint
 * POST /api/setup         { key: "setup-taskflow-2024" }  → wipe & seed everything
 * POST /api/setup/reset   { key: "setup-taskflow-2024" }  → just reset admin password
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const bcrypt = require('bcryptjs');

const SETUP_KEY = 'setup-taskflow-2024';

const ADMIN = {
  name: 'Admin User',
  email: 'admin@taskflow.dev',
  password: 'admin@123',
  role: 'admin',
};

const DEMO_MEMBERS = [
  { name: 'Alice Johnson', email: 'alice@taskflow.dev',  password: 'member123' },
  { name: 'Bob Chen',      email: 'bob@taskflow.dev',    password: 'member123' },
  { name: 'Carol Smith',   email: 'carol@taskflow.dev',  password: 'member123' },
  { name: 'David Patel',   email: 'david@taskflow.dev',  password: 'member123' },
  { name: 'Eva Martinez',  email: 'eva@taskflow.dev',    password: 'member123' },
];

const DEMO_PROJECTS = [
  {
    title: 'Website Redesign',
    description: 'Revamp the company website with modern UI/UX principles and new branding.',
    status: 'active', color: '#7c3aed',
    memberNames: ['Alice Johnson', 'Bob Chen', 'Carol Smith'],
  },
  {
    title: 'Mobile App Development',
    description: 'Build a cross-platform mobile app for iOS and Android using React Native.',
    status: 'active', color: '#10b981',
    memberNames: ['David Patel', 'Eva Martinez', 'Bob Chen'],
  },
  {
    title: 'Marketing Campaign Q3',
    description: 'Plan and execute a comprehensive Q3 marketing campaign across all channels.',
    status: 'active', color: '#f59e0b',
    memberNames: ['Alice Johnson', 'Carol Smith', 'Eva Martinez'],
  },
];

const DEMO_TASKS = {
  'Website Redesign': [
    { title: 'Audit existing website pages',       description: 'Review all current pages for content, SEO, and UX issues.',            status: 'done',        priority: 'high',   daysOffset: -5 },
    { title: 'Design new homepage mockup',         description: 'Create high-fidelity Figma mockup for the new homepage.',               status: 'in-progress', priority: 'high',   daysOffset:  3 },
    { title: 'Implement responsive navigation',    description: 'Build a mobile-first navigation menu with smooth animations.',          status: 'todo',        priority: 'medium', daysOffset:  7 },
    { title: 'SEO metadata update',                description: 'Update all meta titles, descriptions, and Open Graph tags.',            status: 'todo',        priority: 'low',    daysOffset: 14 },
  ],
  'Mobile App Development': [
    { title: 'Setup React Native project',         description: 'Initialize the project, configure Expo, and set up CI/CD pipelines.',  status: 'done',        priority: 'high',   daysOffset: -10 },
    { title: 'Design authentication flow',         description: 'Design and implement login, signup, and biometric auth screens.',       status: 'in-progress', priority: 'high',   daysOffset:   2 },
    { title: 'Build home screen dashboard',        description: 'Create the main dashboard with key stats and quick actions.',           status: 'todo',        priority: 'medium', daysOffset:   8 },
    { title: 'Push notifications setup',           description: 'Integrate FCM for Android and APNs for iOS push notifications.',       status: 'todo',        priority: 'medium', daysOffset:  12 },
  ],
  'Marketing Campaign Q3': [
    { title: 'Define campaign goals & KPIs',       description: 'Set SMART goals and identify key performance indicators for Q3.',       status: 'done',        priority: 'high',   daysOffset:  -7 },
    { title: 'Create social media content calendar', description: 'Plan 90 days of content across Instagram, Twitter, and LinkedIn.',   status: 'in-progress', priority: 'medium', daysOffset:   4 },
    { title: 'Design email newsletter templates',  description: 'Create 4 branded email templates for the quarterly newsletter series.', status: 'todo',        priority: 'medium', daysOffset:   9 },
    { title: 'Launch paid ad campaigns',           description: 'Set up Google Ads and Meta Ads campaigns with A/B testing.',           status: 'todo',        priority: 'high',   daysOffset:  -2 },
  ],
};

router.post('/', async (req, res) => {
  const { key } = req.body;
  if (key !== SETUP_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid setup key.' });
  }

  try {
    // ── Wipe all data (cascade handles FK refs) ──────────────────────────────
    await pool.query('TRUNCATE task_assignees, tasks, project_members, join_requests, projects, users RESTART IDENTITY CASCADE');

    // ── Create Admin ──────────────────────────────────────────────────────────
    const admin = await User.create({ ...ADMIN });

    // ── Create Members ────────────────────────────────────────────────────────
    const createdMembers = {};
    for (const m of DEMO_MEMBERS) {
      createdMembers[m.name] = await User.create({ ...m, role: 'member' });
    }

    // ── Create Projects ───────────────────────────────────────────────────────
    const createdProjects = {};
    for (const p of DEMO_PROJECTS) {
      const memberIds = p.memberNames.map(n => createdMembers[n]?.id).filter(Boolean);
      const project = await Project.create({
        title: p.title, description: p.description,
        status: p.status, color: p.color,
        owner_id: admin.id, memberIds,
      });
      createdProjects[p.title] = project;
    }

    // ── Create Tasks ──────────────────────────────────────────────────────────
    const now = new Date();
    let taskCount = 0;
    for (const [projectTitle, tasks] of Object.entries(DEMO_TASKS)) {
      const project = createdProjects[projectTitle];
      if (!project) continue;
      const freshProject = await Project.findById(project.id);
      const assigneeIds = freshProject.members.map(m => m.id);

      for (const t of tasks) {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + t.daysOffset);
        await Task.create({
          title: t.title, description: t.description,
          projectId: project.id, assigneeIds,
          creatorId: admin.id,
          status: t.status, priority: t.priority, dueDate,
        });
        taskCount++;
      }
    }

    res.json({
      success: true,
      message: '✅ Database reset and seeded successfully!',
      data: {
        admin: { email: ADMIN.email, password: ADMIN.password },
        members: DEMO_MEMBERS.map(m => ({ email: m.email, password: m.password })),
        projects: Object.keys(DEMO_PROJECTS).length,
        tasks: taskCount,
      },
    });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ success: false, message: 'Setup failed.', detail: err.message });
  }
});

// ── Quick admin password reset ────────────────────────────────────────────────
router.post('/reset', async (req, res) => {
  const { key } = req.body;
  if (key !== SETUP_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid setup key.' });
  }
  try {
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash('admin@123', salt);
    const { rowCount } = await pool.query(
      `UPDATE users SET password = $1, role = 'admin', updated_at = NOW() WHERE email = $2`,
      [hashed, 'admin@taskflow.dev']
    );
    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'admin@taskflow.dev not found in DB.' });
    }
    res.json({ success: true, message: '✅ Admin password reset to admin@123. Login now!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Reset failed.', detail: err.message });
  }
});

module.exports = router;
