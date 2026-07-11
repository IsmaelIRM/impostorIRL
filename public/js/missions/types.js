function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

class MissionModule {
  constructor(mission) {
    this.id = mission.id;
    this.name = mission.name || "";
    this.zone = mission.zone || "";
    this.desc = mission.desc || "";
    this.type = mission.type || "GENERIC";
    this.interactive = mission.interactive || false;
    this.status = mission.status || "PENDING";
    this.config = mission.config || {};
  }

  escapeHtml(s) {
    return escapeHtml(s);
  }

  // Configuration fields for admin panel - override in subclasses (instance method)
  renderConfigContent() {
    return "";
  }

  // Static version for admin panel - takes config object, returns HTML
  static getConfigFields(config = {}) {
    return "";
  }

  // Static method to extract config from DOM elements - override in subclasses
  static collectConfig(mission, row) {
    return {};
  }

  // Static method to generate mission instance data for a player
  // Returns object that gets stored in metadata
  static generateMissionData(config, player) {
    return {};
  }

  // Popup content shown in the mission modal - override in subclasses
  renderPopupContent() {
    return `<button class="good" data-complete-popup="${this.id}">✓ Completar</button>`;
  }

  // Mission box rendering (small preview in grid)
  render(ctx) {
    const statusClass = this.status === "DONE" ? "done" : "pending";
    return `<div class="mission ${statusClass}" data-mission-id="${this.id}">
      <div class="meta">Misión ${(ctx.missionIndex || 0) + 1} / ${ctx.missionsLength || '?'} </div>
      <div class="title">${this.escapeHtml(this.name)}</div>
    </div>`;
  }

  // Interactive screen (modal for specific mission types like DRAW, PHOTO)
  interactiveScreen() {
    return "";
  }

  mount(ctx) {
    // Mount completion button for base class
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

  validateCompletion(data) {
    return true;
  }

  onStatusChange(newStatus) {
    this.status = newStatus;
  }
}

export { MissionModule, escapeHtml };