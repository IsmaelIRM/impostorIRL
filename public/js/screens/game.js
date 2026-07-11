import { loadMissions, renderMissionBoxes, getInteractiveScreens, renderMissionModals, getCachedMissions } from '../missions/index.js';
import { createSabotageCtx } from '../sabotages/loader.js';
import { renderSabotageCards } from '../sabotages/index.js';
import { sabotageMetadata } from '../sabotages/loader.js';

let renderedMissions = [];

export function clearRendered() {
  renderedMissions = [];
}

function renderGameTimer(room) {
  if (!room.timeLimitEndsAt || !room.timeLimitSec) return '';
  
  const totalMs = room.timeLimitSec * 1000;
  const remainingMs = Math.max(0, room.timeLimitEndsAt - Date.now());
  const remainingSec = Math.ceil(remainingMs / 1000);
  const percent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  
  return `
    <div class="card game-timer">
      <h3>⏱ Tiempo de partida</h3>
      <div class="timer-bar">
        <div class="timer-fill" style="width:${percent}%"></div>
      </div>
      <p class="timer-text">${remainingSec}s restantes</p>
    </div>`;
}

export async function render(ctx) {
  const me = ctx.me || {};
  const room = ctx.room || {};
  const alive = me.alive !== false;
  const isImpostor = me.role === "IMPOSTOR";
  const missions = me.missions || [];

  // Ensure loader is initialized
  await loadMissions();

  // Render mission boxes (uniform size)
  const missionHtml = renderMissionBoxes(missions);
  renderedMissions = getCachedMissions();

  // Get interactive screens and modals
  const interactiveScreens = getInteractiveScreens();
  const missionModals = renderMissionModals();

  // Sabotage modal for players targeted by sabotage (use first targeted sabotage)
  const primarySabotage = me.playerSabotages?.[0];
  const sabotageModal = (primarySabotage && primarySabotage.active) 
    ? `<div class="modal hidden" id="sabotage-modal">
        <div class="card" style="position:relative">
          ${createSabotageCtx(primarySabotage, ctx).getPopupContent(ctx)}
        </div>
      </div>` 
    : '';

  let banner = "";
  if (!alive && me.role === "CREW") {
    banner = `<div class="banner crew">👻 Eres un FANTASMA — sigue tus tareas en silencio.</div>`;
  } else if (!alive && isImpostor) {
    banner = `<div class="banner">Fuiste eliminado. Fin de la partida para ti.</div>`;
  }
  
  // Show banner for targeted sabotage
  if (primarySabotage?.active) {
    banner += `<div class="banner" style="background:var(--impostor);margin-top:10px">
      🚨 SABOTAJE: ${primarySabotage.type} - Resuelve antes de que termine el tiempo
    </div>`;
  }

  // Sabotage cards - displayed above missions if room has active sabotages
  const sabotageCards = renderSabotageCards(room.sabotages);
  
  // Game timer
  const gameTimer = renderGameTimer(room);

  return `
    <h1>${alive ? "Tu partida" : "Fuera de juego"}</h1>
    ${banner}
    ${gameTimer}
    <div class="card">
      <button id="btn-role" class="warn">👁 Ver mi rol</button>
      <p class="tiny center" style="margin-top:6px">Tápalo y pulsa "Salir" tras leerlo para que nadie lo vea.</p>
    </div>
    ${ctx.isAdmin ? `
    <div class="card admin-game-panel">
      <h3>⚙️ Panel de anfitrión</h3>
      <button class="danger" id="btn-reset-game">♻️ Reiniciar partida</button>
    </div>` : ""}
    ${sabotageCards}
    <div class="card">
      <h3>Tus misiones</h3>
      <div class="missions-grid">
        ${missionHtml}
      </div>
    </div>
    <div class="action-bar">
      <button class="ghost" id="btn-map">🗺 Mapa</button>
      ${alive ? `<button class="danger" id="btn-report">🚨 Reportar cuerpo</button>` : ""}
    </div>

    <div id="role-overlay" class="role-reveal hidden"></div>
    <div id="map-modal" class="modal hidden">
      <div class="map-wrap">
        <div class="map-toolbar">
          <button id="map-zoom-out" class="zoom-btn">−</button>
          <span id="map-zoom-label">100%</span>
          <button id="map-zoom-in" class="zoom-btn">+</button>
          <button id="map-zoom-reset" class="zoom-btn">↺</button>
        </div>
        <div class="map-scroll" id="map-scroll">
          <img id="map-img" src="${room.mapImageUrl || "/maps/placeholder.png"}" alt="mapa" />
        </div>
        <button class="ghost" id="btn-map-close">Cerrar</button>
      </div>
    </div>
    ${missionModals}
    ${interactiveScreens}
    ${sabotageModal}
  `;
}

export function mount(ctx) {
  const socket = ctx.socket;
  const me = ctx.me || {};

  // Click on mission boxes to open modal (only for non-done missions)
  document.querySelectorAll(`.mission`).forEach((box) => {
    box.addEventListener('click', () => {
      if (box.classList.contains('done')) return;
      const missionId = box.dataset.missionId;
      const modal = document.getElementById(`mission-modal-${missionId}`);
      if (modal) modal.classList.remove("hidden");
    });
  });

  // Close mission modals
  document.querySelectorAll(`[data-close-mission]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      const missionId = btn.dataset.closeMission;
      document.getElementById(`mission-modal-${missionId}`)?.classList.add("hidden");
    });
  });

  // Close sabotage modals
  document.querySelectorAll(`[data-close-sabotage]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('sabotage-modal')?.classList.add('hidden');
    });
  });

  // Mount popups for each mission (completion triggers inside modals)
  renderedMissions.forEach(mission => mission.mount ? mission.mount(ctx) : null);
  
  // Handle DRAW modal completion
  const drawDone = document.getElementById('draw-done');
  if (drawDone && !drawDone._handler) {
    drawDone._handler = true;
    drawDone.addEventListener('click', () => {
      const drawModal = document.getElementById('draw-modal');
      const missionId = drawModal?.dataset.missionId;
      if (missionId) {
        socket.emit("task:toggle", {
          code: ctx.code,
          sessionToken: ctx.sessionToken,
          missionId: missionId,
        });
      }
      drawModal?.classList.add('hidden');
    });
  }
  
  // Handle PHOTO modal completion
  const photoTake = document.getElementById('photo-take');
  if (photoTake && !photoTake._handler) {
    photoTake._handler = true;
    photoTake.addEventListener('click', () => {
      const photoModal = document.getElementById('photo-modal');
      const missionId = photoModal?.dataset.missionId;
      const video = document.getElementById('photo-preview');
      const canvas = document.getElementById('photo-canvas');
      const img = document.getElementById('photo-img');
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      img.src = canvas.toDataURL('image/jpeg');
      document.getElementById('photo-result').style.display = 'block';
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
      }
      if (missionId) {
        socket.emit("task:toggle", {
          code: ctx.code,
          sessionToken: ctx.sessionToken,
          missionId: missionId,
        });
      }
    });
  }
  
  // Map modal with zoom
  const mapModal = document.getElementById("map-modal");
  const img = document.getElementById("map-img");
  const label = document.getElementById("map-zoom-label");
  let scale = 1;
  const applyZoom = () => {
    img.style.width = scale * 100 + "%";
    label.textContent = Math.round(scale * 100) + "%";
  };
  const resetZoom = () => {
    scale = 1;
    applyZoom();
  };
  document.getElementById("btn-map")?.addEventListener("click", () => {
    mapModal.classList.remove("hidden");
    resetZoom();
  });
  document.getElementById("btn-map-close")?.addEventListener("click", () =>
    mapModal.classList.add("hidden")
  );
  document.getElementById("map-zoom-in")?.addEventListener("click", () => {
    scale = Math.min(4, scale + 0.5);
    applyZoom();
  });
  document.getElementById("map-zoom-out")?.addEventListener("click", () => {
    scale = Math.max(1, scale - 0.5);
    applyZoom();
  });
  document.getElementById("map-zoom-reset")?.addEventListener("click", resetZoom);
  img?.addEventListener("dblclick", () => {
    scale = scale > 1 ? 1 : 2.5;
    applyZoom();
  });

  const reportBtn = document.getElementById("btn-report");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      if (!confirm("¿Reportar un cuerpo y convocar la reunión?")) return;
      socket.emit("meeting:report", { code: ctx.code, sessionToken: ctx.sessionToken });
    });
  }

  const roleBtn = document.getElementById("btn-role");
  if (roleBtn) roleBtn.addEventListener("click", () => showRole(ctx));

  // Admin reset button during game
  const resetBtn = document.getElementById("btn-reset-game");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("¿Reiniciar la partida? Se pierde el progreso actual.")) return;
      socket.emit("admin:reset", { code: ctx.code, adminToken: ctx.adminToken });
    });
  }
  
  // Show sabotage modal when player has active targeted sabotage
  const sabotageModalEl = document.getElementById("sabotage-modal");
  const playerSabotage = me.playerSabotages?.[0];
  if (sabotageModalEl && playerSabotage?.active) {
    const sabCd = document.getElementById("sab-cd");
    if (sabCd && playerSabotage?.endsAt) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((playerSabotage.endsAt - Date.now()) / 1000));
        sabCd.textContent = remaining;
      };
      updateCountdown();
      setInterval(updateCountdown, 1000);
    }
    // Mount sabotage handlers
    const sabotage = createSabotageCtx(playerSabotage, ctx);
    sabotage.mount ? sabotage.mount(ctx) : null;
  }
  
  // Update sabotage countdowns in the room sabotage summary cards
  document.querySelectorAll('.sabotage-card').forEach(card => {
    const endsAt = Number(card.dataset.ends);
    const sabCd = card.querySelector('.sab-cd');
    if (endsAt && sabCd) {
      const updateCd = () => {
        sabCd.textContent = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      };
      updateCd();
      setInterval(updateCd, 1000);
    }
  });
  
  // Update game timer progress bar
  const timerFill = document.querySelector('.timer-fill');
  const timerText = document.querySelector('.timer-text');
  if (timerFill && timerText && ctx.room?.timeLimitEndsAt && ctx.room?.timeLimitSec) {
    const updateTimer = () => {
      const remainingMs = Math.max(0, ctx.room.timeLimitEndsAt - Date.now());
      const totalMs = ctx.room.timeLimitSec * 1000;
      const remainingSec = Math.ceil(remainingMs / 1000);
      const percent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
      timerFill.style.width = percent + '%';
      timerFill.style.background = percent < 20 ? 'var(--impostor)' : 'var(--good)';
      timerText.textContent = remainingSec + 's restantes';
    };
    ctx.timers.push(setInterval(updateTimer, 1000));
  }

  // anti-shoulder-surf: hide if the app is backgrounded
  window.addEventListener("blur", hideRole);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hideRole();
  });
}

function showRole(ctx) {
  const me = ctx.me || {};
  const ov = document.getElementById("role-overlay");
  if (!ov) return;
  ov.classList.remove("hidden");
  const isImpostor = me.role === "IMPOSTOR";
  ov.className = "role-reveal " + (isImpostor ? "impostor" : "crew");

  let html = "";
  if (isImpostor) {
    html += `<div class="big">IMPOSTOR</div>`;
    html += `<p>Elimina tripulantes. No te delates.</p>`;
    
    // Show other alive impostors
    const room = ctx.room || {};
    const otherImpostors = Array.isArray(room.players)
      ? room.players.filter((p) => p.alive && p.role === "IMPOSTOR" && p.id !== ctx.playerId)
      : [];
    if (otherImpostors.length > 0) {
      html += `<div id="impostor-allies" style="margin:10px 0;padding:8px;background:var(--card2);border-radius:8px">
        <p class="tiny" style="margin:0 0 4px 0">Otros impostores vivos:</p>
        <p style="margin:0">${otherImpostors.map(p => escapeHtml(p.name)).join(", ")}</p>
      </div>`;
    }
    
    html += `<div id="kill-box"></div>`;
    
    // Sabotage selection panel - show all available sabotage types
    const sabotageOptions = Object.entries(sabotageMetadata).map(([type, meta]) => {
      const enabled = room.sabotageConfig?.[type]?.enabled !== false;
      return `<button class="ghost sab-opt ${!enabled ? 'disabled' : ''}" data-sab-type="${type}" style="margin-top:6px;margin-right:6px" ${!enabled ? 'disabled' : ''}>${meta.icon || ''} ${meta.name || type}</button>`;
    }).join('');
    
    html += `<div style="margin-top:20px">
      <p class="tiny">Sabotajes disponibles:</p>
      <div class="sabotage-options">${sabotageOptions}</div>
    </div>`;
  } else {
    html += `<div class="big">TRIPULANTE</div>`;
    html += `<p>Completa tus misiones. Vota con cuidado.</p>`;
  }
  html += `<button class="ghost" id="btn-role-exit" style="margin-top:22px">Salir</button>`;
  ov.innerHTML = html;

  document.getElementById("btn-role-exit").onclick = hideRole;

  if (isImpostor) {
    renderKillBox(ctx);
    renderSabotageOptions(ctx);
  }

  // auto-hide after 6s
  if (ctx._roleTimer) clearTimeout(ctx._roleTimer);
  ctx._roleTimer = setTimeout(hideRole, 6000);
}

function renderKillBox(ctx) {
  const box = document.getElementById("kill-box");
  if (!box) return;
  const me = ctx.me || {};
  if (me.alive === false) {
    box.innerHTML = `<p class="tiny">Estás fuera de la partida.</p>`;
    return;
  }
  const now = Date.now();
  const cdLeft = Math.max(0, (me.killCooldownUntil || 0) - now);
  const room = ctx.room || {};
  const targets = Array.isArray(room.players) 
    ? room.players.filter((p) => p.alive && p.id !== ctx.playerId)
    : [];

  let inner = "";
  if (cdLeft > 0) {
    inner += `<p class="countdown" id="cd">Espera ${Math.ceil(cdLeft / 1000)}s</p>`;
  } else {
    inner += `<p class="tiny">Elige a quién eliminar:</p>`;
  }
  inner += targets
    .map(
      (t) => `
      <div class="kill-option ${cdLeft > 0 ? "disabled" : ""}" data-target="${t.id}">
        <span>${escapeHtml(t.name)}</span>
        <span class="kill-tag">✖</span>
      </div>`
    )
    .join("");

  box.innerHTML = inner;

  box.querySelectorAll(".kill-option").forEach((el) => {
    if (cdLeft > 0) return;
    el.addEventListener("click", () => {
      ctx.socket.emit("impostor:kill", {
        code: ctx.code,
        sessionToken: ctx.sessionToken,
        targetPlayerId: el.dataset.target,
      });
      hideRole();
    });
  });

  if (cdLeft > 0) {
    const t = setInterval(() => {
      const left = Math.max(0, (ctx.me.killCooldownUntil || 0) - Date.now());
      const cd = document.getElementById("cd");
      if (cd) cd.textContent = `Espera ${Math.ceil(left / 1000)}s`;
      if (left <= 0) {
        clearInterval(t);
        renderKillBox(ctx);
      }
    }, 500);
    ctx.timers.push(t);
  }
}

function renderSabotageOptions(ctx) {
  document.querySelectorAll('.sab-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.sabType;
      if (!confirm(`¿Activar sabotaje ${type}?`)) return;
      ctx.socket.emit("sabotage:activate", {
        code: ctx.code,
        sessionToken: ctx.sessionToken,
        type: type
      });
      hideRole();
    });
  });
}

function hideRole() {
  const ov = document.getElementById("role-overlay");
  if (ov) ov.classList.add("hidden");
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/">/g, "&gt;")
    .replace(/"/g, "&quot;");
}