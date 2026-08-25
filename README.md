# AI-Powered Project Management Platform

A centralized web application for students, startups, and small teams to manage projects efficiently.

## Tech Stack

- **Frontend:** React.js, Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JWT + bcrypt

## Project Structure

```
Beeproject/
├── frontend/          → React application
│   └── src/
│       ├── components/layout/   → Navbar, Sidebar, ProtectedLayout
│       ├── pages/               → All pages
│       ├── context/             → AuthContext
│       ├── services/            → Axios API config
│       └── routes/              → ProtectedRoute, PublicRoute
│
├── backend/           → Express API server
│   ├── config/        → Database connection
│   ├── controllers/   → Route handlers
│   ├── middleware/     → Auth middleware
│   ├── models/        → Mongoose schemas
│   └── routes/        → API routes
```

## Getting Started

### 1. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/projectmanager
JWT_SECRET=your_secret_key_here
```

Start the backend:

```bash
npm run dev
```

### 2. Setup Frontend

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

## API Endpoints

| Method | Endpoint             | Description          | Auth Required |
|--------|----------------------|----------------------|---------------|
| POST   | /api/auth/register   | Register new user    | No            |
| POST   | /api/auth/login      | Login user           | No            |
| GET    | /api/auth/profile    | Get user profile     | Yes           |

## Team Modules

- **Member 1:** Project Foundation & Authentication ✅
- **Member 2:** Project & Task Management
- **Member 3:** Dashboard & Kanban Board
- **Member 4:** AI Module & Integration
