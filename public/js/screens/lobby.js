export function render(ctx) {
  const room = ctx.room || {};
  const players = room.players || [];
  const missions = room.missions || [];

  const me = players.find((p) => p.id === ctx.playerId);
  const myName = me ? me.name : ctx.lastName || "—";

  const playerList = players
    .map(
      (p) => `
      <li class="${p.alive ? "" : "dead"} ${p.connected ? "" : "off"}">
        <span>${escapeHtml(p.name)}${p.isAdmin ? '<span class="tag admin">ANFITRIÓN</span>' : ""}</span>
        ${
          ctx.isAdmin && room.status === "RUNNING"
            ? `<span class="tag" data-progress="${p.id}">–</span>`
            : ""
        }
        ${
          ctx.isAdmin && !p.isAdmin && room.status === "LOBBY"
            ? `<button class="kick-btn" data-kick="${p.id}" title="Expulsar">✕</button>`
            : ""
        }
      </li>`
    )
    .join("");

  const adminPanel = ctx.isAdmin
    ? adminHtml(ctx, room, missions)
    : "";

  return `
    <h1>Sala ${room.code || ctx.code}</h1>
    <div class="code-badge">${room.code || ctx.code}</div>
    <p class="sub">Comparte este código o el enlace</p>
    <p class="center">Tú: <b>${escapeHtml(myName)}</b> <button class="ghost" id="btn-rename" style="width:auto;padding:6px 10px">✏️ Cambiar</button></p>
    <div class="card">
      <label>Enlace para unirse</label>
      <input id="share-url" readonly value="${ctx.joinUrl || ""}" />
      <button class="ghost" id="btn-copy">Copiar enlace</button>
      <button class="ghost" id="btn-qr" style="margin-top:8px">📱 QR para compartir</button>
      ${ctx.isAdmin ? `<button class="ghost" id="btn-copy-admin" style="margin-top:8px">Copiar enlace de anfitrión</button>` : ""}
    </div>
    <div id="qr-modal" class="modal hidden">
      <div class="map-wrap">
        <div id="qr-svg"></div>
        <button class="ghost" id="btn-qr-close" style="margin-top:12px">Cerrar</button>
      </div>
    </div>
    <div class="card">
      <h3>Jugadores (${players.length})</h3>
      <ul class="players">${playerList}</ul>
    </div>
    ${adminPanel}
  `;
}

function adminHtml(ctx, room, missions) {
  const missionEditor = missions
    .map(
      (m, i) => `
      <div class="mission-edit" data-i="${i}">
        <div style="flex:1">
          <input class="m-name" placeholder="Nombre" value="${escapeHtml(m.name)}" />
          <input class="m-zone" placeholder="Zona" value="${escapeHtml(m.zone || "")}" />
          <input class="m-desc" placeholder="Descripción" value="${escapeHtml(m.desc || "")}" />
        </div>
        <button class="del" data-del="${i}">✕</button>
      </div>`
    )
    .join("");

  return `
    <div class="card admin-panel">
      <h3>⚙️ Panel de anfitrión</h3>

      <label>Número de impostores</label>
      <div class="row">
        <button class="ghost imp-set ${room.numImpostors === 1 ? "warn" : ""}" data-n="1">1</button>
        <button class="ghost imp-set ${room.numImpostors === 2 ? "warn" : ""}" data-n="2">2</button>
      </div>

      <label>Tiempo de reunión (segundos)</label>
      <input id="cfg-meeting" type="number" value="${room.meetingSec || 120}" />

      <label>Enfriamiento de eliminar (segundos)</label>
      <input id="cfg-cd" type="number" value="${room.killCooldownSec || 30}" />

      <label>Tiempo límite total (segundos, 0 = sin límite)</label>
      <input id="cfg-limit" type="number" value="${room.timeLimitSec || 0}" />

      <label>Mapa (sube PNG o pega URL)</label>
      <input id="cfg-mapurl" placeholder="https://…" value="${room.mapImageUrl && !room.mapImageUrl.startsWith('/uploads') ? escapeHtml(room.mapImageUrl) : ''}" />
      <input id="cfg-mapfile" type="file" accept="image/png" />
      <button class="ghost" id="btn-upload-map">Subir mapa</button>

      <label>Misiones (${missions.length})</label>
      <div id="mission-list">${missionEditor}</div>
      <button class="ghost" id="btn-add-mission" style="margin-bottom:12px">+ Añadir misión</button>

      <button class="warn" id="btn-save">Guardar configuración</button>
      <button class="good" id="btn-start" style="margin-top:10px">▶ Comenzar partida</button>
      <button class="danger" id="btn-reset" style="margin-top:10px">♻️ Reiniciar sala (borrar jugadores)</button>
    </div>
  `;
}

export function mount(ctx) {
  const copy = document.getElementById("btn-copy");
  if (copy)
    copy.addEventListener("click", () => {
      copyText(ctx.joinUrl);
      window.AU.toast("Enlace copiado");
    });
  const copyA = document.getElementById("btn-copy-admin");
  if (copyA)
    copyA.addEventListener("click", () => {
      copyText(ctx.adminUrl);
      window.AU.toast("Enlace de anfitrión copiado");
    });

  const qrBtn = document.getElementById("btn-qr");
  if (qrBtn) {
    qrBtn.addEventListener("click", () => {
      if (ctx.joinUrl) {
        const container = document.getElementById("qr-svg");
        container.innerHTML = "";
        // QRCode library is loaded globally via script tag
        new window.QRCode(container, { text: ctx.joinUrl, width: 250, height: 250, colorDark: "#000", colorLight: "#fff", correctLevel: window.QRCode.CorrectLevel.H });
        document.getElementById("qr-modal").classList.remove("hidden");
      }
    });
  }
  document.getElementById("btn-qr-close")?.addEventListener("click", () => {
    document.getElementById("qr-modal").classList.add("hidden");
  });
  document.getElementById("qr-modal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) document.getElementById("qr-modal").classList.add("hidden");
  });

  const rename = document.getElementById("btn-rename");
  if (rename)
    rename.addEventListener("click", () => {
      const n = prompt("Cambiar tu nombre:", myName);
      if (n && n.trim()) window.AU.renamePlayer(n.trim());
    });

  if (!ctx.isAdmin) return;
  const socket = ctx.socket;

  // Kick player buttons
  document.querySelectorAll(".kick-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const playerId = b.dataset.kick;
      const playerName = b.closest("li").textContent.split("ANFITRIÓN")[0].trim();
      if (confirm(`¿Expulsar a ${playerName} de la sala?`)) {
        socket.emit("admin:kick", { code: ctx.code, adminToken: ctx.adminToken, playerId });
      }
    });
  });

  document.querySelectorAll(".imp-set").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".imp-set").forEach((x) => x.classList.remove("warn"));
      b.classList.add("warn");
    })
  );

  document.getElementById("btn-add-mission")?.addEventListener("click", () => {
    const list = document.getElementById("mission-list");
    const i = list.children.length;
    const div = document.createElement("div");
    div.className = "mission-edit";
    div.dataset.i = i;
    div.innerHTML = `<div style="flex:1">
        <input class="m-name" placeholder="Nombre" />
        <input class="m-zone" placeholder="Zona" />
        <input class="m-desc" placeholder="Descripción" />
      </div><button class="del" data-del="${i}">✕</button>`;
    list.appendChild(div);
    div.querySelector(".del").addEventListener("click", () => div.remove());
  });

  document.querySelectorAll(".del").forEach((b) =>
    b.addEventListener("click", () => b.closest(".mission-edit").remove())
  );

  document.getElementById("btn-upload-map")?.addEventListener("click", () => {
    const f = document.getElementById("cfg-mapfile").files[0];
    if (!f) return window.AU.toast("Elige un PNG primero.");
    const fd = new FormData();
    fd.append("map", f);
    fetch(`/api/upload?code=${ctx.code}&adminToken=${ctx.adminToken}`, {
      method: "POST",
      body: fd,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return window.AU.toast(d.error);
        window.AU.toast("Mapa subido");
        document.getElementById("cfg-mapurl").value = d.mapImageUrl;
      })
      .catch(() => window.AU.toast("Error al subir"));
  });

  document.getElementById("btn-save")?.addEventListener("click", () => {
    const missions = Array.from(document.querySelectorAll(".mission-edit")).map((row) => ({
      name: row.querySelector(".m-name").value,
      zone: row.querySelector(".m-zone").value,
      desc: row.querySelector(".m-desc").value,
    }));
    const numImpostors = Number(
      document.querySelector(".imp-set.warn")?.dataset.n || 1
    );
    const payload = {
      code: ctx.code,
      adminToken: ctx.adminToken,
      missions,
      numImpostors,
      meetingSec: Number(document.getElementById("cfg-meeting").value),
      killCooldownSec: Number(document.getElementById("cfg-cd").value),
      timeLimitSec: Number(document.getElementById("cfg-limit").value),
      mapImageUrl: document.getElementById("cfg-mapurl").value.trim() || undefined,
    };
    socket.emit("admin:configure", payload, (ack) => {
      if (ack && ack.error) window.AU.toast(ack.error);
      else window.AU.toast("Configuración guardada");
    });
  });

  document.getElementById("btn-start")?.addEventListener("click", () => {
    socket.emit("admin:configure", collectConfig(ctx), (ack) => {
      if (ack && ack.error) return window.AU.toast(ack.error);
      socket.emit("admin:start", { code: ctx.code, adminToken: ctx.adminToken }, (a) => {
        if (a && a.error) window.AU.toast(a.error);
      });
    });
  });

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (
      !confirm(
        "¿Reiniciar la sala por completo? Se borran todos los jugadores y misiones. " +
          "Se mantiene el código de la sala. Todos deberán volver a entrar."
      )
    )
      return;
    socket.emit("admin:reset", { code: ctx.code, adminToken: ctx.adminToken });
  });
}

function collectConfig(ctx) {
  const missions = Array.from(document.querySelectorAll(".mission-edit")).map((row) => ({
    name: row.querySelector(".m-name").value,
    zone: row.querySelector(".m-zone").value,
    desc: row.querySelector(".m-desc").value,
  }));
  return {
    code: ctx.code,
    adminToken: ctx.adminToken,
    missions,
    numImpostors: Number(document.querySelector(".imp-set.warn")?.dataset.n || 1),
    meetingSec: Number(document.getElementById("cfg-meeting").value),
    killCooldownSec: Number(document.getElementById("cfg-cd").value),
    timeLimitSec: Number(document.getElementById("cfg-limit").value),
    mapImageUrl: document.getElementById("cfg-mapurl").value.trim() || undefined,
  };
}

function copyText(t) {
  if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {});
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
