/**
 * Demo Seed Script — TaskFlow (PostgreSQL)
 * Creates: 1 admin + 5 members + 3 projects + 12 tasks
 *
 * Usage: node src/seed.js
 * Safe to re-run — skips any records that already exist.
 */

require('dotenv').config();
const { initDB } = require('./db');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

// ─── Demo Credentials ─────────────────────────────────────────────────────────

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

// ─── Demo Projects ────────────────────────────────────────────────────────────

const DEMO_PROJECTS = [
  {
    title: 'Website Redesign',
    description: 'Revamp the company website with modern UI/UX principles and new branding guidelines.',
    status: 'active',
    color: '#7c3aed',
    memberNames: ['Alice Johnson', 'Bob Chen', 'Carol Smith'],
  },
  {
    title: 'Mobile App Development',
    description: 'Build a cross-platform mobile app for iOS and Android using React Native.',
    status: 'active',
    color: '#10b981',
    memberNames: ['David Patel', 'Eva Martinez', 'Bob Chen'],
  },
  {
    title: 'Marketing Campaign Q3',
    description: 'Plan and execute a comprehensive Q3 marketing campaign across all digital channels.',
    status: 'active',
    color: '#f59e0b',
    memberNames: ['Alice Johnson', 'Carol Smith', 'Eva Martinez'],
  },
];

// ─── Demo Tasks ───────────────────────────────────────────────────────────────

const DEMO_TASKS = {
  'Website Redesign': [
    {
      title: 'Audit existing website pages',
      description: 'Review all current pages for content, SEO issues, and UX pain points.',
      status: 'done',
      priority: 'high',
      daysOffset: -5,
    },
    {
      title: 'Design new homepage mockup',
      description: 'Create high-fidelity Figma mockup for the new homepage hero and sections.',
      status: 'in-progress',
      priority: 'high',
      daysOffset: 3,
    },
    {
      title: 'Implement responsive navigation',
      description: 'Build a mobile-first navigation menu with smooth animations and accessibility.',
      status: 'todo',
      priority: 'medium',
      daysOffset: 7,
    },
    {
      title: 'SEO metadata update',
      description: 'Update all meta titles, descriptions, and Open Graph tags sitewide.',
      status: 'todo',
      priority: 'low',
      daysOffset: 14,
    },
  ],
  'Mobile App Development': [
    {
      title: 'Setup React Native project',
      description: 'Initialize the project, configure Expo, and set up CI/CD pipelines.',
      status: 'done',
      priority: 'high',
      daysOffset: -10,
    },
    {
      title: 'Design authentication flow',
      description: 'Design and implement login, signup, and biometric auth screens.',
      status: 'in-progress',
      priority: 'high',
      daysOffset: 2,
    },
    {
      title: 'Build home screen dashboard',
      description: 'Create the main app dashboard with key stats and quick action buttons.',
      status: 'todo',
      priority: 'medium',
      daysOffset: 8,
    },
    {
      title: 'Push notifications setup',
      description: 'Integrate FCM for Android and APNs for iOS push notifications.',
      status: 'todo',
      priority: 'medium',
      daysOffset: 12,
    },
  ],
  'Marketing Campaign Q3': [
    {
      title: 'Define campaign goals & KPIs',
      description: 'Set SMART goals and identify key performance indicators for Q3.',
      status: 'done',
      priority: 'high',
      daysOffset: -7,
    },
    {
      title: 'Create social media content calendar',
      description: 'Plan 90 days of content across Instagram, Twitter, and LinkedIn.',
      status: 'in-progress',
      priority: 'medium',
      daysOffset: 4,
    },
    {
      title: 'Design email newsletter templates',
      description: 'Create 4 branded email templates for the quarterly newsletter series.',
      status: 'todo',
      priority: 'medium',
      daysOffset: 9,
    },
    {
      title: 'Launch paid ad campaigns',
      description: 'Set up and launch Google Ads and Meta Ads campaigns with A/B testing.',
      status: 'todo',
      priority: 'high',
      daysOffset: -2, // overdue — intentional for demo realism
    },
  ],
};

// ─── Main Seeder ──────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 TaskFlow Demo Seeder (PostgreSQL)');
  console.log('━'.repeat(45));

  if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL is not set. Add it to backend/.env before seeding.');
  }

  await initDB();
  console.log('✅ Connected to PostgreSQL\n');

  const { pool } = require('./db');

  // ── Step 1: Create Admin ────────────────────────────────────────────────────
  console.log('👑 Setting up admin account...');
  let admin;
  const existingAdmin = await User.findOne({ email: ADMIN.email });
  if (existingAdmin) {
    admin = existingAdmin;
    console.log(`   ⏭  Admin already exists: ${admin.name} (${admin.email})`);
  } else {
    // Also check if any admin role user exists from manual registration
    const { rows: anyAdmin } = await pool.query(
      `SELECT * FROM users WHERE role = 'admin' LIMIT 1`
    );
    if (anyAdmin.length > 0) {
      admin = { id: anyAdmin[0].id, name: anyAdmin[0].name, email: anyAdmin[0].email };
      console.log(`   ⏭  Existing admin found: ${admin.name} (${admin.email}) — skipping admin creation`);
    } else {
      admin = await User.create({ ...ADMIN });
      console.log(`   ✅ Admin created: ${ADMIN.name} (${ADMIN.email}) — password: ${ADMIN.password}`);
    }
  }

  // ── Step 2: Create Members ──────────────────────────────────────────────────
  console.log('\n👥 Creating demo members...');
  const createdMembers = {};
  for (const m of DEMO_MEMBERS) {
    const existing = await User.findOne({ email: m.email });
    if (existing) {
      console.log(`   ⏭  ${m.name} already exists`);
      createdMembers[m.name] = existing;
    } else {
      const user = await User.create({ ...m, role: 'member' });
      createdMembers[m.name] = user;
      console.log(`   ✅ Created: ${m.name} (${m.email}) — password: ${m.password}`);
    }
  }

  // ── Step 3: Create Projects ─────────────────────────────────────────────────
  console.log('\n📁 Creating demo projects...');
  const createdProjects = {};
  for (const p of DEMO_PROJECTS) {
    const { rows: existingRows } = await pool.query(
      'SELECT id FROM projects WHERE title = $1 LIMIT 1',
      [p.title]
    );
    if (existingRows.length > 0) {
      console.log(`   ⏭  "${p.title}" already exists`);
      createdProjects[p.title] = await Project.findById(existingRows[0].id);
      continue;
    }

    const memberIds = p.memberNames
      .map(n => createdMembers[n]?.id)
      .filter(Boolean);

    const project = await Project.create({
      title: p.title,
      description: p.description,
      status: p.status,
      color: p.color,
      owner_id: admin.id,
      memberIds,
    });
    createdProjects[p.title] = project;
    console.log(`   ✅ "${p.title}" created (${memberIds.length} members: ${p.memberNames.join(', ')})`);
  }

  // ── Step 4: Create Tasks ────────────────────────────────────────────────────
  console.log('\n📋 Creating demo tasks...');
  const now = new Date();
  let taskCount = 0;

  for (const [projectTitle, tasks] of Object.entries(DEMO_TASKS)) {
    const project = createdProjects[projectTitle];
    if (!project) continue;

    const freshProject = await Project.findById(project.id);
    const assigneeIds = freshProject.members.map(m => m.id);

    for (const t of tasks) {
      const { rows: existingTask } = await pool.query(
        'SELECT id FROM tasks WHERE title = $1 AND project_id = $2 LIMIT 1',
        [t.title, project.id]
      );
      if (existingTask.length > 0) {
        console.log(`   ⏭  "${t.title}" already exists`);
        continue;
      }

      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + t.daysOffset);

      await Task.create({
        title: t.title,
        description: t.description,
        projectId: project.id,
        assigneeIds,
        creatorId: admin.id,
        status: t.status,
        priority: t.priority,
        dueDate,
      });

      const overdue = t.daysOffset < 0 && t.status !== 'done' ? ' ⚠️  OVERDUE' : '';
      console.log(
        `   ✅ [${projectTitle}] "${t.title}" → ${t.status} / ${t.priority}${overdue}`
      );
      taskCount++;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + '━'.repeat(45));
  console.log('🎉 Seed Complete!\n');
  console.log('📌 Demo Login Credentials:');
  console.log('─'.repeat(45));
  console.log(`   ${'Role'.padEnd(8)} ${'Email'.padEnd(30)} Password`);
  console.log('─'.repeat(45));
  console.log(`   ${'Admin'.padEnd(8)} ${ADMIN.email.padEnd(30)} ${ADMIN.password}`);
  DEMO_MEMBERS.forEach(m =>
    console.log(`   ${'Member'.padEnd(8)} ${m.email.padEnd(30)} ${m.password}`)
  );
  console.log('─'.repeat(45));
  console.log(`\n   Projects: ${Object.keys(DEMO_PROJECTS).length} | Tasks added: ${taskCount}\n`);

  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message || err);
  process.exit(1);
});
