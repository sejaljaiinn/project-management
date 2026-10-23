# CollabPM — Collaborative Project Management Platform

A full-stack MERN application for managing projects, tasks, and teams with role-based access control.

## Tech Stack
- **Frontend:** React 18, Vite, React Router v6, Axios
- **Backend:** Node.js, Express.js, MongoDB Atlas, Mongoose, JWT, bcryptjs

---

## Prerequisites
- **Node.js v18+** (LTS recommended)
- A **MongoDB Atlas** cluster (connection string ready)

---

## Project Structure

```
.
├── client/            # React frontend (Vite)
│   └── src/
│       ├── components/   Layout.jsx, TaskModal.jsx
│       ├── context/      AuthContext.jsx
│       ├── pages/        Dashboard, Login, Register, Projects,
│       │                 ProjectDetail, Tasks, Users
│       └── services/     api.js (Axios instance)
└── server/            # Express backend
    ├── config/        db.js
    ├── controllers/   auth, project, task, admin
    ├── middleware/    auth.js (JWT), errorHandler.js
    ├── models/        User, Project, Task
    ├── routes/        auth, projects, tasks, admin
    └── scripts/       seedAdmin.js
```

---

## Configuration

### 1. Backend — `server/.env`

Copy `server/.env.example` → `server/.env` and fill in your values:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/collabpm?retryWrites=true&w=majority
JWT_SECRET=pick_a_long_random_string_at_least_32_chars

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# Admin seed (used once by: node scripts/seedAdmin.js)
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123
```

> **Never commit `server/.env` to Git.** It is listed in `.gitignore`.

### 2. Frontend — `client/.env`

Copy `client/.env.example` → `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Installation

Open two terminals:

**Terminal 1 — Backend**
```bash
cd server
npm install
```

**Terminal 2 — Frontend**
```bash
cd client
npm install
```

---

## Creating the First Admin (Required)

Public registration creates only **TEAM_MEMBER** accounts. The first admin must be created via the seed script.

1. Make sure `server/.env` is configured with `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`.
2. Run from the `server/` directory:

```bash
node scripts/seedAdmin.js
```

This creates the admin account (or promotes an existing user to ADMIN).

---

## Running the Application

**Terminal 1 — Backend**
```bash
cd server
npm run dev     # Development (nodemon, auto-reload)
# or
npm start       # Production
```
Server runs on **http://localhost:5000**

**Terminal 2 — Frontend**
```bash
cd client
npm run dev     # Development (Vite HMR)
# or
npm run build   # Production build
npm run preview # Preview production build
```
Frontend runs on **http://localhost:5173**

---

## User Roles & Permissions

| Feature | ADMIN | PROJECT_MANAGER | TEAM_MEMBER |
|---------|-------|-----------------|-------------|
| View all users | ✅ | ❌ | ❌ |
| Create/delete users | ✅ | ❌ | ❌ |
| Change user roles | ✅ | ❌ | ❌ |
| View all projects | ✅ | Own only | Assigned only |
| Create projects | ✅ | ✅ | ❌ |
| Delete projects | ✅ | ❌ | ❌ |
| Assign project managers | ✅ | ❌ | ❌ |
| Add/remove team members | ✅ | Own projects | ❌ |
| Create/edit/delete tasks | ✅ | Own projects | ❌ |
| Assign tasks | ✅ | Own projects | ❌ |
| Update task status | ✅ | ✅ | Assigned only |
| Add task comments | ✅ | ✅ | ✅ |

---

## API Routes

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Protected |

### Projects
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/projects` | Protected |
| POST | `/api/projects` | Admin / PM |
| GET | `/api/projects/:id` | Members |
| PUT | `/api/projects/:id` | Admin / PM (own) |
| DELETE | `/api/projects/:id` | Admin |
| POST | `/api/projects/:id/members` | Admin / PM |
| DELETE | `/api/projects/:id/members/:userId` | Admin / PM |

### Tasks
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/tasks` | Protected |
| POST | `/api/tasks` | Admin / PM |
| GET | `/api/tasks/stats` | Protected |
| GET | `/api/tasks/:id` | Members |
| PUT | `/api/tasks/:id` | Admin / PM / Assignee (status) |
| DELETE | `/api/tasks/:id` | Admin / PM |
| POST | `/api/tasks/:id/comments` | Members |

### Admin
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/api/admin/stats` | Admin |
| GET | `/api/admin/users` | Admin |
| POST | `/api/admin/users` | Admin |
| PUT | `/api/admin/users/:id` | Admin |
| DELETE | `/api/admin/users/:id` | Admin |

---

## Creating Test Accounts

### 1. Create admin (seed script)
Add to `server/.env`:
```env
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=admin1234
ADMIN_NAME=Admin User
```
Then run: `node scripts/seedAdmin.js`

### 2. Create Project Manager & Team Member
- Login as Admin → Navigate to **Users** → **Create User**
- Create a `PROJECT_MANAGER` user (e.g. `pm@test.com`)
- Create a `TEAM_MEMBER` user (e.g. `member@test.com`)

### 3. Test Each Role

**Admin** (`admin@test.com`):
- Login → sees full Dashboard with all stats + user count
- Users page available in sidebar
- Can create/delete projects, assign managers, create users

**Project Manager** (`pm@test.com`):
- Login → sees only assigned projects
- Can create tasks, assign to team members, update status
- Sidebar has no Users link

**Team Member** (`member@test.com`):
- Login → sees only projects they belong to and tasks assigned to them
- Can update status of assigned tasks
- Can add comments to tasks
- Cannot create tasks or projects

---

## Security Notes
- Passwords are hashed with bcryptjs (10 rounds)
- JWT tokens expire in 7 days
- Role enforcement happens **on the backend** — the frontend only hides UI; the API validates independently
- Public registration is locked to `TEAM_MEMBER` role only
- Admin accounts require the seed script or another admin to create
- `.env` files are excluded from Git
