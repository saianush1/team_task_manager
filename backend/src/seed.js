/**
 * Demo Seed Script — TaskFlow
 * Creates: 5 members + 3 projects + 12 tasks
 *
 * Usage: node src/seed.js
 * WARNING: This ADDS to existing data (does not wipe the DB).
 *          Admin must already exist (first registered user).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

const COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#38bdf8', '#f97316', '#ec4899'];

const DEMO_MEMBERS = [
  { name: 'Alice Johnson', email: 'alice@taskflow.dev', password: 'member123' },
  { name: 'Bob Chen',      email: 'bob@taskflow.dev',   password: 'member123' },
  { name: 'Carol Smith',   email: 'carol@taskflow.dev', password: 'member123' },
  { name: 'David Patel',   email: 'david@taskflow.dev', password: 'member123' },
  { name: 'Eva Martinez',  email: 'eva@taskflow.dev',   password: 'member123' },
];

const DEMO_PROJECTS = [
  {
    title: 'Website Redesign',
    description: 'Revamp the company website with modern UI/UX principles and new branding.',
    status: 'active',
    color: '#7c3aed',
    memberNames: ['Alice Johnson', 'Bob Chen', 'Carol Smith']
  },
  {
    title: 'Mobile App Development',
    description: 'Build a cross-platform mobile app for iOS and Android using React Native.',
    status: 'active',
    color: '#10b981',
    memberNames: ['David Patel', 'Eva Martinez', 'Bob Chen']
  },
  {
    title: 'Marketing Campaign Q3',
    description: 'Plan and execute a comprehensive Q3 marketing campaign across all channels.',
    status: 'active',
    color: '#f59e0b',
    memberNames: ['Alice Johnson', 'Carol Smith', 'Eva Martinez']
  }
];

const DEMO_TASKS = {
  'Website Redesign': [
    { title: 'Audit existing website pages', description: 'Review all current pages for content, SEO, and UX issues.', status: 'done', priority: 'high', daysOffset: -5 },
    { title: 'Design new homepage mockup', description: 'Create high-fidelity Figma mockup for the new homepage.', status: 'in-progress', priority: 'high', daysOffset: 3 },
    { title: 'Implement responsive navigation', description: 'Build a mobile-first navigation menu with smooth animations.', status: 'todo', priority: 'medium', daysOffset: 7 },
    { title: 'SEO metadata update', description: 'Update all meta titles, descriptions, and Open Graph tags.', status: 'todo', priority: 'low', daysOffset: 14 },
  ],
  'Mobile App Development': [
    { title: 'Setup React Native project', description: 'Initialize the project, configure Expo, and set up CI/CD pipelines.', status: 'done', priority: 'high', daysOffset: -10 },
    { title: 'Design authentication flow', description: 'Design and implement login, signup, and biometric auth screens.', status: 'in-progress', priority: 'high', daysOffset: 2 },
    { title: 'Build home screen dashboard', description: 'Create the main app dashboard with key stats and quick actions.', status: 'todo', priority: 'medium', daysOffset: 8 },
    { title: 'Push notifications setup', description: 'Integrate FCM for Android and APNs for iOS push notifications.', status: 'todo', priority: 'medium', daysOffset: 12 },
  ],
  'Marketing Campaign Q3': [
    { title: 'Define campaign goals & KPIs', description: 'Set SMART goals and identify key performance indicators for Q3.', status: 'done', priority: 'high', daysOffset: -7 },
    { title: 'Create social media content calendar', description: 'Plan 90 days of content across Instagram, Twitter, and LinkedIn.', status: 'in-progress', priority: 'medium', daysOffset: 4 },
    { title: 'Design email newsletter templates', description: 'Create 4 branded email templates for the quarterly newsletter series.', status: 'todo', priority: 'medium', daysOffset: 9 },
    { title: 'Launch paid ad campaigns', description: 'Set up and launch Google Ads and Meta Ads campaigns with A/B testing.', status: 'todo', priority: 'high', daysOffset: -2 },  // overdue!
  ]
};

async function seed() {
  console.log('\n🌱 TaskFlow Demo Seeder');
  console.log('━'.repeat(40));

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Find admin
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('❌ No admin found! Register the first user via the app, then run this script.');
    process.exit(1);
  }
  console.log(`👑 Admin found: ${admin.name} (${admin.email})\n`);

  // Create demo members (skip if email already exists)
  console.log('👥 Creating demo members...');
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

  // Create demo projects
  console.log('\n📁 Creating demo projects...');
  const createdProjects = {};
  for (const p of DEMO_PROJECTS) {
    const existing = await Project.findOne({ title: p.title });
    if (existing) {
      console.log(`   ⏭  "${p.title}" already exists`);
      createdProjects[p.title] = existing;
      continue;
    }
    const memberIds = p.memberNames.map(n => createdMembers[n]?._id).filter(Boolean);
    const project = await Project.create({
      title: p.title, description: p.description,
      status: p.status, color: p.color,
      owner: admin._id,
      members: [admin._id, ...memberIds]
    });
    createdProjects[p.title] = project;
    console.log(`   ✅ Created: "${p.title}" (${memberIds.length} members assigned)`);
  }

  // Create demo tasks
  console.log('\n📋 Creating demo tasks...');
  const now = new Date();
  let taskCount = 0;

  for (const [projectTitle, tasks] of Object.entries(DEMO_TASKS)) {
    const project = createdProjects[projectTitle];
    if (!project) continue;

    const freshProject = await Project.findById(project._id).populate('members', '_id');
    const assignees = freshProject.members.map(m => m._id);

    for (const t of tasks) {
      const existing = await Task.findOne({ title: t.title, project: project._id });
      if (existing) {
        console.log(`   ⏭  Task "${t.title}" already exists`);
        continue;
      }
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + t.daysOffset);

      await Task.create({
        title: t.title, description: t.description,
        project: project._id,
        assignees,          // assigned to ALL project members
        creator: admin._id,
        status: t.status,
        priority: t.priority,
        dueDate
      });
      console.log(`   ✅ [${projectTitle}] "${t.title}" → ${assignees.length} assignees, status: ${t.status}`);
      taskCount++;
    }
  }

  console.log('\n' + '━'.repeat(40));
  console.log('🎉 Seed Complete!');
  console.log(`   Members created: up to ${DEMO_MEMBERS.length}`);
  console.log(`   Projects created: up to ${DEMO_PROJECTS.length}`);
  console.log(`   Tasks created: ${taskCount}`);
  console.log('\n📌 Demo Login Credentials:');
  console.log('   Admin:   (your registered admin account)');
  DEMO_MEMBERS.forEach(m => console.log(`   ${m.name.padEnd(16)}: ${m.email} / ${m.password}`));
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
