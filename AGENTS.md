# AGENTS.md - Among Us Real Life Project

## Recent Changes

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

### Modular Mission System Refactored

**public/js/missions/index.js** - Mission rendering functions (renderMissionBoxes, renderMissionModals, getInteractiveScreens). Mission modal close button is a red circular ✕ in top-right corner.

**public/js/missions/types.js** - Base `MissionModule` class with `renderPopupContent()` for mission modal content, `interactiveScreen()` for full-screen modals (DRAW, PHOTO). Includes close button in popup content.

**public/js/missions/loader.js** - Dynamic mission loader with manifest validation

**public/js/missions/missions/*.js** - Each mission type renders modal content with type-specific completion triggers, using `.card` for modal content styling

**public/js/screens/game.js** - In-game screen with uniform mission grid, mission modals, sabotage popup modal, role display, sabotage activation

**public/js/screens/player.js** - Re-exports from game.js for backward compatibility

**scripts/generate-manifest.js** - Generates manifest.json for Docker build

### Sabotage System Refactored (Array-Based)

**src/rooms.js**: Changed `room.sabotage` → `room.sabotages[]` array, `player.sabotages` → `player.playerSabotages[]`, added `timeLimitEndsAt` and `timeLimitSec` to playerView

**sabotages/types.js**: Base `SabotageModule` class holds `durationSec` and `cooldownSec` per instance

**sabotages/types/nfc.js**: NFC sabotage with `static durationSec = 240`, `static cooldownSec = 240`, `activate()` sets `cooldownUntil`

**sabotages/loader.js**: `sabotageLoader` class with `loadAllSabotages()`, `createSabotage()`, `getAvailableTypes()`, `registerSabotage()`, `sabotageMetadata` for display

**sabotages/index.js**: `renderSabotageCards()` renders "Sabotajes activos" summary card with all active sabotages, countdown timers

**server.js**: Updated sabotage activation to use array structure, set cooldown based on sabotage type duration + cooldown, added game time limit check that ends game with IMPOSTOR win

**public/js/screens/game.js**: Added `renderGameTimer()` for time limit progress bar, added sabotage options panel in role modal for impostors, countdown timer updates

**public/css/styles.css**: Added `.game-timer`, `.timer-bar`, `.timer-fill`, `.timer-text`, `.sabotage-summary` styles

### NFC Reader Module

**public/js/nfc-reader.js** - Standalone NFC reading module:
- `startNFCRead()` - Shows modal, returns Promise with `{serialNumber, content}` or rejects on cancel/fail
- `readNFCContent()` - Alternative alias for startNFCRead
- `isNFCSupported()` - Checks if Web NFC API is available
- Modal has red circular ✕ close button in top-right corner
- Uses Web NFC API (Chrome for Android, requires HTTPS/user gesture)

### NFC Task Mission

**public/js/missions/missions/nfctask.js** - NFC mission type for testing:
- Shows "Leer etiqueta NFC" button in mission modal
- "Simular (desarrollo)" button for testing without NFC hardware