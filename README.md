#  SmartSeason — Field Monitoring System

A full-stack web application for tracking crop progress across multiple fields during a growing season. Built with Node.js, React, and PostgreSQL.

---

## Tech Stack

| Layer     | Technology               |
|-----------|--------------------------|
| Backend   | Node.js + Express        |
| Frontend  | React 18 + Vite          |
| Database  | PostgreSQL (Neon DB)     |
| Auth      | JWT (jsonwebtoken)       |
| Passwords | bcrypt                   |
| HTTP      | Axios                    |

---

## Project Structure

```
smartseason/
├── backend/
│   ├── config/
│   │   └── db.js                  # PostgreSQL connection pool
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── field.controller.js
│   │   │   ├── update.controller.js
│   │   │   └── user.controller.js
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  # JWT verify + role guard
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── field.routes.js
│   │   │   ├── update.routes.js
│   │   │   └── user.routes.js
│   │   ├── utils/
│   │   │   └── status.js           # Field status logic
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/ui/          # Layout, Modal, FormField
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global auth state
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── FieldsPage.jsx
│   │   │   ├── FieldDetailPage.jsx
│   │   │   └── UsersPage.jsx
│   │   ├── utils/
│   │   │   └── api.js              # Axios instance + interceptors
│   │   └── App.jsx
│   ├── .env.example
│   └── package.json
└── database/
    └── schema.sql                  # Full DB schema + seed data
```

---

## Setup Instructions

### 1. Database (Neon DB)

1. Create a project at [neon.tech](https://neon.tech)
2. Open the SQL editor and paste the entire contents of `database/schema.sql`
3. Run it — this creates all tables, indexes, triggers, and seeds two demo users
4. Copy your connection string from the Neon dashboard

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your .env values (see below)
npm install
npm run dev
```

**Backend `.env` variables:**

```env
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL defaults to /api via the Vite proxy, no changes needed for local dev
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:5000`.

---

## Demo Credentials

| Role        | Email                      | Password   |
|-------------|----------------------------|------------|
| Admin       | admin@smartseason.com      | Admin@123  |
| Field Agent | agent@smartseason.com      | Agent@123  |

> Passwords are bcrypt-hashed (12 rounds) in the seed data.

---

## API Endpoints

### Auth
| Method | Endpoint           | Access  | Description          |
|--------|--------------------|---------|----------------------|
| POST   | /api/auth/register | Public  | Register a new user  |
| POST   | /api/auth/login    | Public  | Login, receive JWT   |
| GET    | /api/auth/me       | Auth    | Get current user     |

### Fields
| Method | Endpoint                      | Access  | Description              |
|--------|-------------------------------|---------|--------------------------|
| GET    | /api/fields                   | Auth    | List fields (role-scoped)|
| GET    | /api/fields/:id               | Auth    | Get single field         |
| POST   | /api/fields                   | Admin   | Create field             |
| PUT    | /api/fields/:id               | Admin   | Edit field               |
| DELETE | /api/fields/:id               | Admin   | Delete field             |
| GET    | /api/fields/dashboard/stats   | Auth    | Dashboard summary        |

### Updates
| Method | Endpoint                   | Access  | Description                  |
|--------|----------------------------|---------|------------------------------|
| POST   | /api/updates               | Auth    | Add stage update + note      |
| GET    | /api/updates/field/:id     | Auth    | Get update history for field |
| GET    | /api/updates/recent        | Admin   | Last 20 updates (all fields) |

### Users
| Method | Endpoint        | Access | Description       |
|--------|-----------------|--------|-------------------|
| GET    | /api/users      | Admin  | List all users    |
| GET    | /api/users/agents | Admin| List agents only  |
| POST   | /api/users      | Admin  | Create user       |
| DELETE | /api/users/:id  | Admin  | Delete user       |

---

## Field Status Logic

Status is **computed at query time** — not stored in the database — to always reflect the current state without requiring manual updates.

```
harvested stage            → completed
current stage overdue      → at_risk
otherwise                  → active
```

**Overdue thresholds** (from planting date, cumulative):

| Stage     | Max days from planting |
|-----------|------------------------|
| planted   | 21 days                |
| growing   | 111 days (21 + 90)     |
| ready     | 141 days (21 + 90 + 30)|

If a field has been in an early stage longer than expected, it's flagged as **At Risk** so coordinators can investigate.

---

## Design Decisions

### 1. Computed status, not stored
Field status (`active`, `at_risk`, `completed`) is derived from stage + planting date every time it is read. This avoids stale data and removes the need for cron jobs or background workers to update statuses.

### 2. Forward-only stage progression for agents
Agents can only advance a field forward through the lifecycle (`planted → growing → ready → harvested`). Admins retain the ability to set any stage via the Edit Field modal — useful for correcting mistakes.

### 3. Every stage change is logged
The `field_updates` table captures every transition with a timestamp, the agent who made it, and optional notes. This gives coordinators a full audit trail per field.

### 4. Role-scoped data access
Agents only see fields assigned to them — enforced at the query level, not just the UI. A field agent cannot access another agent's field even by guessing a UUID in the URL.

### 5. JWT stored in localStorage
Simple and sufficient for this scope. For a production system with stricter security requirements, httpOnly cookies would be preferred.

### 6. Single `pg` pool, no ORM
Raw SQL with the `pg` library keeps things transparent, avoids ORM magic, and makes queries easy to read and optimise. Parameterised queries are used throughout to prevent SQL injection.

---

## Assumptions Made

- A field can only be assigned to one agent at a time
- Admins are not assigned fields — they oversee all fields
- Planting date is the reference point for all time-based status calculations
- Stage can only move forward when updated by an agent; admins can override via edit
- No email verification is required for account creation
- Deleting a user unassigns (does not delete) their fields
