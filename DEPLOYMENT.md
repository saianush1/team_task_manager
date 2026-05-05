# Team Task Manager — Deployment Guide

## Stack
- **Frontend**: React + Vite (deploy on Railway / Vercel / Netlify)
- **Backend**: Node.js + Express
- **Database**: **PostgreSQL** (Railway PostgreSQL plugin)

---

## Railway Deployment

### 1. Add PostgreSQL Plugin
In your Railway project, add the **PostgreSQL** plugin. Railway will automatically inject the `DATABASE_URL` environment variable.

### 2. Backend Environment Variables (set in Railway)
```
DATABASE_URL=<auto-injected by Railway PostgreSQL plugin>
JWT_SECRET=<your-secret>
CLIENT_URL=<your-frontend-url>
NODE_ENV=production
PORT=<auto-injected by Railway>
```

> **Note:** `DATABASE_URL` is automatically provided by the Railway PostgreSQL plugin.
> Tables are created automatically on first server startup — no migration step needed.

### 3. Backend Start Command
```
node src/index.js
```

### 4. Frontend Environment Variable
```
VITE_API_URL=https://<your-backend-railway-url>
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or use Railway's public URL)

### Setup
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL to your local or Railway PostgreSQL URL
npm install
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Seed Demo Data
After registering the first user (admin):
```bash
cd backend
npm run seed
```

---

## Database Schema
Tables are auto-created by `src/db.js` on startup:
- `users`
- `projects`
- `project_members` (junction)
- `join_requests`
- `tasks`
- `task_assignees` (junction)
