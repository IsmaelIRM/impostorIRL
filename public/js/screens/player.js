export function render(ctx) {
  const me = ctx.me || {};
  const room = ctx.room || {};
  const alive = me.alive !== false;
  const isImpostor = me.role === "IMPOSTOR";
  const missions = me.missions || [];

  const missionHtml = missions
    .map(
      (m, i) => `
      <div class="mission ${m.status === "DONE" ? "done" : "pending"}">
        <div class="meta">Misión ${i + 1} / ${missions.length} · ${escapeHtml(m.zone || "")}</div>
        <div class="title">${escapeHtml(m.name)}</div>
        <div class="desc">${escapeHtml(m.desc || "")}</div>
        <button class="toggle ${m.status === "DONE" ? "good" : "ghost"}" data-id="${m.id}">
          ${m.status === "DONE" ? "✓ Hecha (tocar para deshacer)" : "Marcar hecha"}
        </button>
      </div>`
    )
    .join("");

  let banner = "";
  if (!alive && me.role === "CREW") {
    banner = `<div class="banner crew">👻 Eres un FANTASMA — sigue tus tareas en silencio.</div>`;
  } else if (!alive && isImpostor) {
    banner = `<div class="banner">Fuiste eliminado. Fin de la partida para ti.</div>`;
  }

  return `
    <h1>${alive ? "Tu partida" : "Fuera de juego"}</h1>
    ${banner}
    <div class="card">
      <button id="btn-role" class="warn">👁 Ver mi rol</button>
      <p class="tiny center" style="margin-top:6px">Tápalo y pulsa "Salir" tras leerlo para que nadie lo vea.</p>
    </div>
    <div class="card">
      <h3>Tus misiones</h3>
      ${missionHtml}
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
  `;
}

export function mount(ctx) {
  const socket = ctx.socket;
  const me = ctx.me || {};

  document.querySelectorAll(".toggle").forEach((b) =>
    b.addEventListener("click", () => {
      socket.emit("task:toggle", {
        code: ctx.code,
        sessionToken: ctx.sessionToken,
        missionId: b.dataset.id,
      });
    })
  );

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
    html += `<div id="kill-box"></div>`;
  } else {
    html += `<div class="big">TRIPULANTE</div>`;
    html += `<p>Completa tus misiones. Vota con cuidado.</p>`;
  }
  html += `<button class="ghost" id="btn-role-exit" style="margin-top:22px">Salir</button>`;
  ov.innerHTML = html;

  document.getElementById("btn-role-exit").onclick = hideRole;

  if (isImpostor) renderKillBox(ctx);

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
  const targets = (room.players || []).filter((p) => p.alive && p.id !== ctx.playerId);

  let inner = "";
  if (cdLeft > 0) {
    inner += `<p class="countdown" id="cd">Espera ${Math.ceil(cdLeft / 1000)}s</p>`;
  } else {
    inner += `<p class="tiny">Elige a quién eliminar:</p>`;
  }
  inner += targets
    .map(
      (t) => `
      <div class="vote-option kill-opt ${cdLeft > 0 ? "disabled" : ""}" data-target="${t.id}">
        <span>${escapeHtml(t.name)}</span>
        <span class="tag">eliminar</span>
      </div>`
    )
    .join("");

  box.innerHTML = inner;

  box.querySelectorAll(".kill-opt").forEach((el) => {
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

function hideRole() {
  const ov = document.getElementById("role-overlay");
  if (ov) ov.classList.add("hidden");
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
