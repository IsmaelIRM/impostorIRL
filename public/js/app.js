import * as landing from "./screens/landing.js";
import * as lobby from "./screens/lobby.js";
import * as player from "./screens/player.js";
import * as meeting from "./screens/meeting.js";
import * as results from "./screens/results.js";

const screens = { landing, lobby, player, meeting, results };

const socket = io();

const ctx = {
  socket,
  screen: "landing",
  code: null,
  sessionToken: null,
  playerId: null,
  isAdmin: false,
  adminToken: null,
  joinUrl: "",
  adminUrl: "",
  room: null, // lobby view
  me: null, // private player view
  progress: {}, // playerId -> {done,total}
  timers: [],
  meetingPlayers: null,
  meetingEndsAt: null,
  meetingPhase: null,
  lastResolve: null,
  winner: null,
  pendingMeeting: null,
  lastName: "",
  audioUnlocked: false,
};

// ---- URL / identity helpers ----
function readParams() {
  const url = new URL(location.href);
  return url;
}
function syncFromUrl() {
  const url = new URL(location.href);
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9]{3,8})$/);
  if (m) {
    ctx.code = m[1].toUpperCase();
    ctx.adminToken = url.searchParams.get("admin") || ctx.adminToken || null;
    ctx.isAdmin = !!ctx.adminToken;
    const p = url.searchParams.get("p");
    if (p) ctx.sessionToken = p;
  }
}
function updateUrl() {
  const url = new URL(location.href);
  if (ctx.code) {
    url.pathname = "/r/" + ctx.code;
    if (ctx.isAdmin) url.searchParams.set("admin", ctx.adminToken);
    else url.searchParams.delete("admin");
    if (ctx.sessionToken) url.searchParams.set("p", ctx.sessionToken);
    else url.searchParams.delete("p");
    history.replaceState({}, "", url.toString());
  }
}

// ---- toast / audio ----
let toastTimer = null;
function toast(msg, ms = 2500) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), ms);
}

let audioCtx = null;
function unlockAudio() {
  if (ctx.audioUnlocked) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    ctx.audioUnlocked = true;
  } catch (e) {}
}
document.addEventListener("pointerdown", unlockAudio, { once: false });

function playAlarm() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, now + i * 0.5);
      g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.5 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.5 + 0.4);
      o.connect(g).connect(audioCtx.destination);
      o.start(now + i * 0.5);
      o.stop(now + i * 0.5 + 0.45);
    }
  } catch (e) {}
}

// ---- rendering ----
function clearTimers() {
  ctx.timers.forEach((t) => clearInterval(t));
  ctx.timers = [];
}

function route() {
  if (!ctx.code) return "landing";
  if (ctx.room && ctx.room.status === "ENDED") return "results";
  if (!ctx.sessionToken) return "join";
  if (ctx.room && ctx.room.status === "MEETING") return "meeting";
  if (ctx.room && ctx.room.status === "LOBBY") return "lobby";
  return "player";
}

function render() {
  clearTimers();
  const name = route();
  ctx.screen = name;
  const app = document.getElementById("app");
  const mod = screens[name] || screens.landing;
  app.innerHTML = mod.render(ctx);
  if (typeof mod.mount === "function") mod.mount(ctx);
}

// ---- socket wiring ----
socket.on("connect", () => {
  document.getElementById("reconnect-overlay").classList.add("hidden");
  if (ctx.code && ctx.sessionToken) {
    socket.emit("room:join", { code: ctx.code, sessionToken: ctx.sessionToken }, (ack) => {
      if (ack && ack.error) toast(ack.error);
      else if (ack) applyJoinAck(ack);
      render();
    });
  }
});
socket.on("disconnect", () => {
  document.getElementById("reconnect-overlay").classList.remove("hidden");
});

socket.on("lobby:update", (data) => {
  ctx.room = data;
  if (ctx.screen === "lobby") {
    render();
    return;
  }
  // If the screen we'd land on changed (e.g. null-room -> lobby after create),
  // re-render so the host ends up on the lobby/admin screen instead of "Tu partida".
  if (route() !== ctx.screen) render();
});
socket.on("game:started", (data) => {
  ctx.me = data;
  render();
});
socket.on("room:state", (data) => {
  ctx.me = data;
  if (data.status) {
    if (ctx.room) ctx.room.status = data.status;
    else ctx.room = { status: data.status };
  }
  if (data.winner) {
    ctx.winner = { team: data.winner, reason: data.winnerReason };
  }
  // Sync meeting state for late (re)joiners so the timer matches everyone else.
  if (data.meeting && data.meeting.alivePlayers) {
    ctx.meetingPlayers = data.meeting.alivePlayers;
    ctx.meetingEndsAt = data.meeting.endsAt;
    ctx.meetingPhase = data.meeting.phase;
  }
  render();
});
socket.on("task:progress", (data) => {
  ctx.progress[data.playerId] = { done: data.done, total: data.total };
  if (ctx.screen === "lobby" && ctx.isAdmin) {
    const el = document.querySelector(`[data-progress="${data.playerId}"]`);
    if (el)
      el.textContent = `${data.done}/${data.total}` + (data.total ? "" : "");
  }
});
socket.on("meeting:resolve", (data) => {
  ctx.lastResolve = data;
  if (data.eliminatedName) {
    toast(
      data.tie
        ? "Empate: nadie eliminado."
        : `${data.eliminatedName} era ${data.wasImpostor ? "IMPOSTOR" : "tripulante"} y sale de la partida.`,
      4000
    );
  }
  // server will push room:state (RUNNING) or game:won
});
socket.on("player:killed", (data) => {
  toast(`💀 ${data.victimName} ha desaparecido…`, 3000);
});
socket.on("game:won", (data) => {
  ctx.winner = { team: data.team, reason: data.reason };
  render();
});
socket.on("game:alarm", () => playAlarm());

socket.on("meeting:start", (data) => {
  ctx.meetingPlayers = data.alivePlayers;
  ctx.meetingEndsAt = data.endsAt;
  ctx.meetingPhase = data.phase;
  // Alarm on meeting request (gather phase) to alert everyone.
  if (data.phase === "gather") playAlarm();
  render();
});
socket.on("room:reset", () => {
  ctx.sessionToken = null;
  ctx.me = null;
  ctx.room = null;
  toast("La sala se reinició. Vuelve a unirte con el código.");
  render();
});

function renamePlayer(name) {
  socket.emit("player:rename", { code: ctx.code, sessionToken: ctx.sessionToken, name });
}

// ---- join ack application ----
function applyJoinAck(ack) {
  ctx.code = ack.code;
  ctx.sessionToken = ack.sessionToken || ctx.sessionToken;
  ctx.playerId = ack.playerId;
  ctx.joinUrl = ack.joinUrl;
  ctx.adminUrl = ack.adminUrl;
  if (ack.isAdmin) {
    ctx.isAdmin = true;
    ctx.adminToken = ack.adminToken;
  }
  updateUrl();
  try {
    localStorage.setItem("au_token_" + ack.code, ctx.sessionToken);
  } catch (e) {}
}

// ---- public join/create API used by screens ----
function createRoom(hostName) {
  socket.emit("room:create", { hostName }, (ack) => {
    if (ack.error) return toast(ack.error);
    applyJoinAck(ack);
    render();
  });
}
function joinRoom(code, name) {
  socket.emit("room:join", { code: code.toUpperCase(), name }, (ack) => {
    if (ack.error) return toast(ack.error);
    applyJoinAck(ack);
    render();
  });
}

window.AU = { ctx, createRoom, joinRoom, toast, render, renamePlayer };

// ---- boot ----
syncFromUrl();
// restore token for this code from localStorage if present
if (ctx.code) {
  try {
    const t = localStorage.getItem("au_token_" + ctx.code);
    if (t && !ctx.sessionToken) ctx.sessionToken = t;
  } catch (e) {}
}
render();
