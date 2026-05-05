# Railway Deployment Guide

## Prerequisites
1. [Railway account](https://railway.app) (free tier works)
2. [GitHub account](https://github.com)
3. MongoDB Atlas URI (already done!)

---

## Step 1: Push to GitHub

```bash
cd c:\ethara
git init
git add .
git commit -m "Initial commit: Team Task Manager"
```

Create a new repository on GitHub, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/team-task-manager.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repository
3. Railway will detect the `backend` folder. Set **Root Directory** to `backend`
4. Add these **Environment Variables** in Railway dashboard:
   ```
   MONGO_URI=mongodb+srv://anush123:12345cluster@mytest.dodtdls.mongodb.net/teamtaskmanager?appName=mytest
   JWT_SECRET=taskmanager_super_secret_jwt_key_2024
   NODE_ENV=production
   CLIENT_URL=https://your-frontend.railway.app
   PORT=5000
   ```
5. Set **Start Command**: `node src/index.js`
6. Deploy! Copy the generated URL (e.g., `https://backend-xxx.railway.app`)

---

## Step 3: Deploy Frontend on Railway

1. Add a **New Service** in the same Railway project → **GitHub Repo** again
2. Set **Root Directory** to `frontend`
3. Add **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-xxx.railway.app/api
   ```
4. Set **Build Command**: `npm run build`
5. Set **Start Command**: `npx serve dist -s -l 3000`
6. Install serve: add to `frontend/package.json` → `"serve": "^14.2.0"` in dependencies

Alternatively, use **Railway Static Site** deployment:
- Build Command: `npm run build`
- Publish Directory: `dist`

---

## Step 4: Update CORS

After getting both URLs, update the backend's `CLIENT_URL` env var to point to your frontend URL.

---

## Verify Deployment
1. Visit your frontend URL
2. Sign up (first user = admin automatically)
3. Create a project, add tasks, test role switching in Team page

---

## Quick Deploy with Railway CLI (Optional)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
