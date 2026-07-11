import { missionLoader } from '../missions/loader.js';

const missionTypes = ["GENERIC", "DRAW", "BRICK", "BASKET", "NERF", "PHOTO", "CLEAN", "NFC_TASK"];
const adminSections = ["game", "impostor", "missions", "sabotage", "map", "meetings"];

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
        <span>${escapeHtml(p.name)} ${p.isAdmin ? '<span class="tag admin">ANFITRIÓN</span>' : ""}</span>
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
      ${ctx.isAdmin ? `<button class="ghost" id="btn-export-config" style="margin-top:8px">📤 Exportar config</button>` : ""}
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

function getMissionMetadata(type) {
  const defaults = {
    GENERIC: { name: "Generica", interactive: false },
    DRAW: { name: "Dibujo", interactive: true },
    BRICK: { name: "Ladrillo", interactive: true },
    BASKET: { name: "Canasta", interactive: false },
    NERF: { name: "Nerf", interactive: false },
    PHOTO: { name: "Foto", interactive: true },
    CLEAN: { name: "Limpiafondos", interactive: false },
    NFC_TASK: { name: "Tarea NFC", interactive: true }
  };
  return defaults[type] || defaults.GENERIC;
}

function adminHtml(ctx, room, missions) {
  const missionEditor = missions
    .map(
      (m, i) => {
        const metadata = getMissionMetadata(m.type || "GENERIC");
        const type = m.type || "GENERIC";
        // Use hardcoded fallback for now (missionLoader may not be loaded yet)
        const specificConfig = getMissionConfigFields(m);
        return `
      <div class="mission-edit" data-i="${i}">
        <div style="flex:1">
          <input class="m-name" placeholder="Nombre" value="${escapeHtml(m.name)}" />
          <input class="m-zone" placeholder="Zona" value="${escapeHtml(m.zone || "")}" />
          <input class="m-desc" placeholder="Descripción" value="${escapeHtml(m.desc || "")}" />
          <select class="m-type" style="margin-top:4px">
            ${missionTypes.map(t => {
              const meta = getMissionMetadata(t);
              return `<option value="${t}" ${m.type === t || (!m.type && t === 'GENERIC') ? 'selected' : ''}>${meta.name}${meta.interactive ? ' 🎮' : ''}</option>`;
            }).join('')}
          </select>
          ${specificConfig ? `<div class="mission-config" data-type="${type}">${specificConfig}</div>` : ''}
          <div style="font-size:0.8rem;color:var(--muted);margin-top:4px">
            Interactiva: <span style="color:${metadata.interactive ? 'var(--good)' : 'var(--muted)'}">${metadata.interactive ? 'Sí' : 'No'}</span>
          </div>
        </div>
        <button class="del" data-del="${i}">✕</button>
      </div>`;
      }
    )
    .join("");

  const sectionTabs = `
    <div class="admin-tabs" style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap">
      <button class="ghost admin-tab" data-section="game">📋 Juego</button>
      <button class="ghost admin-tab" data-section="impostor">👿 Impostor</button>
      <button class="ghost admin-tab" data-section="missions">📋 Misiones</button>
      <button class="ghost admin-tab" data-section="sabotage">💥 Sabotajes</button>
      <button class="ghost admin-tab" data-section="map">🗺️ Mapa</button>
      <button class="ghost admin-tab" data-section="meetings">👥 Reuniones</button>
    </div>`;

  const gameSection = `
      <div class="admin-section" data-section="game">
        <label>Tiempo límite (segundos, 0 = sin límite)</label>
        <input id="cfg-timeLimit" type="number" value="${room.timeLimitSec || ''}" placeholder="0" />
      </div>`;

  const impostorSection = `
      <div class="admin-section" data-section="impostor">
        <label>Número de impostores</label>
        <input id="cfg-numImpostors" type="number" min="1" max="2" value="${room.numImpostors || 1}" />
        <label style="margin-top:8px">Enfriamiento eliminar (segundos)</label>
        <input id="cfg-killCooldown" type="number" value="${room.killCooldownSec || 30}" />
      </div>`;

  const missionsSection = `
      <div class="admin-section" data-section="missions">
        <label>Misiones (${missions.length})</label>
        <div id="mission-list">${missionEditor}</div>
        <button class="ghost" id="btn-add-mission" style="margin-bottom:12px">+ Añadir misión</button>
      </div>`;

  const sabotageSection = `
      <div class="admin-section" data-section="sabotage">
        <label>Tipos de sabotaje</label>
        <div class="sabotage-config" style="margin-bottom:10px">
          <label style="font-size:0.85rem;display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="cfg-sab-nfc" data-sab-type="NFC" ${room.sabotageConfig?.NFC?.enabled !== false ? 'checked' : ''} /> NFC
          </label>
          <label style="font-size:0.85rem;display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="cfg-sab-lights" data-sab-type="LIGHTS" ${room.sabotageConfig?.LIGHTS?.enabled !== false ? 'checked' : ''} /> Luces
          </label>
          <label style="font-size:0.85rem;display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="cfg-sab-reactor" data-sab-type="REACTOR" ${room.sabotageConfig?.REACTOR?.enabled !== false ? 'checked' : ''} /> Reactor
          </label>
        </div>
      </div>`;

  const mapSection = `
      <div class="admin-section" data-section="map">
        <label>URL del mapa (o subir PNG abajo)</label>
        <input id="cfg-mapurl" placeholder="https://" value="${room.mapImageUrl && !room.mapImageUrl.startsWith('/uploads') ? escapeHtml(room.mapImageUrl) : ''}" />
        <input id="cfg-mapfile" type="file" accept="image/png" />
        <button class="ghost" id="btn-upload-map" style="margin-top:6px">Subir mapa</button>
      </div>`;

  const meetingsSection = `
      <div class="admin-section" data-section="meetings">
        <label>Tiempo de reunión (segundos)</label>
        <input id="cfg-meeting" type="number" value="${room.meetingSec || 120}" />
      </div>`;

  return `
    <div class="card admin-panel">
      <h3>⚙️ Panel de anfitrión</h3>
      ${sectionTabs}
      ${gameSection}
      ${impostorSection}
      ${missionsSection}
      ${sabotageSection}
      ${mapSection}
      ${meetingsSection}
      
      <div class="admin-actions" style="margin-top:16px">
        <label>📥 Importar/Exportar</label>
        <input id="cfg-import" type="file" accept=".json,application/json" />
        <button class="ghost" id="btn-import">Importar JSON</button>
        <button class="warn" id="btn-save">Guardar configuración</button>
        <button class="good" id="btn-start" style="margin-top:10px">▶ Comenzar partida</button>
        <button class="danger" id="btn-reset" style="margin-top:10px">♻️ Reiniciar sala</button>
      </div>
    </div>
  `;
}

function getMissionConfigFields(mission) {
  const type = mission.type || "GENERIC";
  const config = mission.config || {};
  
  // Try to use missionLoader if loaded
  if (missionLoader.loaded) {
    return missionLoader.getConfigFields(type, config);
  }
  
  // Fallback to hardcoded values
  if (type === "DRAW") {
    const objectsStr = Array.isArray(config.drawObjects) && config.drawObjects.length > 0
      ? config.drawObjects.join(", ")
      : "manzana, perro, gato, casa, árbol, coche";
    return `<label style="margin-top:6px">Objetos para dibujar (separados por coma)</label>
      <input class="m-config-draw-objects" placeholder="Objeto 1, Objeto 2" value="${escapeHtml(objectsStr)}" />`;
  }
  
  if (type === "BRICK") {
    const pattern = config.pattern || ["R", "B", "Y", "G"];
    const patternStr = Array.isArray(pattern) ? pattern.join(", ") : "";
    return `<label style="margin-top:6px">Patrón colores (ej: R, B, Y, G)</label>
      <input class="m-config-pattern" placeholder="R, B, Y, G" value="${escapeHtml(patternStr)}" />`;
  }
  
  if (type === "PHOTO") {
    const objects = config.photoObjects || ["Objeto"];
    const objectsStr = Array.isArray(objects) ? objects.join(", ") : "";
    return `<label style="margin-top:6px">Objetos para foto (separados por coma)</label>
      <input class="m-config-photo-objects" placeholder="Objeto 1, Objeto 2" value="${escapeHtml(objectsStr)}" />`;
  }
  
  if (type === "NFC_TASK") {
    return `<label style="margin-top:6px">ID NFC objetivo</label>
      <input class="m-config-nfc-id" placeholder="ID NFC" value="${escapeHtml(config.nfcId || "")}" />`;
  }
  
  return "";
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
  const myName = ctx.lastName || "—";
  if (rename)
    rename.addEventListener("click", () => {
      const n = prompt("Cambiar tu nombre:", myName);
      if (n && n.trim()) window.AU.renamePlayer(n.trim());
    });

  if (!ctx.isAdmin) return;
  const socket = ctx.socket;

  // Section tabs - only show the first section by default
  const sections = document.querySelectorAll('.admin-section');
  const tabs = document.querySelectorAll('.admin-tab');
  const showSection = (name) => {
    sections.forEach(s => s.classList.toggle('hidden', s.dataset.section !== name));
    tabs.forEach(t => t.classList.toggle('warn', t.dataset.section === name));
  };
  // Set initial selected tab
  tabs.forEach(t => t.classList.remove('warn'));
  const firstTab = tabs[0];
  if (firstTab) firstTab.classList.add('warn');
  // Show only the first section initially
  if (sections.length) {
    const firstSection = sections[0].dataset.section;
    showSection(firstSection);
  }
  // Tab click handlers
  tabs.forEach(tab => {
    tab.addEventListener("click", () => showSection(tab.dataset.section));
  });

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
        <select class="m-type" style="margin-top:4px">
          ${missionTypes.map(t => {
            const meta = getMissionMetadata(t);
            return `<option value="${t}">${meta.name}${meta.interactive ? ' 🎮' : ''}</option>`;
          }).join('')}
        </select>
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

  document.getElementById("btn-export-config")?.addEventListener("click", () => {
    const config = buildConfig();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amongus-config.json';
    a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard?.writeText(json).then(() => window.AU.toast("Config exportada y copiada"));
  });

  document.getElementById("btn-import")?.addEventListener("click", () => {
    const f = document.getElementById("cfg-import").files[0];
    if (!f) return window.AU.toast("Elige un archivo JSON primero.");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        if (config.numImpostors != null) {
          document.getElementById("cfg-numImpostors").value = config.numImpostors;
        }
        if (config.killCooldownSec != null) {
          document.getElementById("cfg-killCooldown").value = config.killCooldownSec;
        }
        if (config.timeLimitSec != null) {
          document.getElementById("cfg-timeLimit").value = config.timeLimitSec;
        }
        if (config.meetingSec != null) {
          document.getElementById("cfg-meeting").value = config.meetingSec;
        }
        if (config.mapImageUrl) {
          document.getElementById("cfg-mapurl").value = config.mapImageUrl;
        }
        if (config.sabotageConfig) {
          if (config.sabotageConfig.NFC?.enabled !== undefined) {
            document.getElementById("cfg-sab-nfc").checked = config.sabotageConfig.NFC.enabled;
          }
          if (config.sabotageConfig.LIGHTS?.enabled !== undefined) {
            document.getElementById("cfg-sab-lights").checked = config.sabotageConfig.LIGHTS.enabled;
          }
          if (config.sabotageConfig.REACTOR?.enabled !== undefined) {
            document.getElementById("cfg-sab-reactor").checked = config.sabotageConfig.REACTOR.enabled;
          }
        }
        const missionList = document.getElementById("mission-list");
        if (config.missions && Array.isArray(config.missions)) {
          missionList.innerHTML = "";
          config.missions.forEach((m, i) => {
            const div = document.createElement("div");
            div.className = "mission-edit";
            div.dataset.i = i;
            const meta = getMissionMetadata(m.type || "GENERIC");
            const specificConfig = getMissionConfigFields(m);
            div.innerHTML = `<div style="flex:1">
              <input class="m-name" placeholder="Nombre" value="${escapeHtml(m.name || "")}" />
              <input class="m-zone" placeholder="Zona" value="${escapeHtml(m.zone || "")}" />
              <input class="m-desc" placeholder="Descripción" value="${escapeHtml(m.desc || "")}" />
              <select class="m-type" style="margin-top:4px">
                ${missionTypes.map(t => {
                  const meta = getMissionMetadata(t);
                  return `<option value="${t}" ${m.type === t || (!m.type && t === 'GENERIC') ? 'selected' : ''}>${meta.name}${meta.interactive ? ' 🎮' : ''}</option>`;
                }).join('')}
              </select>
              ${specificConfig ? `<div class="mission-config" data-type="${m.type}">${specificConfig}</div>` : ''}
            </div><button class="del" data-del="${i}">✕</button>`;
            missionList.appendChild(div);
            div.querySelector(".del").addEventListener("click", () => div.remove());
          });
        }
        window.AU.toast("Config importada. Guarda los cambios.");
      } catch (err) {
        window.AU.toast("Error al parsear JSON: " + err.message);
      }
    };
    reader.readAsText(f);
  });

  document.getElementById("btn-save")?.addEventListener("click", () => {
    const sabotageConfig = {
      NFC: { enabled: document.getElementById("cfg-sab-nfc")?.checked ?? true },
      LIGHTS: { enabled: document.getElementById("cfg-sab-lights")?.checked ?? true },
      REACTOR: { enabled: document.getElementById("cfg-sab-reactor")?.checked ?? true }
    };
    const payload = {
      code: ctx.code,
      adminToken: ctx.adminToken,
      missions: Array.from(document.querySelectorAll(".mission-edit")).map((row) => {
        const type = row.querySelector(".m-type")?.value || "GENERIC";
        let config = {};
        if (missionLoader.loaded) {
          config = missionLoader.collectConfig(type, row) || {};
        } else {
          const drawObjects = row.querySelector(".m-config-draw-objects");
          if (drawObjects) config.drawObjects = drawObjects.value.split(",").map(s => s.trim()).filter(Boolean);
          const pattern = row.querySelector(".m-config-pattern");
          if (pattern) config.pattern = pattern.value.split(",").map(s => s.trim()).filter(Boolean);
          const photoObjects = row.querySelector(".m-config-photo-objects");
          if (photoObjects) config.photoObjects = photoObjects.value.split(",").map(s => s.trim()).filter(Boolean);
          const nfcId = row.querySelector(".m-config-nfc-id");
          if (nfcId) config.nfcId = nfcId.value.trim();
        }
        
        const mission = {
          name: row.querySelector(".m-name").value,
          zone: row.querySelector(".m-zone").value,
          desc: row.querySelector(".m-desc").value,
          type
        };
        if (Object.keys(config).length > 0) mission.config = config;
        return mission;
      }),
      numImpostors: Number(document.getElementById("cfg-numImpostors").value) || 1,
      killCooldownSec: Number(document.getElementById("cfg-killCooldown").value) || 30,
      timeLimitSec: Number(document.getElementById("cfg-timeLimit").value) || 0,
      meetingSec: Number(document.getElementById("cfg-meeting").value) || 120,
      mapImageUrl: document.getElementById("cfg-mapurl").value.trim() || undefined,
      sabotageConfig
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
        if (a && a.error && a.error.includes("al menos 3 jugadores")) {
          // Allow single player test on second click for development
          const btn = document.getElementById("btn-start");
          if (btn && !btn._testClicked) {
            btn._testClicked = true;
            btn.textContent = "▶ Iniciar (desarrollo)";
            window.AU.toast("Presiona de nuevo para iniciar en modo desarrollo");
            // Enable test mode on server
            socket.emit("admin:test-start", { code: ctx.code, adminToken: ctx.adminToken });
            return;
          } else {
            btn._testClicked = false;
            btn.textContent = "▶ Comenzar partida";
          }
        } else if (a && a.error) {
          window.AU.toast(a.error);
        }
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
  const sabotageConfig = {
    NFC: { enabled: document.getElementById("cfg-sab-nfc")?.checked ?? true },
    LIGHTS: { enabled: document.getElementById("cfg-sab-lights")?.checked ?? true },
    REACTOR: { enabled: document.getElementById("cfg-sab-reactor")?.checked ?? true }
  };
  const missions = Array.from(document.querySelectorAll(".mission-edit")).map((row) => {
    const type = row.querySelector(".m-type")?.value || "GENERIC";
    let config = {};
    // Use missionLoader to collect config if loaded
    if (missionLoader.loaded) {
      config = missionLoader.collectConfig(type, row) || {};
    } else {
      // Fallback hardcoded extraction
      const drawTarget = row.querySelector(".m-config-draw-target");
      if (drawTarget) config.drawTarget = drawTarget.value.trim();
      const pattern = row.querySelector(".m-config-pattern");
      if (pattern) config.pattern = pattern.value.split(",").map(s => s.trim()).filter(Boolean);
      const photoObjects = row.querySelector(".m-config-photo-objects");
      if (photoObjects) config.photoObjects = photoObjects.value.split(",").map(s => s.trim()).filter(Boolean);
      const nfcId = row.querySelector(".m-config-nfc-id");
      if (nfcId) config.nfcId = nfcId.value.trim();
    }
    
    const mission = {
      name: row.querySelector(".m-name").value,
      zone: row.querySelector(".m-zone").value,
      desc: row.querySelector(".m-desc").value,
      type
    };
    if (Object.keys(config).length > 0) mission.config = config;
    return mission;
  });
  
  return {
    code: ctx.code,
    adminToken: ctx.adminToken,
    missions,
    numImpostors: Number(document.getElementById("cfg-numImpostors").value) || 1,
    killCooldownSec: Number(document.getElementById("cfg-killCooldown").value) || 30,
    timeLimitSec: Number(document.getElementById("cfg-timeLimit").value) || 0,
    meetingSec: Number(document.getElementById("cfg-meeting").value) || 120,
    mapImageUrl: document.getElementById("cfg-mapurl").value.trim() || undefined,
    sabotageConfig
  };
}

function buildConfig() {
  const missions = Array.from(document.querySelectorAll(".mission-edit")).map((row) => {
    const type = row.querySelector(".m-type")?.value || "GENERIC";
    let config = {};
    // Use missionLoader to collect config if loaded
    if (missionLoader.loaded) {
      config = missionLoader.collectConfig(type, row) || {};
    } else {
      // Fallback hardcoded extraction
      const drawObjects = row.querySelector(".m-config-draw-objects");
      if (drawObjects && drawObjects.value) config.drawObjects = drawObjects.value.split(",").map(s => s.trim()).filter(Boolean);
      const pattern = row.querySelector(".m-config-pattern");
      if (pattern && pattern.value) config.pattern = pattern.value.split(",").map(s => s.trim()).filter(Boolean);
      const photoObjects = row.querySelector(".m-config-photo-objects");
      if (photoObjects && photoObjects.value) config.photoObjects = photoObjects.value.split(",").map(s => s.trim()).filter(Boolean);
      const nfcId = row.querySelector(".m-config-nfc-id");
      if (nfcId && nfcId.value) config.nfcId = nfcId.value.trim();
    }
    
    const mission = {
      name: row.querySelector(".m-name").value,
      zone: row.querySelector(".m-zone").value,
      desc: row.querySelector(".m-desc").value,
      type
    };
    if (Object.keys(config).length > 0) mission.config = config;
    return mission;
  });

  return {
    numImpostors: Number(document.getElementById("cfg-numImpostors").value) || 1,
    killCooldownSec: Number(document.getElementById("cfg-killCooldown").value) || 30,
    timeLimitSec: Number(document.getElementById("cfg-timeLimit").value) || 0,
    meetingSec: Number(document.getElementById("cfg-meeting").value) || 120,
    mapImageUrl: document.getElementById("cfg-mapurl").value.trim() || null,
    sabotageConfig: {
      NFC: { enabled: document.getElementById("cfg-sab-nfc")?.checked ?? true },
      LIGHTS: { enabled: document.getElementById("cfg-sab-lights")?.checked ?? true },
      REACTOR: { enabled: document.getElementById("cfg-sab-reactor")?.checked ?? true }
    },
    missions
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