# Real-Life Among Us - Technical Implementation Guide

> Version: 1.0  
> Last Updated: 2026-07-10  
> Maintainer: [Current Maintainer]

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Installation Guide](#installation-guide)
4. [Configuration Settings](#configuration-settings)
5. [Usage Instructions](#usage-usage-instructions)
6. [API Reference](#api-reference)
7. [Architecture Overview](#architecture-overview)
8. [Development Workflows](#development-workflows)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance Log](#maintenance-log)

---

## Project Overview

### Description

Real-Life Among Us is a web-based implementation of the physical card game variant of Among Us. Players use their mobile devices as digital "cards" to receive missions, report bodies, and vote during gameplay.

### Core Features

| Feature | Status | Module |
|---------|--------|--------|
| Lobby Management | ✅ Complete | `src/rooms.js` |
| Mission System | ✅ Base | `public/js/screens/player.js` |
| Kill/Cooldown | ✅ Complete | `server.js` |
| Meetings/Voting | ✅ Complete | `meeting.js` |
| Admin Controls | ✅ Complete | `lobby.js` |
| **NFC Integration** | 🚧 In Progress | `public/js/nfc/` |
| **Sabotage System** | 🚧 In Progress | `public/js/sabotages/` |

### Technology Stack

- **Frontend**: Vanilla JS ES Modules, Socket.IO client
- **Backend**: Node.js, Express, Socket.IO
- **Storage**: In-memory Map storage (rooms, players)
- **NFC**: Web NFC API (NDEFReader) with fallback simulation

---

## Quick Start

```bash
# Clone repository
git clone <repo-url>
cd impostorIRL

# Install dependencies
npm install

# Run development server
npm start

# Access at http://localhost:3000
```

---

## Installation Guide

### Prerequisites

- Node.js v16+ 
- npm 8+
- Modern browser with WebRTC support (Chrome/Edge for NFC)

### Local Setup

```bash
npm install
# No database required - uses in-memory storage
```

### Production Deployment

1. Set environment variables:
   ```bash
   PUBLIC_BASE_URL=https://your-domain.com
   ```

2. Start server:
   ```bash
   node server.js
   ```

---

## Configuration Settings

### Room Configuration (Admin)

| Setting | Type | Default | Range | Description |
|---------|------|---------|-------|-------------|
| `numImpostors` | number | 1 | 1-2 | Number of impostors |
| `meetingSec` | number | 120 | 10-600 | Meeting duration |
| `killCooldownSec` | number | 30 | 0-600 | Kill cooldown timer |
| `timeLimitSec` | number | 0 | 0-7200 | Game time limit (0 = none) |
| `missions` | array | 10 default | 1-20 | Mission definitions |

### Mission Schema

```json
{
  "id": "uuid",
  "name": "Mission Name",
  "zone": "Location",
  "desc": "Description",
  "interactive": false,
  "type": "GENERIC",
  "requiresNFC": false
}
```

### Sabotage Schema

```json
{
  "type": "NFC",
  "zones": ["Pasillo", "Cocina"],
  "durationSec": 240,
  "cooldownSec": 240
}
```

### NFC Tags Configuration

File: `public/data/nfc-tags.json`

```json
{
  "zones": {
    "Pasillo": ["nfc-pasillo-01", "nfc-pasillo-02"],
    "Cocina": ["nfc-cocina-01"]
  },
  "sabotages": {
    "NFC_REPAIR": {
      "tags": ["nfc-sabotage-a", "nfc-sabotage-b"]
    }
  }
}
```

---

## Usage Instructions

### For Players

1. **Join a room**: Enter room code at landing page
2. **View role**: Tap "Ver mi rol" during game
3. **Complete missions**: Tap mission button, use NFC if required
4. **Report bodies**: Tap "Reportar cuerpo" button
5. **Vote**: Select player during meeting

### For Admin

1. **Create room**: First player automatically becomes admin
2. **Configure**: Set impostors, time limits, missions
3. **Start game**: Click "Comenzar partida"
4. **Monitor**: View progress in lobby during game
5. **Manage**: Reset/kick players as needed

### NFC Scanning Workflow

1. Tap mission requiring NFC
2. Hold device near NFC tag
3. System validates zone/mission match
4. Mission auto-completes on valid scan

---

## API Reference

### Socket Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `room:create` | `{hostName}` | Create new room |
| `room:join` | `{code, name, sessionToken?}` | Join existing room |
| `task:toggle` | `{code, sessionToken, missionId}` | Complete/undo mission |
| `impostor:kill` | `{code, sessionToken, targetPlayerId}` | Kill player |
| `meeting:report` | `{code, sessionToken}` | Report body |
| `meeting:vote` | `{code, sessionToken, targetPlayerId}` | Cast vote |
| `admin:start` | `{code, adminToken}` | Start game |
| `admin:reset` | `{code, adminToken}` | Reset room |
| `nfc:scan` | `{code, sessionToken, tagData, context}` | NFC scan event |

### Socket Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `lobby:update` | room state | Update lobby view |
| `room:state` | player state | Private state update |
| `game:started` | player assignment | Game start notification |
| `meeting:start` | `{alivePlayers, phase, endsAt}` | Meeting started |
| `meeting:resolve` | result | Voting concluded |
| `game:won` | `{team, reason}` | Game ended |
| `sabotage:started` | sabotage state | Sabotage activated |
| `sabotage:resolved` | result | Sabotage complete/failed |

---

## Architecture Overview

### File Structure

```
impostorIRL/
├── public/
│   ├── js/
│   │   ├── app.js              # Main application
│   │   ├── sabotages/          # Sabotage modules
│   │   │   ├── index.js        # Registry
│   │   │   ├── global.js       # Global sabotage base
│   │   │   ├── single.js       # Single-target base
│   │   │   └── nfc.js          # NFC sabotage
│   │   ├── nfc/                # NFC service
│   │   │   └── core.js
│   │   ├── missions/           # Mission modules
│   │   │   ├── index.js
│   │   │   └── nfc-utils.js
│   │   └── screens/            # UI screens
│   └── css/
│       └── styles.css          # Styling
├── src/
│   ├── rooms.js                # Room management
│   ├── cards.js                # Mission assignment
│   └── win.js                  # Win conditions
├── server.js                   # Socket server
└── documentacion/
    └── IMPLEMENTATION_GUIDE.md
```

### Data Flow

```
Player Action → Socket Event → Server Handler → State Update → Broadcast → UI Re-render
```

---

## Development Workflows

### Adding New Mission Types

1. Create handler in `public/js/missions/`
2. Add type to registry in `missions/index.js`
3. Update admin dropdown in `lobby.js`
4. Test mission rendering and completion

### Adding New Sabotage Types

1. Extend `SabotageModule` in `public/js/sabotages/`
2. Register in `sabotages/index.js`
3. Add server handler in `server.js`
4. Add admin configuration in `lobby.js`

### Testing NFC

Use Chrome DevTools > Sensors > NFC to simulate tags, or physical NFC tags encoded with zone IDs.

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| NFC not working | Check Chrome permissions, use HTTPS |
| Can't join room | Verify room code, check server status |
| Missions not saving | Check admin token validity |
| Audio alarm not playing | First tap anywhere to unlock audio context |

---

## Maintenance Log

| Date | Author | Change | Notes |
|------|--------|--------|-------|
| 2026-07-10 | System | Initial docs | Base documentation structure |
| | | | |

---

## Appendix

### Mission Types Reference

| Type | Interactive | NFC Required | Description |
|------|-------------|--------------|-------------|
| DRAW | Yes | No | Unique drawing per player |
| BRICK | Yes | No | Color pattern sequence |
| BASKET | No | No | Place object in basket |
| NERF | No | No | Shoot targets (zone TBD) |
| PHOTO | Yes | Yes | Photo with NFC object |
| CLEAN | No | No | Pool cleaning task |
| NFC_SCAN | Yes | Yes | NFC tag required |

### Sabotage Types Reference

| Type | Category | Resolution | Cooldown |
|------|----------|------------|----------|
| NFC_REPAIR | Global | 2 players scan zones in 10s | 4 min |
| LIGHTS | Global | Single scan | Configurable |
| REACTOR | Single | Zone repair | Per impostor |