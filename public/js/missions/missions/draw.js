import { MissionModule, escapeHtml } from '../types.js';

class DrawMission extends MissionModule {
  static type = "DRAW";
  static metadata = {
    name: "Dibujo", icon: "🎨", defaultInteractive: false
  };

  constructor(mission) {
    super(mission);
    this.assignedObject = mission.metadata?.assignedObject || null;
    this.status = mission.status || "PENDING";
  }

  renderConfigContent() {
    return DrawMission.getConfigFields(this.config);
  }

  static getConfigFields(config = {}) {
    const objectsStr = Array.isArray(config.drawObjects) ? config.drawObjects.join(", ") : "";
    return `<label style="margin-top:6px">Objetos para dibujar (separados por coma)</label>
      <input class="m-config-draw-objects" placeholder="Objeto 1, Objeto 2" value="${escapeHtml(objectsStr)}" />`;
  }

  static collectConfig(mission, row) {
    const input = row.querySelector(".m-config-draw-objects");
    const config = {};
    if (input && input.value) {
      config.drawObjects = input.value.split(",").map(o => o.trim()).filter(Boolean);
    }
    return config;
  }

  // Document what instance data this mission generates
  // Used by server-side registry in src/cards.js
  static getMetadataSpec() {
    return {
      assignedObject: "single object randomly selected from drawObjects config array"
    };
  }

  render(ctx) {
    const statusClass = this.status === "DONE" ? "done" : "pending";
    
    return `<div class="mission ${statusClass}" data-mission-id="${this.id}" data-type="${this.type}">
      <div class="meta">Dibujo · ${this.escapeHtml(this.zone)}</div>
      <div class="title">${this.escapeHtml(this.name)}</div>
    </div>`;
  }

  renderPopupContent() {
    const desc = this.assignedObject
      ? `<p style="font-size:0.9rem;margin:0 0 10px 0">Dibuja: <strong>${this.escapeHtml(this.assignedObject)}</strong></p>`
      : `<p style="font-size:0.9rem;margin:0 0 10px 0">Tarea de dibujo</p>`;
    return `${desc}<button class="good" data-complete-popup="${this.id}">✓ Completar</button>`;
  }

  mount(ctx) {
    const completeBtn = document.querySelector(`[data-complete-popup="${this.id}"]`);
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        ctx.socket.emit("task:toggle", {
          code: ctx.code,
          sessionToken: ctx.sessionToken,
          missionId: this.id,
        });
      });
    }
  }
}

export default DrawMission;