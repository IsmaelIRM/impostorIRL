# Mission Module Developer Guide

## Overview

The mission system is modular and plugin-based. Each mission type is a separate JavaScript class that extends `MissionModule` and implements specific methods for rendering, interaction, and admin configuration.

## Directory Structure

```
public/js/missions/
├── index.js          # Mission rendering orchestration (renderMissionBoxes, etc.)
├── types.js          # Base MissionModule class with core methods
├── loader.js         # Dynamic mission loader with manifest support
├── manifest.json     # Build-time generated list of available missions
└── missions/
    ├── draw.js       # Drawing mission with canvas
    ├── brick.js      # Color pattern sequence mission
    ├── photo.js      # Camera photo mission
    ├── nfctask.js    # NFC tag reading mission
    ├── basket.js     # Simple complete button mission
    └── ...
```

## Step-by-Step: Creating a New Mission Module

### 1. Create the Mission File

Create a new file in `public/js/missions/missions/` with the naming convention `<type-lowercase>.js`:

```javascript
import { MissionModule, escapeHtml } from '../types.js';

class MyMission extends MissionModule {
  // Step 2: Define static properties
  static type = "MYMISSION";
  static metadata = {
    name: "My Mission",
    icon: "🎯",
    defaultInteractive: false
  };

  constructor(mission) {
    super(mission);
    this.myCustomField = mission.config?.myCustomField || "default";
    this.status = mission.status || "PENDING";
  }

  // Step 3-5: Implement required methods
}
export default MyMission;
```

### 2. Define Static Properties

Every mission module must define:

| Property | Type | Description |
|----------|------|-------------|
| `static type` | string | Unique uppercase identifier (e.g., "DRAW", "PHOTO") |
| `static metadata` | object | UI display info: `name`, `icon`, `defaultInteractive` |

### 3. Implement Required Methods

| Method | Purpose | Override? |
|--------|---------|-----------|
| `render(ctx)` | Small mission box preview in grid | Yes (recommended) |
| `renderPopupContent()` | Modal content shown when mission is clicked | Optional |
| `mount(ctx)` | Event listeners for interaction | Optional |
| `interactiveScreen()` | Full-screen modal HTML (for interactive missions) | Optional |

### 4. Optionally Implement Configuration Methods

Missions can expose admin-configurable settings:

| Method | Purpose | Override? |
|--------|---------|-----------|
| `renderConfigContent()` | Instance method calling static version | If config exists |
| `static getConfigFields(config)` | HTML for admin panel config form | If config exists |
| `static collectConfig(mission, row)` | Extract config values from DOM | If config exists |

## Mission Data Fields

### Required Fields (set by system)
```javascript
{
  id: "uuid-v4",           // Auto-generated in server.js
  name: "string",          // Mission title (max 60 chars)
  zone: "string",          // Zone/location (max 40 chars)
  desc: "string",          // Description (max 200 chars)
  type: "TYPE",            // Must match static type
  interactive: boolean,     // true for full-screen modals
  status: "PENDING|DONE",   // Current state
  config: { ... }          // Type-specific configuration
}
```

### Configuration Flow

1. Admin sets config in lobby panel → `static getConfigFields(config)` renders form
2. Admin saves → `static collectConfig(mission, row)` extracts values
3. Server validates and stores in `mission.config`
4. On game start, missions are instantiated with config
5. Constructor reads: `this.myField = mission.config?.myField`

## Example: Simple Mission (BASKET)

```javascript
import { MissionModule } from '../types.js';

class BasketMission extends MissionModule {
  static type = "BASKET";
  static metadata = {
    name: "Canasta",
    icon: "🧺",
    defaultInteractive: false
  };

  constructor(mission) {
    super(mission);
    this.targetObject = mission.targetObject || "Objeto";
    this.status = mission.status || "PENDING";
  }

  render(ctx) {
    const statusClass = this.status === "DONE" ? "done" : "pending";
    return `<div class="mission ${statusClass}" data-mission-id="${this.id}">
      <div class="meta">Canasta · ${this.escapeHtml(this.zone)}</div>
      <div class="title">${this.escapeHtml(this.name)}</div>
    </div>`;
  }

  renderPopupContent() {
    return `<button class="good" data-complete-popup="${this.id}">✓ Completar</button>`;
  }

  mount(ctx) {
    const completeBtn = document.querySelector(`[data-complete-popup="${this.id}"]`);
    if (completeBtn) {
      completeBtn.addEventListener("click", () => {
        ctx.socket.emit("task:toggle", {
          code: ctx.code,
          sessionToken: ctx.sessionToken,
          missionId: this.id,
        });
      });
    }
  }
}

export default BasketMission;
```

## Example: Interactive Mission with Config (DRAW)

```javascript
import { MissionModule, escapeHtml } from '../types.js';

class DrawMission extends MissionModule {
  static type = "DRAW";
  static metadata = {
    name: "Dibujo",
    icon: "🎨",
    defaultInteractive: true
  };

  constructor(mission) {
    super(mission);
    this.drawTarget = mission.config?.drawTarget || "";
    this.status = mission.status || "PENDING";
  }

  // Admin config form
  renderConfigContent() {
    return DrawMission.getConfigFields(this.config);
  }

  static getConfigFields(config = {}) {
    return `<label>Dibujar objeto</label>
      <input class="m-config-draw-target" value="${escapeHtml(config.drawTarget || "")}" />`;
  }

  static collectConfig(mission, row) {
    const input = row.querySelector(".m-config-draw-target");
    const config = {};
    if (input && input.value) config.drawTarget = input.value.trim();
    return config;
  }

  // Full-screen interactive modal
  interactiveScreen() {
    return `<div id="draw-modal" class="modal hidden">
      <div class="card">
        <h3>Dibuja: <span id="draw-target"></span></h3>
        <canvas id="draw-canvas" width="300" height="300" style="border:2px solid var(--line);background:#fff;"></canvas>
        <div class="row">
          <button class="ghost" id="draw-clear">Limpiar</button>
          <button class="good" id="draw-done">✓ Listo</button>
        </div>
      </div>
    </div>`;
  }

  render(ctx) { /* ... */ }
  renderPopupContent() {
    return `<button class="ghost" data-open-draw="${this.id}">🎨 Abrir dibujo</button>`;
  }

  mount(ctx) {
    const drawBtn = document.querySelector(`[data-open-draw="${this.id}"]`);
    if (drawBtn) {
      drawBtn.addEventListener('click', () => this.openInteractive(ctx));
    }
  }
}

export default DrawMission;
```

## Server-Side Configuration Handling

When adding new config fields, update `server.js` to validate and store them:

```javascript
// In admin:configure handler
if (m.type === "MYMISSION" && m.config.myField) {
  mission.config.myField = String(m.config.myField).slice(0, 40);
}
```

Also update `src/rooms.js` `playerView()` to include config in mission objects.

## Manifest Registration

After creating a mission, add it to `manifest.json`:

```json
{ "id": "MYMISSION", "path": "./missions/mymission.js" }
```

The manifest is auto-generated by `scripts/generate-manifest.js` during Docker builds.

## Context Object (`ctx`)

The `mount(ctx)` method receives:

```javascript
{
  socket: Socket,      // Socket.IO client instance
  code: string,        // Room code
  sessionToken: string,
  playerId: string,
  isAdmin: boolean,
  missionIndex: number,
  missionsLength: number
}
```

## CSS Classes

Mission boxes use `.mission`, `.mission.done`, `.mission.pending`, `.card`, `.modal.hidden`. See `public/css/styles.css`.

## Testing

1. Add to manifest.json
2. Run `npm start` or `node server.js`
3. Create room, add mission in admin panel
4. Verify config form shows, saves, and loads correctly
5. Start game, verify mission renders in player view