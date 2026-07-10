# AGENTS.md - Among Us Real Life Project

## HowToConnect

Open `http://localhost:5173` in your browser after running `npm run dev`.

## Recent Changes

### Phase 0-5: React + NestJS Migration (2026-07-10)

- Initialized pnpm monorepo with workspaces (`apps/server`, `apps/web`)
- Added `@Mission()` decorator with metadata support (scope, weight, isInteractive)
- Created `MissionLoader` service with fast-glob scanning
- Implemented GraphQL schema with Mission, Room, Player, Template types
- Added WebSocket gateway (`GameGateway`) for real-time updates
- Added Timer service for time limit checks
- Created AdminPanel with tabs (Templates, Missions, Sabotages, Timers)
- Added SchemaForm component for JSON schema auto-generation
- Implemented mission modules: draw, brick, basket, nerf, photo, pool, sabotage-nfc, sabotage-core
- **Note**: Original `server.js` remains operational; `apps/server/src/` is the new architecture (under development)

### QR Link Button & Alarm on Meeting Request

#### Files Modified:
- `public/index.html` - Added QRCode.js library script
- `public/js/qrcode.min.js` - Downloaded QRCode.js library
- `public/js/screens/lobby.js` - Added QR button/modal, alarm on meeting:start (gather phase)
- `public/css/styles.css` - Added `#qr-svg` styles, updated `#qr-modal .map-wrap` background

#### Changes Summary:

**1. QR Code Generation (lobby.js lines 117-127)**
- Added "📱 QR para compartir" button in lobby screen
- Modal contains `#qr-svg` div with white background and 12px padding
- Uses `window.QRCode` library to generate scannable QR code
- Responsive width: `min(274px, 90vw)` for mobile

**2. Alarm on Meeting Request (app.js line 209)**
- `playAlarm()` triggers when `meeting:start` received with `phase: "gather"`
- Alerts all players before admin starts voting

**3. Styling (styles.css lines 313-322, 354-364)**
- `#qr-modal .map-wrap`: dark card background (`var(--card)`)
- `#qr-svg`: white background, 12px padding, 8px border-radius, responsive width
- Modal clicking closes QR popup

## Known Issues
- Audio alarm requires user interaction first on mobile (browser autoplay policy)

### Admin Kick Player Feature

#### Files Modified:
- `public/js/screens/lobby.js` - Added kick button for each player in lobby, handler in mount()
- `server.js` - Added `admin:kick` socket handler, `player:kicked` event
- `public/js/app.js` - Added `player:kicked` event handler
- `public/css/styles.css` - Added `.kick-btn` styling

#### Changes Summary:

**lobby.js lines 19-22**: Added kick button (`✕`) for each non-admin player when status is `LOBBY`, only visible to admin.

**lobby.js lines 151-160**: Kick button click handler confirms and emits `admin:kick`.

**server.js lines 472-482**: New handler that removes player from room and notifies kicked player.

**app.js lines 219-227**: Handles `player:kicked` event to reset session for kicked player.

### Admin Game Panel

**player.js lines 36-40**: Added admin panel during RUNNING status with "Reiniciar partida" button.

**player.js lines 120-126**: Added reset button handler that emits `admin:reset`.

**styles.css line 458-460**: Added `.admin-game-panel` styling (dashed impostor border).