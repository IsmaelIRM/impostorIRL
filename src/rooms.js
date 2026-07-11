const { v4: uuid } = require("uuid");
const { defaultMissions, assignCards } = require("./cards");

const rooms = new Map(); // code -> Room

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function createRoom() {
  const code = makeCode();
  const room = {
    code,
    adminToken: uuid(),
    status: "LOBBY",
    numImpostors: 1,
    missions: defaultMissions(),
    mapImageUrl: "/maps/placeholder.png",
    players: new Map(),
    meeting: null,
    winner: null,
    winnerReason: null,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    killCooldownSec: 30,
    meetingSec: 120,
    timeLimitSec: null,
    timeLimitEndsAt: null,
    sabotages: [], // Array of active sabotages in room
    sabotageCooldowns: {},
    sabotageConfig: {
      NFC: { enabled: true },
      LIGHTS: { enabled: true },
      REACTOR: { enabled: true }
    }
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(String(code || "").toUpperCase()) || null;
}

function addPlayer(room, name, isAdmin) {
  const id = uuid();
  const player = {
    id,
    name: String(name || "").trim().slice(0, 24) || "Jugador",
    isAdmin: !!isAdmin,
    sessionToken: uuid(),
    socketId: null,
    connected: false,
    role: null,
    cardId: null,
    alive: true,
    killCooldownUntil: 0,
    missions: [],
    playerSabotages: [], // Sabotages targeting this player
  };
  room.players.set(id, player);
  return player;
}

// Build shareable base URLs from the incoming request so they work with ngrok
// AND Duck DNS without any config. Optional PUBLIC_BASE_URL override.
function baseUrlFromReq(req) {
  const override = process.env.PUBLIC_BASE_URL;
  if (override && override.trim()) return override.trim().replace(/\/+$/, "");
  const proto = (req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function joinUrl(room, req) {
  return `${baseUrlFromReq(req)}/r/${room.code}`;
}

function adminUrl(room, req) {
  return `${joinUrl(room, req)}?admin=${room.adminToken}`;
}

// Lobby/roster view — NEVER includes role or missions.
function lobbyView(room) {
  return {
    code: room.code,
    status: room.status,
    numImpostors: room.numImpostors,
    meetingSec: room.meetingSec,
    killCooldownSec: room.killCooldownSec,
    timeLimitSec: room.timeLimitSec,
    timeLimitEndsAt: room.timeLimitEndsAt,
    mapImageUrl: room.mapImageUrl,
    sabotageConfig: room.sabotageConfig,
    sabotages: room.sabotages.map(s => ({
      id: s.id,
      type: s.type,
      endsAt: s.endsAt,
      targetZones: s.targetZones || []
    })),
    missions: room.missions.map((m) => ({
      id: m.id,
      name: m.name,
      zone: m.zone,
      desc: m.desc,
      type: m.type || "GENERIC",
      interactive: m.interactive || false,
      config: m.config || {}
    })),
    players: Array.from(room.players.values()).map((p) => {
      const base = {
        id: p.id,
        name: p.name,
        isAdmin: p.isAdmin,
        alive: p.alive,
        connected: p.connected,
      };
      // Reveal everything once the game is over.
      if (room.status === "ENDED") {
        base.role = p.role;
        base.cardId = p.cardId;
        base.missions = p.missions.map((m) => ({
          missionId: m.missionId,
          status: m.status,
        }));
      }
      return base;
    }),
    winner: room.winner,
    winnerReason: room.winnerReason,
  };
}

// Per-player private view (only the owning socket ever receives this).
function playerView(room, player) {
  const missionInfo = room.missions.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {});
return {
    status: room.status,
    role: player.role,
    cardId: player.cardId,
    alive: player.alive,
    killCooldownUntil: player.killCooldownUntil,
    mapImageUrl: room.mapImageUrl,
    timeLimitEndsAt: room.timeLimitEndsAt,
    timeLimitSec: room.timeLimitSec,
    winner: room.winner,
    winnerReason: room.winnerReason,
    sabotages: room.sabotages.map(s => ({
      id: s.id,
      type: s.type,
      endsAt: s.endsAt,
      targetZones: s.targetZones || []
    })), // All room sabotages
    playerSabotages: (player.playerSabotages || []).map(s => ({
      id: s.id,
      type: s.type,
      endsAt: s.endsAt,
      targetZones: s.targetZones || []
    })), // Sabotages targeting this player
    meeting: room.meeting
        ? {
            reporterId: room.meeting.reporterId,
            endsAt: room.meeting.endsAt,
            phase: room.meeting.phase || "voting",
            alivePlayers: Array.from(room.players.values())
              .filter((p) => p.alive)
              .map((p) => ({ id: p.id, name: p.name })),
            voteCast:
              player.sessionToken != null && room.meeting.votes.has(player.sessionToken)
                ? room.meeting.votes.get(player.sessionToken) === null
                  ? "skip"
                  : room.meeting.votes.get(player.sessionToken)
                : undefined,
          }
        : null,
missions: player.missions.map((m) => ({
         id: m.missionId,
         name: missionInfo[m.missionId] ? missionInfo[m.missionId].name : "",
         zone: missionInfo[m.missionId] ? missionInfo[m.missionId].zone : "",
         desc: missionInfo[m.missionId] ? missionInfo[m.missionId].desc : "",
         type: missionInfo[m.missionId] ? missionInfo[m.missionId].type : "GENERIC",
         interactive: missionInfo[m.missionId] ? missionInfo[m.missionId].interactive : false,
         config: missionInfo[m.missionId] ? missionInfo[m.missionId].config : {},
         assignedObject: m.assignedObject || null,
         status: m.status,
       })),
  };
}

module.exports = {
  rooms,
  makeCode,
  createRoom,
  getRoom,
  addPlayer,
  assignCards,
  baseUrlFromReq,
  joinUrl,
  adminUrl,
  lobbyView,
  playerView,
};