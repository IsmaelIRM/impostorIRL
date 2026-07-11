const path = require("path");
const http = require("http");
const express = require("express");
const multer = require("multer");
const { Server } = require("socket.io");
const { v4: uuid } = require("uuid");

const {
  createRoom,
  getRoom,
  addPlayer,
  assignCards,
  joinUrl,
  adminUrl,
  lobbyView,
  playerView,
  rooms,
} = require("./src/rooms");
const { defaultMissions } = require("./src/cards");
const win = require("./src/win");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Ensure uploads dir exists and serve it.
const uploadsDir = path.join(__dirname, "public", "uploads");
require("fs").mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype === "image/png"),
});

// ---- HTTP routes ----

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/r/:code", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// Map upload (admin). Validates code + adminToken, returns the public URL.
app.post("/api/upload", upload.single("map"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No PNG enviado." });
  const room = getRoom(req.query.code);
  if (!room || room.adminToken !== req.query.adminToken) {
    return res.status(403).json({ error: "No autorizado." });
  }
  const ext = ".png";
  const finalName = req.file.filename + ext;
  require("fs").renameSync(req.file.path, path.join(uploadsDir, finalName));
  const url = `/uploads/${finalName}`;
  room.mapImageUrl = url;
  res.json({ mapImageUrl: url });
});

// ---- Helpers ----

function emitLobby(room) {
  io.to(room.code).emit("lobby:update", lobbyView(room));
}

function emitRoomState(room) {
  for (const p of room.players.values()) {
    if (p.socketId) {
      io.to(p.socketId).emit("room:state", playerView(room, p));
    }
  }
  emitLobby(room);
}

function endGame(room, result) {
  room.status = "ENDED";
  room.winner = result.team;
  room.winnerReason = result.reason;
  room.endedAt = Date.now();
  room.meeting = null;
  room.sabotages = [];
  io.to(room.code).emit("game:won", { team: result.team, reason: result.reason });
  if (result.team === "CREW") io.to(room.code).emit("game:alarm", {});
  emitLobby(room);
}

function recomputeWin(room) {
  const result = win.checkWin(room);
  if (result) {
    if (room.status !== "ENDED") endGame(room, result);
    return true;
  }
  return false;
}

function startMeetingTimer(room) {
  if (room._meetingTimer) clearTimeout(room._meetingTimer);
  room._meetingTimer = setTimeout(() => {
    if (room.status === "MEETING") resolveMeeting(room);
  }, room.meetingSec * 1000);
}

function resolveMeeting(room) {
  if (room.status !== "MEETING" || !room.meeting) return;
  const aliveCount = Array.from(room.players.values()).filter((p) => p.alive).length;
  const votes = room.meeting.votes; // Map<sessionToken, targetId|null>
  const counts = {};
  let skipped = 0;
  for (const targetId of votes.values()) {
    if (targetId == null) skipped++;
    else counts[targetId] = (counts[targetId] || 0) + 1;
  }
  // Highest vote count; ties => nobody eliminated.
  let topId = null;
  let topCount = 0;
  let tie = false;
  for (const [id, c] of Object.entries(counts)) {
    if (c > topCount) {
      topCount = c;
      topId = id;
      tie = false;
    } else if (c === topCount) {
      tie = true;
    }
  }
  // Elimination requires a strict majority of >40% of alive players.
  const threshold = aliveCount * 0.4;
  const eliminated = topId && !tie && topCount > threshold ? room.players.get(topId) : null;
  const wasImpostor = eliminated ? eliminated.role === "IMPOSTOR" : false;

  if (eliminated) {
    eliminated.alive = false; // fully out (if impostor) or ghost (if crew)
  }

  room.meeting = null;
  room.status = "RUNNING";
  if (room._meetingTimer) clearTimeout(room._meetingTimer);

  io.to(room.code).emit("meeting:resolve", {
    eliminatedId: eliminated ? eliminated.id : null,
    eliminatedName: eliminated ? eliminated.name : null,
    wasImpostor,
    counts,
    skipped,
    tie: !eliminated,
  });

  if (!recomputeWin(room)) emitRoomState(room);
}

// ---- Socket handlers ----

io.on("connection", (socket) => {
  socket.on("room:create", (payload, ack) => {
    const room = createRoom();
    const host = addPlayer(room, payload && payload.hostName, true);
    host.socketId = socket.id;
    host.connected = true;
    socket.join(room.code);
    const jUrl = joinUrl(room, socket.request);
    const aUrl = adminUrl(room, socket.request);
    ack &&
      ack({
        code: room.code,
        adminToken: room.adminToken,
        joinUrl: jUrl,
        adminUrl: aUrl,
        sessionToken: host.sessionToken,
        isAdmin: true,
        playerId: host.id,
      });
    emitLobby(room);
    emitRoomState(room); // so the host renders the lobby, not the player screen
  });

  socket.on("room:join", (payload, ack) => {
    const room = getRoom(payload && payload.code);
    if (!room) return ack && ack({ error: "Sala no encontrada." });

    let player = null;
    if (payload.sessionToken) {
      player = Array.from(room.players.values()).find(
        (p) => p.sessionToken === payload.sessionToken
      );
    }
    if (!player) {
      if (room.status !== "LOBBY") {
        return ack && ack({ error: "La partida ya empezó. No se admiten nuevos jugadores." });
      }
      player = addPlayer(room, payload.name, false);
    }
    player.socketId = socket.id;
    player.connected = true;
    const code = room.code;
    socket.join(code);

    ack &&
      ack({
        code: room.code,
        sessionToken: player.sessionToken,
        playerId: player.id,
        joinUrl: joinUrl(room, socket.request),
        adminUrl: adminUrl(room, socket.request),
        isAdmin: player.isAdmin,
        adminToken: player.isAdmin ? room.adminToken : undefined,
      });
    emitLobby(room);
    emitRoomState(room);
  });

  socket.on("admin:configure", (payload, ack) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.adminToken !== payload.adminToken)
      return ack && ack({ error: "No autorizado." });
    if (room.status !== "LOBBY") return ack && ack({ error: "La partida ya empezó." });

    if (Array.isArray(payload.missions)) {
      const missions = payload.missions
        .map((m) => {
          const mission = {
            id: m.id && /^[0-9a-f-]{36}$/i.test(m.id) ? m.id : uuid(),
            name: String(m.name || "").slice(0, 60),
            zone: String(m.zone || "").slice(0, 40),
            desc: String(m.desc || "").slice(0, 200),
            type: String(m.type || "GENERIC").slice(0, 20),
            interactive: m.interactive === true,
            config: {}
          };
          
// Extract type-specific config
           if (m.config) {
             if (m.type === "DRAW" && m.config.drawTarget) {
               mission.config.drawTarget = String(m.config.drawTarget).slice(0, 40);
             }
             if (m.type === "BRICK") {
               if (m.config.availableColors) {
                 mission.config.availableColors = Array.isArray(m.config.availableColors)
                   ? m.config.availableColors.map(c => String(c).trim().toUpperCase()).slice(0, 10)
                   : String(m.config.availableColors).split(",").map(c => c.trim().toUpperCase()).slice(0, 10);
               }
               if (m.config.blocksLength) {
                 mission.config.blocksLength = Math.max(1, Math.min(10, Number(m.config.blocksLength)));
               }
             }
             if (m.type === "PHOTO" && m.config.photoObjects) {
               mission.config.photoObjects = Array.isArray(m.config.photoObjects)
                 ? m.config.photoObjects.map(o => String(o).slice(0, 30)).slice(0, 10)
                 : String(m.config.photoObjects).split(",").map(o => o.trim()).slice(0, 10);
             }
             if (m.type === "NFC_TASK" && m.config.nfcId) {
               mission.config.nfcId = String(m.config.nfcId).slice(0, 40);
             }
           }
          
          return mission;
        })
        .filter((m) => m.name.trim())
        .slice(0, 20);
      if (missions.length >= 1) room.missions = missions;
    }
    if (typeof payload.numImpostors === "number") {
      const max = Math.min(2, Math.max(1, room.players.size - 1));
      room.numImpostors = Math.max(1, Math.min(payload.numImpostors, max));
    }
    if (typeof payload.meetingSec === "number") {
      room.meetingSec = Math.max(10, Math.min(600, payload.meetingSec));
    }
    if (typeof payload.killCooldownSec === "number") {
      room.killCooldownSec = Math.max(0, Math.min(600, payload.killCooldownSec));
    }
    if (payload.timeLimitSec != null) {
      room.timeLimitSec =
        payload.timeLimitSec === 0 || payload.timeLimitSec === ""
          ? null
          : Math.max(60, Math.min(7200, Number(payload.timeLimitSec)));
    }
    if (payload.mapImageUrl) room.mapImageUrl = payload.mapImageUrl;
    if (payload.sabotageConfig) {
      room.sabotageConfig = {
        NFC: { enabled: payload.sabotageConfig.NFC?.enabled !== false },
        LIGHTS: { enabled: payload.sabotageConfig.LIGHTS?.enabled !== false },
        REACTOR: { enabled: payload.sabotageConfig.REACTOR?.enabled !== false }
      };
    }

    ack && ack({ ok: true });
    emitLobby(room);
  });

  socket.on("admin:start", (payload, ack) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.adminToken !== payload.adminToken)
      return ack && ack({ error: "No autorizado." });
    if (room.status !== "LOBBY") return ack && ack({ error: "Ya empezada." });
    // Allow single player for testing if admin presses start twice quickly (within 5 seconds)
    const isSinglePlayerTest = room.players.size === 1 && room._testStartAllowed;
    if (room.players.size < 3 && !isSinglePlayerTest)
      return ack && ack({ error: "Se necesitan al menos 3 jugadores." });
    
    // Clear test flag
    delete room._testStartAllowed;

    assignCards(room);
    room.status = "RUNNING";
    room.startedAt = Date.now();
    if (room.timeLimitSec) room.timeLimitEndsAt = Date.now() + room.timeLimitSec * 1000;

    // Private game:started to each socket.
    for (const p of room.players.values()) {
      if (p.socketId) io.to(p.socketId).emit("game:started", playerView(room, p));
    }
    emitLobby(room);
    ack && ack({ ok: true });
  });

  // Enable single-player test mode (second click on start button)
  socket.on("admin:test-start", (payload, ack) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.adminToken !== payload.adminToken)
      return;
    if (room.players.size === 1) {
      room._testStartAllowed = true;
      ack && ack({ ok: true });
    }
  });

  socket.on("task:toggle", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.status !== "RUNNING") return;
    const player = Array.from(room.players.values()).find(
      (p) => p.sessionToken === payload.sessionToken
    );
    if (!player) return;
    // Ghosts (dead crew) can still mark tasks; only fully-out players (dead
    // impostors) are blocked. Alive players are always allowed.
    if (!player.alive && player.role !== "CREW") return;
    const m = player.missions.find((x) => x.missionId === payload.missionId);
    if (!m) return;
    m.status = m.status === "DONE" ? "PENDING" : "DONE";
    if (player.socketId) io.to(player.socketId).emit("room:state", playerView(room, player));
    // progress to admin
    io.to(room.code).emit("task:progress", {
      playerId: player.id,
      name: player.name,
      done: player.missions.filter((x) => x.status === "DONE").length,
      total: player.missions.length,
    });
    recomputeWin(room);
  });

  socket.on("impostor:kill", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.status !== "RUNNING") return;
    const killer = Array.from(room.players.values()).find(
      (p) => p.sessionToken === payload.sessionToken
    );
    if (!killer || killer.role !== "IMPOSTOR" || !killer.alive) return;
    const victim = room.players.get(payload.targetPlayerId);
    if (!victim || !victim.alive || victim.role === "IMPOSTOR") return;
    const now = Date.now();
    if (now < killer.killCooldownUntil) return; // cooldown active

    victim.alive = false; // ghost
    killer.killCooldownUntil = now + room.killCooldownSec * 1000;

    // notify victim they are a ghost
    if (victim.socketId)
      io.to(victim.socketId).emit("room:state", playerView(room, victim));
    if (killer.socketId)
      io.to(killer.socketId).emit("room:state", playerView(room, killer));
    emitLobby(room);
    io.to(room.code).emit("player:killed", { victimId: victim.id, victimName: victim.name });

    recomputeWin(room);
  });

  // A player reports a body -> the meeting starts right away (everyone goes
  // to the meeting). The admin then starts the timed vote from inside it.
  socket.on("meeting:report", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.status !== "RUNNING") return;
    if (room.status === "MEETING") return;
    const reporter = Array.from(room.players.values()).find(
      (p) => p.sessionToken === payload.sessionToken
    );
    if (!reporter || !reporter.alive) return;
    room.status = "MEETING";
    // Gather phase: meeting is open but the countdown hasn't started yet.
    // The admin starts the timed vote when everyone is gathered.
    room.meeting = {
      reporterId: reporter.id,
      votes: new Map(),
      endsAt: null,
      phase: "gather",
    };
    const alive = Array.from(room.players.values())
      .filter((p) => p.alive)
      .map((p) => ({ id: p.id, name: p.name }));
    io.to(room.code).emit("meeting:start", { alivePlayers: alive, phase: "gather", endsAt: null });
    emitRoomState(room);
  });

  // Admin starts the actual timed vote once everyone is gathered.
  socket.on("admin:startVoting", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.adminToken !== payload.adminToken) return;
    if (room.status !== "MEETING" || !room.meeting || room.meeting.phase !== "gather") return;
    room.meeting.phase = "voting";
    room.meeting.endsAt = Date.now() + room.meetingSec * 1000;
    const alive = Array.from(room.players.values())
      .filter((p) => p.alive)
      .map((p) => ({ id: p.id, name: p.name }));
    io.to(room.code).emit("meeting:start", {
      alivePlayers: alive,
      phase: "voting",
      endsAt: room.meeting.endsAt,
    });
    emitRoomState(room);
    startMeetingTimer(room);
  });

  socket.on("admin:cancelMeeting", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.adminToken !== payload.adminToken) return;
    if (!room.pendingMeeting) return;
    room.pendingMeeting = null;
    io.to(room.code).emit("meeting:canceled", {});
  });

  socket.on("meeting:vote", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.status !== "MEETING" || !room.meeting) return;
    if (room.meeting.phase !== "voting") return; // only during the timed vote
    const voter = Array.from(room.players.values()).find(
      (p) => p.sessionToken === payload.sessionToken
    );
    if (!voter || !voter.alive) return;
    const target = payload.targetPlayerId || null;
    if (target && !room.players.get(target)) return;
    room.meeting.votes.set(voter.sessionToken, target);
    if (voter.socketId) io.to(voter.socketId).emit("room:state", playerView(room, voter));
    // End early once every alive player has voted.
    const aliveCount = Array.from(room.players.values()).filter((p) => p.alive).length;
    if (room.meeting.votes.size >= aliveCount) resolveMeeting(room);
  });

  socket.on("admin:newgame", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.adminToken !== payload.adminToken) return;
    for (const p of room.players.values()) {
      p.role = null;
      p.cardId = null;
      p.alive = true;
      p.killCooldownUntil = 0;
      p.missions = [];
      p.playerSabotages = [];
    }
    room.status = "LOBBY";
    room.winner = null;
    room.winnerReason = null;
    room.meeting = null;
    room.timeLimitEndsAt = null;
    room.sabotages = [];
    if (room._meetingTimer) clearTimeout(room._meetingTimer);
    emitRoomState(room);
  });

  // Full reset: wipe all players and missions, keep the lobby code + admin token.
  // The admin who triggered it is re-added as the host so they stay in control.
  socket.on("admin:reset", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.adminToken !== payload.adminToken) return;
    const adminPlayer = Array.from(room.players.values()).find((p) => p.isAdmin) || null;
    room.players = new Map();
    room.missions = defaultMissions();
    room.status = "LOBBY";
    room.winner = null;
    room.winnerReason = null;
    room.meeting = null;
    room.sabotages = [];
    room.pendingMeeting = null;
    room.timeLimitSec = null;
    room.timeLimitEndsAt = null;
    room.numImpostors = 1;
    room.killCooldownSec = 30;
    room.meetingSec = 120;
    if (room._meetingTimer) clearTimeout(room._meetingTimer);
    if (adminPlayer) {
      adminPlayer.role = null;
      adminPlayer.cardId = null;
      adminPlayer.alive = true;
      adminPlayer.killCooldownUntil = 0;
      adminPlayer.missions = [];
      adminPlayer.playerSabotages = [];
      adminPlayer.connected = true;
      adminPlayer.socketId = socket.id;
      room.players.set(adminPlayer.id, adminPlayer);
    }
    // everyone else must rejoin
    socket.to(room.code).emit("room:reset", {});
    emitRoomState(room);
  });

  socket.on("player:rename", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room) return;
    const player = Array.from(room.players.values()).find(
      (p) => p.sessionToken === payload.sessionToken
    );
    if (!player) return;
    const name = String(payload.name || "").trim().slice(0, 24);
    if (!name) return;
    player.name = name;
    if (player.socketId) io.to(player.socketId).emit("room:state", playerView(room, player));
    emitLobby(room);
  });

  socket.on("disconnect", () => {
    for (const room of require("./src/rooms").rooms.values()) {
      for (const p of room.players.values()) {
        if (p.socketId === socket.id) {
          p.socketId = null;
          p.connected = false;
          emitLobby(room);
        }
      }
    }
  });

  // Admin kicks a player from lobby
  socket.on("admin:kick", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.adminToken !== payload.adminToken) return;
    if (room.status !== "LOBBY") return;
    const player = room.players.get(payload.playerId);
    if (!player || player.isAdmin) return;
    room.players.delete(payload.playerId);
    io.to(room.code).emit("player:kicked", { playerId: payload.playerId });
    emitLobby(room);
  });

  // Impostor activates sabotage
  socket.on("sabotage:activate", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room || room.status !== "RUNNING") return;
    
    const player = Array.from(room.players.values()).find(
      (p) => p.sessionToken === payload.sessionToken
    );
    if (!player || player.role !== "IMPOSTOR" || !player.alive) return;
    
    // Check cooldown
    const lastSabotage = room.sabotageCooldowns?.[room.code] || 0;
    if (Date.now() < lastSabotage) return;
    
    const sabotageTypes = {
      NFC: { duration: 240, cooldown: 240, zones: ["Pasillo", "Cocina"] },
      LIGHTS: { duration: 120, cooldown: 180 },
      REACTOR: { duration: 180, cooldown: 240 }
    };
    
    const sabotage = sabotageTypes[payload.type];
    if (!sabotage) return;
    
    // Check if sabotage is enabled in room config
    if (room.sabotageConfig?.[payload.type]?.enabled === false) return;
    
    const sabotageId = uuid();
    const roomSabotage = {
      id: sabotageId,
      type: payload.type,
      endsAt: Date.now() + sabotage.duration * 1000,
      targetZones: sabotage.zones || [],
      durationSec: sabotage.duration,
      cooldownSec: sabotage.cooldown,
      active: true,
      activations: [{ playerId: player.id, zone: sabotage.zones?.[0] || "Unknown", timestamp: Date.now() }]
    };
    
    room.sabotages.push(roomSabotage);
    
    // Target all alive crew players with this sabotage
    for (const p of room.players.values()) {
      if (p.alive && p.role === "CREW") {
        p.playerSabotages.push({ ...roomSabotage });
      }
    }
    
    // Set cooldown (duration + cooldown combined)
    room.sabotageCooldowns[room.code] = Date.now() + (sabotage.duration + sabotage.cooldown) * 1000;
    
    io.to(room.code).emit("sabotage:started", {
      id: sabotageId,
      type: payload.type,
      endsAt: roomSabotage.endsAt,
      targetZones: sabotage.zones || [],
      duration: sabotage.duration
    });
    
    emitRoomState(room);
  });

  // Sabotage NFC scan
  socket.on("sabotage:nfcScan", (payload) => {
    const room = getRoom(payload && payload.code);
    if (!room) return;
    
    const roomSabotage = room.sabotages.find(s => s.id === payload.sabotageId && s.active);
    if (!roomSabotage) return;
    
    const player = Array.from(room.players.values()).find(
      (p) => p.sessionToken === payload.sessionToken
    );
    if (!player || !player.alive) return;
    
    // Record this scan
    roomSabotage.activations.push({ 
      playerId: player.id, 
      zone: payload.zone || "Unknown",
      timestamp: Date.now() 
    });
    
    // Check NFC resolution (2 different players in different zones within 10s)
    const activations = roomSabotage.activations;
    for (let i = 0; i < activations.length - 1; i++) {
      const first = activations[i];
      const second = activations[activations.length - 1];
      const diff = second.timestamp - first.timestamp;
      const zonesMatch = first.zone !== second.zone;
      const playersMatch = first.playerId !== second.playerId;
      
      if (diff <= 10000 && zonesMatch && playersMatch) {
        roomSabotage.active = false;
        io.to(room.code).emit("sabotage:resolved", {
          id: roomSabotage.id,
          type: roomSabotage.type,
          success: true
        });
        
        // Remove sabotage from room and all players
        room.sabotages = room.sabotages.filter(sab => sab.id !== roomSabotage.id);
        for (const p of room.players.values()) {
          p.playerSabotages = p.playerSabotages.filter(s => s.id !== roomSabotage.id);
        }
        
        emitRoomState(room);
        return;
      }
    }
    
    emitRoomState(room);
  });

  // Check sabotage expiration and game time limit
  setInterval(() => {
    for (const room of rooms.values()) {
      // Check game time limit expiration
      if (room.status === "RUNNING" && room.timeLimitEndsAt && Date.now() > room.timeLimitEndsAt) {
        room.winner = "IMPOSTOR";
        room.winnerReason = "Time limit exceeded";
        room.status = "ENDED";
        room.sabotages = [];
        for (const p of room.players.values()) {
          p.playerSabotages = [];
        }
        io.to(room.code).emit("game:won", { 
          team: "IMPOSTOR", 
          reason: "Tiempo límite alcanzado - Los impostores ganan" 
        });
        continue;
      }
      
      // Check sabotage expiration
      for (const s of room.sabotages) {
        if (s.active && Date.now() > s.endsAt) {
          s.active = false;
          io.to(room.code).emit("sabotage:resolved", {
            id: s.id,
            type: s.type,
            success: false
          });
          
          const resolvedId = s.id;
          // Remove sabotage from room and all players
          room.sabotages = room.sabotages.filter(sab => sab.id !== resolvedId);
          for (const p of room.players.values()) {
            p.playerSabotages = p.playerSabotages.filter(sab => sab.id !== resolvedId);
          }
          
          // Impostor wins on sabotage failure
          room.winner = "IMPOSTOR";
          room.winnerReason = "Sabotage failed";
          room.status = "ENDED";
          io.to(room.code).emit("game:won", { 
            team: "IMPOSTOR", 
            reason: "Sabotaje no resuelto" 
          });
          break;
        }
      }
    }
  }, 1000);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Real-Life Among Us listening on :${PORT}`));