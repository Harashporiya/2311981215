# Campus Notification Platform

> **Affordmed Campus Hiring Evaluation - Full Stack Track**

A full-stack campus notification platform built with **Next.js**, **PostgreSQL**, **Prisma**, and a custom **Logging Middleware**.

---

## Project Structure

```
notification-platform/
├── logging_middleware/          # Reusable TypeScript logging package
│   ├── src/index.ts            # Log(stack, level, package, message)
│   └── package.json
│
├── notification_app_be/         # Next.js Backend (API Routes)
│   ├── prisma/
│   │   ├── schema.prisma       # PostgreSQL schema
│   │   └── seed.ts             # Sample data seeder
│   ├── src/
│   │   ├── lib/
│   │   │   ├── prisma.ts       # Prisma client singleton
│   │   │   ├── logger.ts       # Logger wrapper
│   │   │   ├── cache.ts        # Redis/in-memory cache
│   │   │   └── priorityInbox.ts # Stage 6: Priority scoring
│   │   └── app/api/v1/notifications/
│   │       ├── route.ts        # GET all, POST send
│   │       ├── priority/       # GET top-N priority
│   │       ├── broadcast/      # POST notify all (Stage 5)
│   │       ├── stream/         # GET SSE stream
│   │       ├── unread-count/   # GET unread count
│   │       ├── read-all/       # PATCH mark all read
│   │       └── [id]/read/      # PATCH mark one read
│   └── package.json
│
├── notification_app_fe/         # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Main notifications page
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── NotificationCard.tsx
│   │   │   └── PriorityInbox.tsx
│   │   ├── lib/
│   │   │   ├── api.ts          # API client
│   │   │   └── logger.ts       # Frontend logger
│   │   └── types/notification.ts
│   └── package.json
│
└── notification_system_design.md  # All stages (1-6) design document
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- (Optional) Redis for production caching

### Step 1: Logging Middleware
```bash
cd logging_middleware
npm install
npm run build
```

### Step 2: Backend Setup
```bash
cd notification_app_be
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and Affordmed credentials

# Setup database
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts  # Optional: seed sample data

# Start backend (port 3001)
npm run dev
```

### Step 3: Frontend Setup
```bash
cd notification_app_fe
npm install

# Configure environment
cp .env.example .env
# Set NEXT_PUBLIC_API_URL=http://localhost:3001

# Start frontend (port 3000)
npm run dev
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | All notifications (paginated, filterable) |
| GET | `/api/v1/notifications/priority?n=10` | Top-N priority inbox |
| GET | `/api/v1/notifications/unread-count` | Unread notification count |
| GET | `/api/v1/notifications/stream` | SSE real-time stream |
| POST | `/api/v1/notifications` | Send to a student |
| POST | `/api/v1/notifications/broadcast` | Broadcast to all students |
| PATCH | `/api/v1/notifications/:id/read` | Mark single as read |
| PATCH | `/api/v1/notifications/read-all` | Mark all as read |

---

## Stage Deliverables

| Stage | Description | Location |
|-------|-------------|----------|
| Stage 1 | REST API Design + Real-time mechanism | `notification_system_design.md` |
| Stage 2 | DB Schema (PostgreSQL + Prisma) | `notification_system_design.md` + `prisma/schema.prisma` |
| Stage 3 | Query analysis + index strategy | `notification_system_design.md` |
| Stage 4 | Caching strategy (Redis + SSE) | `notification_system_design.md` |
| Stage 5 | Reliable broadcast redesign | `notification_system_design.md` + `broadcast/route.ts` |
| Stage 6 | Priority Inbox (code + API) | `src/lib/priorityInbox.ts` + `priority/route.ts` |
| Stage 7 | React/Next.js Frontend | `notification_app_fe/` |

---

## Architecture Decisions

- **Next.js for both BE and FE**: Unified TypeScript codebase, API routes for backend
- **PostgreSQL**: ACID compliance, rich indexing, ideal for structured notification data
- **Prisma**: Type-safe ORM, migration support, excellent DX
- **In-memory cache**: Ships with zero dependencies; swap to `ioredis` for production
- **SSE over WebSockets**: Notifications are server→client only, SSE is simpler and HTTP-native
- **BullMQ (designed for)**: Async email/push delivery with retry — DB insert is always synchronous

---

## Priority Score Formula (Stage 6)

```
score = (type_weight/3 × 40) + (recency × 40) + (is_unread × 20)

Type weights: Placement=3, Result=2, Event=1
Recency: max(0, 1 - age_hours/168) — decays over 7 days
Unread bonus: 20 points for unread notifications
```
# 2311981215
