# AI-Powered Student Course Allocation System

A university course-allocation system that places students into courses using **merit + reservation + preference** rules, exposes a **dashboard** for analytics, and ships an **AI Assistant** that answers natural-language questions about the allocation.

Built as two cleanly separated apps:

| Layer | Folder | Stack |
| --- | --- | --- |
| **Backend** | [`backend/`](backend/) | Node.js · Express · TypeScript · Prisma · PostgreSQL · OpenAI |
| **Frontend** | [`frontend/`](frontend/) | Next.js (App Router) · TypeScript · Tailwind CSS |
| **Database** | [`docker-compose.yml`](docker-compose.yml) | PostgreSQL 16 (Docker) |

---


- The **frontend** holds no business logic — it renders data and calls the backend.
- The **backend** owns the schema, the allocation engine, analytics, and the AI assistant (OpenAI function-calling over read-only analytics tools).

---

## 1b. Backend structure (modular, production-grade)

```
src/
├── server.ts · app.ts        # bootstrap + Express app factory
├── config/env.ts             # zod-validated, typed environment (fail-fast)
├── db/prisma.ts              # Prisma client singleton
├── common/                   # constants · typed errors · utils
├── middleware/               # async-handler · error-handler · not-found · request-logger
├── routes/index.ts           # mounts every module router under /api
└── modules/<feature>/        # routes → controller → service (+ schema / engine)
    students · courses · allocations · analytics · assistant
```

Each request flows **route → controller (validate input) → service (business logic + DB)**. Controllers stay thin and simply `throw` typed errors (`BadRequestError`, `NotFoundError`, …) that the central error handler maps to HTTP responses — no `try/catch` per route.

---

## 2. Normalized database schema

See [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

| Table | Purpose |
| --- | --- |
| `Student` | id, name, marks, category, applicationDate |
| `Course` | id, name, totalSeats |
| `CourseCategoryQuota` | reserved seats **per (course, category)** — one row each (no repeating columns) |
| `StudentPreference` | one row per ranked choice `(studentId, courseId, priority)` — removes `pref1/2/3` repeating groups |
| `Allocation` | at most **one row per student** (`studentId` is unique → "one course per student" enforced by the DB) |

Category is an enum (`GENERAL/OBC/SC/ST`); `SeatType` (`OPEN/RESERVED`) records which quota each allocated seat came from.

---

## 3. Allocation algorithm

Implemented in [`backend/src/modules/allocations/allocation.engine.ts`](backend/src/modules/allocations/allocation.engine.ts) as a pure, deterministic, single pass:

1. **Rank** all students by merit: `marks DESC`, then earlier `applicationDate` first (tie-break).
2. For each course pre-compute `openSeats = totalSeats − Σ reservedSeats` and the reserved count per category.
3. Walk students in merit order. For each, try preferences in priority order (1 → 2 → 3). On the first course that has a seat for the student, allocate and stop:
   - **OPEN seat** if any remain (open/merit seats are available to *every* category, so a high-merit reserved-category student takes an open seat and leaves the reserved seat for a lower-merit same-category student — standard reservation behaviour), **else**
   - a **RESERVED seat** for the student's category if the student is reserved (not GENERAL) and one remains, **else**
   - the course is full for this student → try the next preference.
4. A student whose every preference is full stays **unallocated (rejected)**.

Re-running is safe: old allocations are cleared and recomputed inside a transaction.

**Business-rule mapping**

| Rule | Where |
| --- | --- |
| Higher marks → higher priority | merit sort |
| Reservation rules considered | open-then-reserved seat selection |
| Equal marks → earlier application date wins | merit sort tie-break |
| One course per student | `Allocation.studentId` unique + stop after first placement |
| Fall back to next preference | preference loop |

---

## 4. Prerequisites

- **Node.js 18+** (tested on 22)
- **Docker Desktop** (for PostgreSQL) — or any reachable PostgreSQL, just update `DATABASE_URL`
- *(optional)* an **OpenAI API key** for full natural-language Q&A

---

## 5. Setup & run

### Step 1 — Start PostgreSQL

From the project root (make sure **Docker Desktop is running**):

```bash
docker compose up -d
```

> The container publishes PostgreSQL on host port **5433** (not the default 5432) so it
> won't clash with any locally-installed PostgreSQL. The bundled `backend/.env` already
> points at `localhost:5433`. If port 5433 is also taken, change both the mapping in
> `docker-compose.yml` and `DATABASE_URL` in `backend/.env`.

### Step 2 — Backend (terminal 1)

```bash
cd backend
cp .env.example .env          # (already present) optionally add OPENAI_API_KEY
npm install
npm run db:push               # create tables from the Prisma schema
npm run db:seed               # load sample courses + students
npm run dev                   # API on http://localhost:4000
```

### Step 3 — Frontend (terminal 2)

```bash
cd frontend
cp .env.example .env.local    # (already present) NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # dashboard on http://localhost:3000
```

### Step 4 — Use it

1. Open **http://localhost:3000**.
2. Click **Run Allocation** on the dashboard to compute placements.
3. Explore **Students**, **Courses**, and the **AI Assistant**.

> **OpenAI key:** add `OPENAI_API_KEY` to `backend/.env` for full LLM answers. Without it, the assistant automatically falls back to a built-in analyzer that still answers the four required questions from the same live data.

---

## 6. API reference (backend, base `http://localhost:4000`)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `GET` | `/api/students` | List students (with preferences + allocation) |
| `POST` | `/api/students` | Register a student `{ name, marks, category, applicationDate?, preferences:[courseId,...] }` |
| `GET` | `/api/courses` | List courses (with quotas + counts) |
| `POST` | `/api/courses` | Create course `{ name, totalSeats, quotas:[{category,reservedSeats}] }` |
| `GET/PUT/DELETE` | `/api/courses/:id` | Read / replace / delete a course |
| `GET` | `/api/allocations` | Current allocation result |
| `POST` | `/api/allocations/run` | (Re)compute + persist the allocation |
| `GET` | `/api/stats` | Full dashboard report (overview, per-course stats, category summary, rejection rates) |
| `POST` | `/api/assistant` | Ask a question `{ question }` → `{ answer, toolsUsed, mode }` |

---

## 7. Dashboard

- **Overview** — students, courses, seats, allocated, available, first-preference count
- **Course Statistics & Seat Availability** — total/open/reserved/allocated/available + rejection rate
- **Category-wise Allocation** — GENERAL/OBC/SC/ST, open vs reserved usage
- **Rejection Rate by Course** — ranked, highest highlighted
- **Allocated Students** — who got what course, seat type, and which preference

## 8. AI Assistant — sample questions

- *How many students were allocated to each course?*
- *Which students did not receive their first preference?*
- *Which course had the highest rejection rate?*
- *Show the category-wise allocation summary.*

The assistant uses OpenAI **function-calling** over read-only analytics tools (the same functions the dashboard uses), so the numbers it quotes always match the dashboard and it never fabricates data.

---