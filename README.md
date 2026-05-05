# Team Task Manager

A full-stack team task manager with role-based access control (Admin/Member).

## Stack
- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Frontend**: React + Vite
- **Auth**: JWT + bcrypt
- **Deployment**: Railway

## Local Development

### Backend
```bash
cd backend
npm install
# Add your MongoDB URI to .env
npm run dev   # runs on :5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # runs on :5173
```

## Features
- 🔐 JWT Authentication (Signup / Login)
- 👑 Role-Based Access Control (Admin / Member)
- 📁 Project Management (create, edit, delete, add members)
- ✅ Task Kanban Board (Todo / In Progress / Done)
- 📊 Dashboard with stats & overdue alerts
- 👥 Team management (Admin only)

## Environment Variables

### Backend `.env`
```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
PORT=5000
CLIENT_URL=your_frontend_url
```

### Frontend `.env`
```
VITE_API_URL=your_backend_url/api
```

## Deployment (Railway)
See `DEPLOYMENT.md` for step-by-step Railway deployment instructions.
