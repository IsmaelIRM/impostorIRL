# Real-Life "Among Us" — Web App: Project Roadmap & Technical Architecture

> Digitizing the physical card game described in *"Among Us en la vida real"* (IanBief).
> Players use their phones (no screens/consoles during the real game — the phone is the "card").

---

## 1. Product Overview

A web application where a group digitizes the real-life Among Us experience:

| Real-world element | Digital equivalent |
|---|---|
| Printed mission list sheet | Editable list of M missions in the admin dashboard |
| Physical crewmate/impostor cards | Personal player screen with role + assigned missions |
| "Mark the box" on the card | Tap a task → see instructions → mark done |
| Find a body → shout "Reunión" | Press "Report body" → triggers meeting for all |
| Simultaneous finger vote | In-app vote screen, revealed together |
| Admin verifies at the end | Admin dashboard verifies task completion |

**Design principle:** Mobile-first. Players keep phones in pockets; the screen is only consulted to read missions / mark tasks / vote.

---

## 2. Recommended Technology Stack

### Frontend
- **Framework:** React 18 + **Vite** + **TypeScript** (fast, mobile-first SPA). Alternative: Next.js if SSR/SEO needed (not required here).
- **Styling:** **Tailwind CSS** for rapid, responsive mobile UI.
- **State:** **Zustand** (lightweight) or Redux Toolkit for client game state synced via sockets.
- **Realtime client:** **Socket.IO client**.
- **Routing:** **React Router** (room URL `/r/:roomCode`).
- **PWA (optional but recommended):** `@vite-pwa/plugin` so the app installs to home screen and works offline for the map image.

### Backend
- **Runtime:** **Node.js** (LTS).
- **Framework:** **Express** (simple) or **Fastify** (faster). Wrap with **Socket.IO** server. Alternative: **NestJS** for a structured, modular backend if team is large.
- **Language:** TypeScript.
- **ORM:** **Prisma** (type-safe, easy migrations).
- **Auth/sessions:** **JWT** (jsonwebtoken) for room admin token + player session token; no passwords needed (name + room code only).
- **Validation:** **Zod** (shared client/server schemas).

### Realtime Communication
- **WebSockets via Socket.IO** — chosen over raw `ws` because it provides:
  - Auto room/channel joining (`socket.join(roomId)`).
  - Reconnection with fallback (long-polling) — critical for flaky phone networks.
  - Built-in events, ack callbacks, and广播 to rooms.
- **Redis (optional, Phase 3+):** Socket.IO **Redis adapter** for horizontal scaling + Redis pub/sub for cross-instance events.

### Database
- **PostgreSQL** (primary relational store for rooms, players, missions, events).
- **Redis** (Phase 3) for ephemeral real-time state (live lobby presence, game tick timers).

### Storage / Hosting
- **Map image (PNG):** Static asset served from backend `/public/maps/`, or object storage (S3/Cloudinary) with a URL stored on the room.
- **Hosting:** Single Node server behind Nginx/PM2 (Phase 1–2); containerize with Docker for Phase 3 multi-instance + Redis adapter.
- **Domain:** Short, shareable room URLs (e.g. `amongus.app/r/7F3KQ`).

---

## 3. Database Schema (PostgreSQL + Prisma)

```prisma
model Room {
  id            String   @id @default(cuid())
  code          String   @unique            // e.g. "7F3KQ" — used in shareable URL
  adminToken    String                       // JWT secret scoped to this room's admin
  status        RoomStatus @default(LOBBY)   // LOBBY | RUNNING | MEETING | ENDED
  numImpostors  Int      @default(1)
  missionCount  Int      @default(10)        // M missions
  missionList   Json                         // [{id, name, description, zone}] chosen by admin
  mapImageUrl   String?                      // PNG placeholder path/URL
  timeLimitSec  Int?                         // optional overall timer
  winner        Team?                         // CREW | IMPOSTOR
  createdAt     DateTime @default(now())
  startedAt     DateTime?
  endedAt       DateTime?
  players       Player[]
  missions      Mission[]
  events        GameEvent[]
}

model Player {
  id          String   @id @default(cuid())
  roomId      String
  room        Room     @relation(fields: [roomId], references: [id])
  name        String
  isAdmin     Boolean  @default(false)
  sessionToken String  @unique   // JWT identifying this player's device
  socketId    String?             // current live socket (nullable on disconnect)
  role        Role?               // CREW | IMPOSTOR (assigned at game start)
  cardId      Int?                // which card layout was assigned (1..20)
  alive       Boolean  @default(true)
  connected   Boolean  @default(true)
  joinedAt    DateTime @default(now())
  missions    PlayerMission[]
  @@unique([roomId, name])        // unique name per room
}

model Mission {
  id          String   @id @default(cuid())
  roomId      String
  room        Room     @relation(fields: [roomId], references: [id])
  index       Int                       // 1..M position in the shared list
  name        String
  description String?
  zone        String?
  playerMissions PlayerMission[]
}

model PlayerMission {
  id          String   @id @default(cuid())
  playerId    String
  player      Player   @relation(fields: [playerId], references: [id])
  missionId   String
  mission     Mission  @relation(fields: [missionId], references: [id])
  status      TaskStatus @default(PENDING)  // PENDING | DONE
  verified    Boolean @default(false)       // set by admin at end-of-game verification
  completedAt DateTime?
  @@unique([playerId, missionId])
}

model GameEvent {
  id        String   @id @default(cuid())
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id])
  type      String   // KILL | MEETING | VOTE | TASK_DONE | WIN
  payload   Json
  createdAt DateTime @default(now())
}

enum RoomStatus { LOBBY RUNNING MEETING ENDED }
enum Role       { CREW IMPOSTOR }
enum Team       { CREW IMPOSTOR }
enum TaskStatus { PENDING DONE }
```

---

## 4. Core Game Logic (from the PDF)

### 4.1 Mission pool
Admin defines **M** missions (template uses M=10). Stored as `Room.missionList` / `Mission` rows.

### 4.2 Role assignment
- `numImpostors`: 1 if players ≤ 9, 2 if ≥ 10 (admin can override).
- Randomly pick `numImpostors` players to be IMPOSTOR; rest are CREW.

### 4.3 Crewmate card algorithm (deterministic, from PDF)
Each crewmate gets **5 consecutive missions** wrapping modulo M:
```
card(i) = [i, i+1, i+2, i+3, i+4]   (1-indexed, wrap: M+1 → 1)
```
Example M=10: card 1 → `1,2,3,4,5`; card 7 → `7,8,9,10,1`; card 10 → `10,1,2,3,4`.
Assigned round-robin to crewmates so **overlap is intentional** (two players share zones → tension/doubt).

### 4.4 Impostor card algorithm
Impostors receive a **scrambled subset** of mission indices (real missions give them "cover" to roam). In the PDF the impostor cards use a shuffled, non-contiguous set (e.g. `3,5,7,9,2,8,10,4,6`). Digitally: assign each impostor a randomized permutation/sample of the mission pool. They **fake** tasks (UI still lets them "mark" but it doesn't count toward crew victory).

### 4.5 Win conditions
- **Crew victory** if: all *crew* `PlayerMission.status == DONE` (every crewmate finished their list) **OR** an impostor is voted out.
- **Impostor victory** if: `#alive impostors == #alive crew` **OR** `timeLimitSec` expires.
- On crew victory, broadcast an **alarm/notification** to all screens (sound + banner).

### 4.6 Meetings (Reunión)
Triggered by "Report body" (or admin). All players get a 2-minute debate screen + simultaneous vote. Most-voted player reveals card; if innocent → becomes silent "ghost" (still completes missions, cannot speak); if impostor → crew one step closer to win.

---

## 5. Feature → Implementation Mapping

| Requirement | Implementation |
|---|---|
| **1. Auth & Lobby** | `/r/:code` URL → name entry → `POST /api/rooms/:code/join` issues `sessionToken` JWT → joins Socket.IO room. No password. |
| **2. Admin controls** | First joiner (or code holder) becomes admin; `adminToken` grants dashboard: start game, set `numImpostors`, edit missions, upload map PNG, end/verify. |
| **3. Role & mission assignment** | On "Start", server runs §4.2–4.4, emits `game:started` with each player's `role` + `PlayerMission` list (private to that socket). |
| **4. Win condition alarm** | Server watches crew task completion; when all crew done → `game:won` event → clients play alarm sound + victory banner. |
| **5. Map button** | Every player screen has "Map" → modal/route showing `Room.mapImageUrl` PNG (placeholder). |
| **6. Task system** | Player screen lists task buttons; tap → modal with standardized template (Mission name, zone, description, status toggle). Admin "Verify" view lists all `PlayerMission` with verified flag. |

### Standardized Task UI Template
```
┌─────────────────────────────┐
│ Mission 3 / 5               │
│ Name:    Encender las luces │
│ Zone:    Pasillo            │
│ Desc:    Enciende el       │
│          interruptor.       │
│ [ ✓ Mark complete ]         │
└─────────────────────────────┘
```

---

## 6. Step-by-Step Implementation Plan

### Phase 0 — Setup (Week 1)
- [ ] Initialize monorepo: `client/` (Vite+React+TS) + `server/` (Node+Express+TS).
- [ ] Prisma + PostgreSQL; define schema (§3); run migrations.
- [ ] Shared `types` package (or Zod schemas) for socket events.
- [ ] Basic CI (lint, typecheck, test).

### Phase 1 — Lobby & Auth (Week 1–2)
- [ ] Room creation: `POST /api/rooms` → returns `code` + `adminToken`.
- [ ] Join flow: name → `sessionToken`; Socket.IO `join`.
- [ ] Lobby screen: live player list (presence via socket connect/disconnect), shareable URL, "Map" hidden until start.
- [ ] Admin designation + admin-only controls gating.

### Phase 2 — Admin Dashboard & Game Start (Week 2–3)
- [ ] Mission editor: add/edit/remove M missions (name, zone, description).
- [ ] Config: `numImpostors` slider (auto 1/2 by player count, overridable).
- [ ] Map PNG upload → `mapImageUrl`.
- [ ] "Start Game" → server assigns roles (§4.2) + cards (§4.3/4.4) → emit private `game:started`.

### Phase 3 — Player Game Screen & Tasks (Week 3–4)
- [ ] Personal screen: role badge (hidden from others), task list with standardized template.
- [ ] `task:toggle` event → update `PlayerMission`, broadcast completion progress to admin.
- [ ] "Map" button → PNG modal (all players).
- [ ] Real-time progress bar (crew % complete).

### Phase 4 — Win Conditions & Alarm (Week 4–5)
- [ ] Server recomputes win state on each task toggle / vote / kill.
- [ ] Crew-all-done → `game:won` (CREW) → alarm sound + banner on all clients.
- [ ] Impostor-equality / timeout → `game:won` (IMPOSTOR).

### Phase 5 — Meetings & Voting (Week 5–6)
- [ ] "Report body" button → `meeting:start` (pause tasks, 2-min timer).
- [ ] Vote screen: select player, submit; reveal all at once.
- [ ] Resolution: ghost/elimination logic; re-evaluate win state.

### Phase 6 — Admin Verification & End Game (Week 6–7)
- [ ] End-game admin view: table of all `PlayerMission` with `verified` checkboxes.
- [ ] Final results screen (who was impostor, win reason).
- [ ] Replay / new game in same room.

### Phase 7 — Polish & Scale (Week 7–8)
- [ ] PWA install + offline map caching.
- [ ] Redis adapter for multi-instance sockets.
- [ ] Reconnection handling (restore game state on reconnect).
- [ ] Dockerize; deploy; load test with 20+ concurrent rooms.

---

## 7. Socket Event Contract (summary)

| Event | From → To | Payload |
|---|---|---|
| `lobby:join` | client → server | `{roomCode, name}` |
| `lobby:update` | server → room | `{players[]}` |
| `game:start` | admin → server | `{numImpostors, missions[], mapImageUrl}` |
| `game:started` | server → player (private) | `{role, cardId, missions[]}` |
| `task:toggle` | client → server | `{missionId}` |
| `task:updated` | server → admin | `{playerId, doneCount, total}` |
| `meeting:start` | client → server | `{reporterId}` |
| `meeting:vote` | client → server | `{targetPlayerId}` |
| `meeting:result` | server → room | `{eliminatedId, wasImpostor}` |
| `game:won` | server → room | `{team, reason}` |
| `alarm:play` | server → room | `{}` |

---

## 8. Risks & Mitigations
- **Phone disconnects mid-game** → store state in DB, restore on reconnect via `sessionToken`.
- **Cheating / screen-peeking** → role/missions sent only to the owning socket; blur screen when app backgrounded (visibility API).
- **Network lag at vote reveal** → server computes & broadcasts final result, not client-trust.
- **Map image size** → compress PNG, lazy-load in modal only.

---

## 9. MVP Scope (ship first)
Lobby + Auth + Admin mission editor + Start with role/card assignment + Task toggle + Crew-win alarm + Map button. Meetings/voting and impostor-elimination can follow as Phase 5 once the core loop is validated.
