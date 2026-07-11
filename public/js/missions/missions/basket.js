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
    
    return `<div class="mission ${statusClass}" data-mission-id="${this.id}" data-type="${this.type}">
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