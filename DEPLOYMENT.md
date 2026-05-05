# Railway Deployment Guide — Team Task Manager

## Prerequisites
1. [Railway account](https://railway.app) (free tier works)
2. [GitHub account](https://github.com)
3. MongoDB Atlas URI (from [atlas.mongodb.com](https://cloud.mongodb.com))

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
3. Set **Root Directory** to `backend`
4. Add these **Environment Variables** in the Railway dashboard (never commit real values):
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/teamtaskmanager?retryWrites=true&w=majority
   JWT_SECRET=<generate a long random string>
   NODE_ENV=production
   CLIENT_URL=https://your-frontend.railway.app
   ```
   > ⚠️ Do NOT set PORT manually — Railway injects it automatically.
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
5. Set **Start Command**: `npx serve dist -s -l $PORT`

---

## Step 4: Update CORS

After getting both service URLs, update the backend's `CLIENT_URL` env var in Railway to point to your deployed frontend URL. Railway will restart the service automatically.

---

## ✅ Pre-Deployment Checklist

Before deploying, verify each item:

| Check | Status |
|-------|--------|
| `MONGO_URI` uses MongoDB Atlas (not localhost) | ☐ |
| `MONGO_URI` is set only in Railway env vars (not hardcoded) | ☐ |
| No `.env` file committed to Git (check `.gitignore`) | ☐ |
| `JWT_SECRET` is a strong random string (not a placeholder) | ☐ |
| `NODE_ENV=production` is set in Railway | ☐ |
| `PORT` is NOT manually set (Railway injects it) | ☐ |
| Backend start command is `node src/index.js` | ☐ |
| Frontend `VITE_API_URL` points to the Railway backend URL | ☐ |
| CORS `CLIENT_URL` in backend points to Railway frontend URL | ☐ |
| `/api/health` endpoint responds with `{ status: "OK" }` | ☐ |

---

## Verify Deployment

1. Hit `https://your-backend-xxx.railway.app/api/health` — should return `{ "status": "OK" }`
2. Visit your frontend URL
3. Sign up (first user becomes admin automatically)
4. Create a project, add tasks, test role switching in the Team page

---

## Quick Deploy with Railway CLI (Optional)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## Security Reminders

- **Never** commit `.env` to Git. Verify `.gitignore` includes `backend/.env`.
- Rotate `JWT_SECRET` periodically in production.
- Use MongoDB Atlas IP Access List to restrict connections.
- Enable MongoDB Atlas built-in monitoring and alerts.
