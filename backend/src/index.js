const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/users', require('./routes/users'));
app.use('/api/setup', require('./routes/setup'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Team Task Manager API running (PostgreSQL)', timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Connect DB & Start Server
const PORT = process.env.PORT || 5000;

if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined. Set it in Railway environment variables or a local .env file.');
}

const { initDB } = require('./db');

initDB()
  .then(async () => {
    // One-time seed: set SEED_ON_START=true in Railway env vars to wipe & seed DB
    if (process.env.SEED_ON_START === 'true') {
      console.log('🌱 SEED_ON_START detected — running full DB seed...');
      try {
        const { pool } = require('./db');
        const User = require('./models/User');
        const Project = require('./models/Project');
        const Task = require('./models/Task');
        const bcrypt = require('bcryptjs');

        await pool.query('TRUNCATE task_assignees, tasks, project_members, join_requests, projects, users RESTART IDENTITY CASCADE');
        console.log('🗑  All tables cleared');

        // Admin
        const admin = await User.create({ name: 'Admin User', email: 'admin@taskflow.dev', password: 'admin@123', role: 'admin' });
        console.log('👑 Admin created:', admin.email);

        // Members
        const members = {};
        for (const m of [
          { name: 'Alice Johnson', email: 'alice@taskflow.dev', password: 'member123' },
          { name: 'Bob Chen',      email: 'bob@taskflow.dev',   password: 'member123' },
          { name: 'Carol Smith',   email: 'carol@taskflow.dev', password: 'member123' },
          { name: 'David Patel',   email: 'david@taskflow.dev', password: 'member123' },
          { name: 'Eva Martinez',  email: 'eva@taskflow.dev',   password: 'member123' },
        ]) {
          members[m.name] = await User.create({ ...m, role: 'member' });
          console.log('👤 Member created:', m.email);
        }

        // Projects
        const projects = {};
        for (const p of [
          { title: 'Website Redesign',       description: 'Revamp company website with modern UI/UX.', color: '#7c3aed', memberNames: ['Alice Johnson','Bob Chen','Carol Smith'] },
          { title: 'Mobile App Development', description: 'Build cross-platform app with React Native.',  color: '#10b981', memberNames: ['David Patel','Eva Martinez','Bob Chen'] },
          { title: 'Marketing Campaign Q3',  description: 'Execute Q3 marketing across all channels.',    color: '#f59e0b', memberNames: ['Alice Johnson','Carol Smith','Eva Martinez'] },
        ]) {
          const memberIds = p.memberNames.map(n => members[n]?.id).filter(Boolean);
          projects[p.title] = await Project.create({ title: p.title, description: p.description, status: 'active', color: p.color, owner_id: admin.id, memberIds });
          console.log('📁 Project created:', p.title);
        }

        // Tasks
        const now = new Date();
        const taskDefs = {
          'Website Redesign':       [ ['Audit existing website pages','Review pages for SEO and UX issues.','done','high',-5], ['Design new homepage mockup','Create Figma mockup for new homepage.','in-progress','high',3], ['Implement responsive navigation','Mobile-first nav with animations.','todo','medium',7], ['SEO metadata update','Update meta titles and OG tags.','todo','low',14] ],
          'Mobile App Development': [ ['Setup React Native project','Init project and configure Expo.','done','high',-10], ['Design authentication flow','Login, signup, and biometric auth.','in-progress','high',2], ['Build home screen dashboard','Dashboard with stats and quick actions.','todo','medium',8], ['Push notifications setup','FCM for Android, APNs for iOS.','todo','medium',12] ],
          'Marketing Campaign Q3':  [ ['Define campaign goals & KPIs','Set SMART goals for Q3.','done','high',-7], ['Create social media content calendar','90-day content plan across platforms.','in-progress','medium',4], ['Design email newsletter templates','4 branded email templates.','todo','medium',9], ['Launch paid ad campaigns','Google Ads and Meta Ads with A/B tests.','todo','high',-2] ],
        };
        let taskCount = 0;
        for (const [pt, tasks] of Object.entries(taskDefs)) {
          const proj = await Project.findById(projects[pt].id);
          const assigneeIds = proj.members.map(m => m.id);
          for (const [title, desc, status, priority, offset] of tasks) {
            const dueDate = new Date(now); dueDate.setDate(dueDate.getDate() + offset);
            await Task.create({ title, description: desc, projectId: proj.id, assigneeIds, creatorId: admin.id, status, priority, dueDate });
            taskCount++;
          }
        }
        console.log(`✅ Seed complete! Admin: admin@taskflow.dev / admin@123 | Members: member123 | Tasks: ${taskCount}`);
      } catch (seedErr) {
        console.error('❌ Seed failed:', seedErr.message);
      }
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection/init error:', err);
    process.exit(1);
  });

module.exports = app;
