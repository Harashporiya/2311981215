# Campus Notification Platform - System Design

---

## Stage 1

### REST API Design for Campus Notification Platform

#### Core Actions Identified
The notification platform must support the following core actions:
1. Fetch all notifications for a logged-in student
2. Fetch unread notifications
3. Mark a notification as read
4. Mark all notifications as read
5. Fetch notifications by type (Placement / Event / Result)
6. Get top-N priority notifications (Priority Inbox)
7. Send a notification to a student (admin/HR action)
8. Send notification to all students (broadcast)

---

### REST API Endpoints

#### 1. Get All Notifications for a Student
```
GET /api/v1/notifications
```
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```
**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | integer | Page number (default: 1) |
| limit | integer | Results per page (default: 20) |
| type | string | Filter by type: Placement / Event / Result |
| isRead | boolean | Filter read/unread |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "Placement",
        "message": "CSX Corporation hiring",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:18Z",
        "priority": 3
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

---

#### 2. Get Unread Notification Count
```
GET /api/v1/notifications/unread-count
```
**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "unreadCount": 12
  }
}
```

---

#### 3. Get Priority Inbox (Top-N notifications)
```
GET /api/v1/notifications/priority
```
**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```
**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| n | integer | Number of top notifications to return (default: 10) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "Placement",
        "message": "CSX Corporation hiring",
        "isRead": false,
        "createdAt": "2026-04-22T17:51:18Z",
        "priorityScore": 95.4
      }
    ]
  }
}
```

---

#### 4. Mark a Single Notification as Read
```
PATCH /api/v1/notifications/:id/read
```
**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isRead": true,
    "updatedAt": "2026-05-05T10:00:00Z"
  }
}
```

---

#### 5. Mark All Notifications as Read
```
PATCH /api/v1/notifications/read-all
```
**Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "updatedCount": 12
  }
}
```

---

#### 6. Send Notification to a Student (Admin)
```
POST /api/v1/notifications/send
```
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```
**Request Body:**
```json
{
  "studentId": "uuid",
  "type": "Placement",
  "message": "Google hiring - apply now",
  "channels": ["in_app", "email"]
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "status": "queued",
    "createdAt": "2026-05-05T10:00:00Z"
  }
}
```

---

#### 7. Broadcast Notification to All Students (Admin - Notify All)
```
POST /api/v1/notifications/broadcast
```
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```
**Request Body:**
```json
{
  "type": "Placement",
  "message": "Campus placement drive begins tomorrow",
  "channels": ["in_app", "email"]
}
```
**Response (202 - Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "broadcast-job-uuid",
    "status": "processing",
    "totalStudents": 50000,
    "message": "Broadcast queued successfully"
  }
}
```

---

### Real-Time Notification Mechanism

For real-time delivery of notifications to students on the frontend, I propose **WebSockets with a fallback to Server-Sent Events (SSE)**.

#### Why WebSockets / SSE over Polling?
- Polling every few seconds causes unnecessary DB load (exactly the Stage 4 problem).
- WebSocket maintains a persistent connection — server pushes events instantly.
- SSE is simpler (unidirectional, HTTP-based) and ideal for notification streams.

#### Chosen Approach: **Server-Sent Events (SSE)**

SSE is preferred here because:
- Notifications are server → client only (unidirectional)
- Built on standard HTTP — no special infrastructure
- Automatically reconnects on disconnect
- Easier to scale with a message broker (Redis Pub/Sub)

#### SSE Endpoint
```
GET /api/v1/notifications/stream
```
**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Accept": "text/event-stream"
}
```
**Stream Events:**
```
event: notification
data: {"id":"uuid","type":"Placement","message":"Google hiring","isRead":false,"createdAt":"2026-05-05T10:00:00Z"}

event: ping
data: {"timestamp":"2026-05-05T10:00:30Z"}
```

#### Architecture:
```
HR/Admin → POST /broadcast → Message Queue (BullMQ/Redis) → Worker processes batch
                                                              ↓
                                                    Redis Pub/Sub channel per studentId
                                                              ↓
                                              SSE connections subscribe to their channel
                                                              ↓
                                                        Student's browser
```

---

## Stage 2

### Database Design for Notification Platform

#### Recommended Database: **PostgreSQL (Relational)**

**Reasoning:**
- Structured data with clear relationships (students, notifications, notification_reads)
- ACID compliance ensures no lost notifications during broadcast
- Rich indexing support (B-tree, partial indexes) critical for 5M+ rows
- Native support for enums (notification type)
- Excellent support for pagination with cursor-based or offset-based queries
- JSON column support if schema needs to evolve (metadata field)

---

### DB Schema (PostgreSQL / Prisma)

```sql
-- Students table
CREATE TABLE students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  roll_no     VARCHAR(50) UNIQUE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification type enum
CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

-- Notifications table (global/broadcast notifications)
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            notification_type NOT NULL,
  message         TEXT NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student-notification mapping with read status
-- This allows efficient tracking of per-student read/unread state
CREATE TABLE student_notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notification_id  UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, notification_id)
);

-- Indexes for performance
CREATE INDEX idx_student_notifications_student_id ON student_notifications(student_id);
CREATE INDEX idx_student_notifications_is_read ON student_notifications(student_id, is_read);
CREATE INDEX idx_student_notifications_created_at ON student_notifications(student_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Composite index for the most common query pattern
CREATE INDEX idx_sn_student_read_created 
  ON student_notifications(student_id, is_read, created_at DESC);
```

---

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum NotificationType {
  Placement
  Event
  Result
}

model Student {
  id                    String                @id @default(uuid())
  name                  String
  email                 String                @unique
  rollNo                String                @unique @map("roll_no")
  createdAt             DateTime              @default(now()) @map("created_at")
  updatedAt             DateTime              @updatedAt @map("updated_at")
  studentNotifications  StudentNotification[]

  @@map("students")
}

model Notification {
  id                    String                @id @default(uuid())
  type                  NotificationType
  message               String
  createdAt             DateTime              @default(now()) @map("created_at")
  updatedAt             DateTime              @updatedAt @map("updated_at")
  studentNotifications  StudentNotification[]

  @@map("notifications")
}

model StudentNotification {
  id             String       @id @default(uuid())
  studentId      String       @map("student_id")
  notificationId String       @map("notification_id")
  isRead         Boolean      @default(false) @map("is_read")
  readAt         DateTime?    @map("read_at")
  createdAt      DateTime     @default(now()) @map("created_at")
  student        Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@unique([studentId, notificationId])
  @@index([studentId])
  @@index([studentId, isRead])
  @@index([studentId, createdAt(sort: Desc)])
  @@map("student_notifications")
}
```

---

### REST API Queries (Based on Stage 1 API Design)

#### GET /api/v1/notifications (Fetch all for a student)
```sql
SELECT 
  n.id,
  n.type,
  n.message,
  sn.is_read,
  sn.read_at,
  n.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = $1
ORDER BY n.created_at DESC
LIMIT $2 OFFSET $3;
```

#### GET /api/v1/notifications/unread-count
```sql
SELECT COUNT(*) 
FROM student_notifications
WHERE student_id = $1 AND is_read = false;
```

#### PATCH /api/v1/notifications/:id/read
```sql
UPDATE student_notifications
SET is_read = true, read_at = NOW()
WHERE student_id = $1 AND notification_id = $2
RETURNING *;
```

---

### Problems as Data Volume Increases

As the dataset grows to 50,000 students × 5,000,000 notifications:

1. **Full table scans**: Without proper indexes, fetching a student's notifications requires scanning the entire `student_notifications` table.
2. **Slow ORDER BY**: Sorting 5M rows by `created_at` without an index = filesort = catastrophic performance.
3. **Broadcast insert storms**: Inserting 50,000 rows simultaneously during "Notify All" blocks the DB.
4. **Connection pool exhaustion**: 50,000 simultaneous SSE connections overwhelm PostgreSQL.
5. **Read replica lag**: Heavy write during broadcast delays read replica sync.

**Solutions:**
- Composite indexes on `(student_id, is_read, created_at DESC)`
- Cursor-based pagination instead of OFFSET for deep pages
- Message queue (BullMQ) for batch inserts during broadcast
- Read replicas for SELECT queries
- Redis cache for unread counts and top-N notifications

---

## Stage 3

### Query Analysis and Optimization

#### Original Query:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

#### Is the query accurate?

**No, there are multiple problems:**

1. **Schema mismatch**: Based on our normalized schema, `studentID` and `isRead` are in the `student_notifications` table, not in `notifications`. The query would fail or return wrong results.

2. **`SELECT *`**: Fetches all columns including potentially large fields. Wasteful - only needed columns should be selected.

3. **`ORDER BY createdAt ASC`**: For a notification inbox, descending order (newest first) is the standard UX pattern. Ascending would show oldest first.

4. **No LIMIT**: With 5M notifications, returning all unread for a student without pagination can return thousands of rows and crash the client.

#### Why is this slow?

With 50,000 students and 5,000,000 notifications:
- Without an index on `(studentID, isRead)`, PostgreSQL performs a **full sequential scan** of 5M rows.
- The `ORDER BY createdAt ASC` requires an additional **filesort** pass.
- **Estimated cost**: O(N) where N = 5,000,000 rows → very slow (seconds per query).

#### Fixed Query (for normalized schema):
```sql
SELECT 
  n.id,
  n.type,
  n.message,
  sn.is_read,
  n.created_at
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
WHERE sn.student_id = '1042' 
  AND sn.is_read = false
ORDER BY n.created_at DESC
LIMIT 20;
```

**With the composite index** `(student_id, is_read, created_at DESC)`, this becomes an **index scan** — O(log N + K) where K = results returned.

---

#### Should we add indexes on every column?

**No. This is bad advice.**

**Why indexing every column is harmful:**
- Every index has a **write cost** — INSERT/UPDATE/DELETE must update all indexes.
- During broadcast (50,000 inserts), maintaining 10 indexes per table = 10x write amplification.
- Indexes consume significant disk space.
- The query planner may pick wrong indexes, leading to worse performance.
- PostgreSQL has a limit on useful indexes per query.

**Effective indexing strategy:**
- Index columns used in WHERE clauses frequently
- Index columns used in ORDER BY
- Use **composite indexes** matching the query's filter + sort pattern
- Use **partial indexes** for sparse data (e.g., `WHERE is_read = false`)

---

#### Query: Find all students who got a Placement notification in the last 7 days

```sql
SELECT DISTINCT s.id, s.name, s.email, s.roll_no
FROM student_notifications sn
JOIN notifications n ON n.id = sn.notification_id
JOIN students s ON s.id = sn.student_id
WHERE n.type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
ORDER BY s.name ASC;
```

**Supporting index:**
```sql
CREATE INDEX idx_notifications_type_created 
  ON notifications(type, created_at DESC);
```

**Estimated computation cost:**
- With index on `(type, created_at)`: Index range scan on notifications, then hash join with student_notifications and students.
- Cost: O(log N + K) where K = Placement notifications in last 7 days.
- At 5M notifications with ~30% Placement type and 7-day window: roughly 30,000-50,000 rows scanned — fast (< 100ms with indexes).

---

## Stage 4

### Caching Strategy for Notification Performance

#### Problem
Fetching notifications on every page load causes DB overload at scale (50,000 students × multiple page loads per session).

---

### Proposed Solutions

#### Solution 1: Redis Cache (Recommended Primary Solution)

**Strategy:** Cache the notification list and unread count per student in Redis with a TTL.

```
Student requests notifications
       ↓
Check Redis cache (key: notifications:{studentId}:{page})
       ↓
Cache HIT → Return immediately (< 5ms)
Cache MISS → Query PostgreSQL → Store in Redis with TTL → Return
```

**Cache Keys:**
| Key Pattern | TTL | Data |
|-------------|-----|------|
| `notif:list:{studentId}:{page}` | 60s | Paginated notification list |
| `notif:unread:{studentId}` | 30s | Unread count |
| `notif:priority:{studentId}:{n}` | 120s | Top-N priority notifications |

**Cache Invalidation:**
- When a new notification is sent to a student → delete `notif:list:{studentId}:*` and `notif:unread:{studentId}`
- When student reads a notification → delete `notif:unread:{studentId}` and update list cache

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Sub-5ms response for cached data | Stale data risk (max TTL seconds) |
| Reduces DB load by ~80-90% | Additional infrastructure (Redis) |
| Scales horizontally | Memory cost for large user bases |
| Supports atomic operations (INCR for counts) | Cache invalidation complexity |

---

#### Solution 2: Database Read Replicas

**Strategy:** Route all SELECT (read) queries to a read replica; only writes go to primary.

```
Read (GET notifications) → Read Replica
Write (Mark read, insert) → Primary DB
```

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| No application code change | Replication lag (1-100ms) |
| Handles read-heavy workloads | More expensive (2x DB cost) |
| Linear read scaling | Doesn't help if writes are the bottleneck |

---

#### Solution 3: Cursor-Based Pagination (Mandatory regardless)

Replace OFFSET-based pagination with cursor-based to avoid slow deep-page queries:

```sql
-- Instead of: LIMIT 20 OFFSET 1000
SELECT * FROM student_notifications
WHERE student_id = $1
  AND created_at < $cursor  -- cursor = last seen createdAt
ORDER BY created_at DESC
LIMIT 20;
```

**Tradeoff:** Cannot jump to arbitrary pages, but eliminates full scans for deep pages.

---

#### Solution 4: SSE / WebSocket (Push instead of Poll)

Instead of polling on page load, use Server-Sent Events — server pushes new notifications.

**Tradeoff:** Requires persistent connection infrastructure (Redis Pub/Sub), but eliminates all polling load.

---

#### Recommended Combined Strategy:
1. **Redis** for caching lists + counts (immediate win)
2. **Cursor-based pagination** (eliminate deep scan)
3. **SSE** for real-time (eliminate polling)
4. **Read replica** as the system scales beyond 100K students

---

## Stage 5

### Reliable Notification System Redesign

#### Original Pseudocode Problems:

```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)   # DB insert
        push_to_app(student_id, message)  # real-time push
```

**Observed Shortcomings:**

1. **Sequential processing**: Iterating 50,000 students one-by-one is extremely slow. At 100ms per student (email + DB + push), this takes **5,000 seconds (~83 minutes)**.

2. **No error handling**: If `send_email` fails for student 200, the loop crashes — students 201-50,000 never get notified.

3. **Atomicity problem**: `save_to_db` and `send_email` are not atomic. A DB insert can succeed but email fail → inconsistent state.

4. **Tight coupling**: All three operations (email, DB, push) are synchronous and blocking — one slow Email API call blocks everything.

5. **No retry logic**: Failed emails are silently lost.

6. **Memory risk**: Loading all 50,000 student_ids into memory at once.

---

#### Should DB save and email happen together?

**No.** They should be decoupled. Here's why:

- Email delivery is **unreliable** (network, rate limits, provider downtime)
- DB insert is **reliable** (local, transactional)
- The notification record in DB is the **source of truth** — it should always be saved, regardless of email success
- Email is a **delivery channel** — its failure should be retried asynchronously, not block the notification from existing

---

#### Redesigned Pseudocode (Reliable + Fast):

```typescript
// Step 1: Save notification to DB immediately (synchronous, reliable)
async function notify_all(student_ids: string[], message: string, type: string):
    
    // 1. Create the notification record (single insert)
    notification = await db.notifications.create({ type, message })
    
    // 2. Batch insert student_notifications (use bulk insert, not loop)
    await db.student_notifications.createMany({
        data: student_ids.map(id => ({
            student_id: id,
            notification_id: notification.id,
            is_read: false
        })),
        skipDuplicates: true
    })
    // DB work is DONE — notification exists for all students
    
    // 3. Enqueue async jobs for email + push (fire and forget)
    for chunk of split(student_ids, chunkSize=500):
        await emailQueue.addBulk(
            chunk.map(id => ({ data: { student_id: id, notification_id: notification.id, message } }))
        )
        await pushQueue.addBulk(
            chunk.map(id => ({ data: { student_id: id, notification_id: notification.id } }))
        )
    
    return { notification_id: notification.id, status: "queued" }

// Step 4: Worker processes email queue with retry
async function emailWorker(job):
    try:
        await send_email(job.data.student_id, job.data.message)
        await Log("backend", "info", "service", 
            `Email sent successfully for student ${job.data.student_id}`)
    catch error:
        await Log("backend", "error", "service",
            `Email failed for student ${job.data.student_id}: ${error.message}`)
        throw error  // BullMQ auto-retries with exponential backoff

// Worker config: 3 retries, exponential backoff
emailQueue.process(concurrency=50, emailWorker)
pushQueue.process(concurrency=100, pushWorker)
```

**Key Improvements:**
- **DB first**: Notification saved atomically before any delivery
- **Chunked bulk inserts**: 50,000 rows in batches, not one-by-one
- **Async queues**: Email/push are non-blocking
- **Auto-retry**: BullMQ retries failed emails with exponential backoff
- **Concurrency**: 50 parallel email workers instead of serial
- **Logging**: Every success/failure logged via Logging Middleware

---

## Stage 6

### Priority Inbox Implementation

#### Approach

Priority is determined by:
1. **Type weight**: Placement (3) > Result (2) > Event (1)
2. **Recency**: More recent notifications score higher
3. **Read status**: Unread notifications are prioritized

#### Priority Score Formula:
```
score = (type_weight × 40) + (recency_score × 40) + (is_unread × 20)

where:
  recency_score = max(0, 1 - (age_in_hours / 168))  // decays over 7 days
  type_weight: Placement=3, Result=2, Event=1 → normalized to 0-1
  is_unread: 1 if unread, 0 if read
```

#### Maintaining top-N efficiently with new notifications:
- Use a **Redis Sorted Set** (ZADD) with priority score as the score
- On new notification arrival → ZADD with computed score
- On read → ZREM and re-add with updated score
- ZREVRANGE to fetch top-N in O(log N) time

See implementation in `notification_app_be/src/lib/priorityInbox.ts`
