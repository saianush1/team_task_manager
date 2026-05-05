# 🚀 Team Task Manager

A full-stack team task management system with authentication, role-based access control, and real-time project tracking.

---

## 🌐 Live Application

* **Frontend (Vercel)**: https://team-task-manager-xi-sand.vercel.app/login
* **Backend (Railway)**: https://teamtaskmanager-production-056b.up.railway.app

---

## 🧱 Tech Stack

### Frontend

* React (Vite)
* Axios / Fetch API
* Tailwind / CSS

### Backend

* Node.js
* Express.js
* PostgreSQL (pg / Prisma)

### Authentication

* JWT (JSON Web Tokens)
* bcrypt (password hashing)

### Deployment

* Frontend → Vercel
* Backend → Railway
* Database → PostgreSQL (Railway)

---

## ⚙️ Features

* 🔐 Authentication (Signup / Login)
* 👑 Role-Based Access (Admin / Member)
* 📁 Project Management
* ✅ Task Tracking (Kanban: Todo / In Progress / Done)
* 📊 Dashboard (stats, overdue alerts)
* 👥 Team Management (Admin only)

---

## 🧪 Local Development

### 1. Clone Repository

```bash
git clone https://github.com/saianush1/team-task-manager.git
cd team-task-manager
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env`:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
PORT=5000
CLIENT_URL=http://localhost:5173
```

Run:

```bash
npm run dev
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Run:

```bash
npm run dev
```

---

## 🔐 Environment Variables

### Backend (Railway)

| Variable     | Description                  |
| ------------ | ---------------------------- |
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET   | Secret key for JWT           |
| PORT         | Provided by Railway          |
| CLIENT_URL   | Vercel frontend URL          |

---

### Frontend (Vercel)

| Variable     | Description          |
| ------------ | -------------------- |
| VITE_API_URL | Backend API base URL |

Example:

```env
VITE_API_URL=https://your-backend.up.railway.app/api
```

---

## 🚀 Deployment

### Backend (Railway)

* Add PostgreSQL service
* Connect GitHub repo
* Add environment variables
* Deploy automatically
* Configure CORS for frontend

---

### Frontend (Vercel)

* Import GitHub repo
* Set root directory: `frontend`
* Add environment variable:

```env
VITE_API_URL=https://your-backend.up.railway.app/api
```

* Deploy

---

## ⚠️ Important Configuration

### CORS Fix (Backend)

```js
import cors from "cors";

app.use(cors({
  origin: "https://your-vercel-app.vercel.app",
  credentials: true
}));
```

---

### PostgreSQL Connection Example

```js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

---

### API Usage (Frontend)

```js
const BASE_URL = import.meta.env.VITE_API_URL;
```

---

## 🧪 Testing Checklist

* ✅ Frontend loads correctly
* ✅ API requests succeed (no CORS errors)
* ✅ Signup / Login works
* ✅ Data persists in PostgreSQL

---

## 📁 Project Structure

```
team-task-manager/
│
├── backend/
│   ├── src/
│   ├── routes/
│   ├── db/
│   └── index.js
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── main.jsx
│
└── README.md
```

---

## 📌 Notes

* Do NOT commit `.env` files
* Use Railway for backend & PostgreSQL
* Use Vercel for frontend
* Ensure database is properly connected via `DATABASE_URL`

---

## 🏁 Final Output

👉 Submit this URL:

```
https://team-task-manager-xi-sand.vercel.app/login
```

---

## 📧 Author

**Anush Kumar**
GitHub: https://github.com/saianush1

