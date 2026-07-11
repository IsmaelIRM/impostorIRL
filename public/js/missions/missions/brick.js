import { MissionModule, escapeHtml } from '../types.js';

class BrickMission extends MissionModule {
  static type = "BRICK";
  static metadata = {
    name: "Ladrillo", icon: "🧱", defaultInteractive: false
  };

  constructor(mission) {
    super(mission);
    this.pattern = mission.pattern || [];
    this.status = mission.status || "PENDING";
  }

  renderConfigContent() {
    return BrickMission.getConfigFields(this.config);
  }

  static getConfigFields(config = {}) {
    const colorsStr = Array.isArray(config.availableColors) ? config.availableColors.join(", ") : "R, B, Y, G";
    const length = config.blocksLength || 4;
    return `<label style="margin-top:6px">Colores disponibles (ej: R, B, Y, G)</label>
      <input class="m-config-available-colors" placeholder="R, B, Y, G" value="${escapeHtml(colorsStr)}" />
      <label style="margin-top:6px">Número de bloques</label>
      <input class="m-config-blocks-length" type="number" min="1" max="10" value="${length}" />`;
  }

  static collectConfig(mission, row) {
    const colorsInput = row.querySelector(".m-config-available-colors");
    const lengthInput = row.querySelector(".m-config-blocks-length");
    const config = {};
    if (colorsInput && colorsInput.value) {
      config.availableColors = colorsInput.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    }
    if (lengthInput && lengthInput.value) {
      config.blocksLength = Math.max(1, Math.min(10, Number(lengthInput.value)));
    }
    return config;
  }

  renderPopupContent() {
    const patternDisplay = this.pattern.map((color, i) => 
      `<div class="brick-piece ${color.toLowerCase()}" data-brick-index="${i}" style="
        width:40px;height:40px;border-radius:8px;margin:4px;
        background:${this.getColor(color)};
        border:2px solid var(--line);
      "></div>`
    ).join('');

    return `
      <p style="font-size:0.9rem;margin:0 0 10px 0">Orden de colores a reproducir:</p>
      <div style="display:flex;flex-wrap:wrap;justify-content:center">${patternDisplay}</div>
      <button class="good" data-complete-popup="${this.id}" style="margin-top:15px;width:100%">✓ Completar</button>
    `;
  }

  render(ctx) {
    const statusClass = this.status === "DONE" ? "done" : "pending";
    
    return `<div class="mission ${statusClass}" data-mission-id="${this.id}" data-type="${this.type}">
      <div class="meta">Ladrillo · ${this.escapeHtml(this.zone)}</div>
      <div class="title">${this.escapeHtml(this.name)}</div>
    </div>`;
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

  getColor(color) {
    const colors = {
      R: '#ef476f',
      B: '#4cc9f0',
      Y: '#ffd166',
      G: '#06d6a0'
    };
    return colors[color] || '#8aa6c0';
  }
}

export default BrickMission;