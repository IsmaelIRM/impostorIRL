class SabotageModule {
  constructor(sabotage) {
    this.id = sabotage.id || crypto.randomUUID();
    this.type = sabotage.type || "GENERIC";
    this.durationSec = sabotage.durationSec || this.constructor.durationSec || 240;
    this.cooldownSec = sabotage.cooldownSec || this.constructor.cooldownSec || 240;
    this.active = sabotage.active || false;
    this.endsAt = sabotage.endsAt || null;
    this.cooldownUntil = sabotage.cooldownUntil || null;
    this.payload = sabotage.payload || {};
  }

  activate() {
    this.active = true;
    this.endsAt = Date.now() + this.durationSec * 1000;
  }

  validateProgress(data) {
    return false;
  }

  getCooldown() {
    return { global: this.cooldownUntil || 0 };
  }

  getPopupContent(ctx) {
    return `<div class="sabotage-popup" style="text-align:center;position:relative">
      <button class="ghost" data-close-sabotage="${this.id}" style="
        position:absolute;top:8px;right:8px;
        width:32px;height:32px;
        border-radius:50%;
        background:var(--impostor);
        color:#fff;
        font-weight:800;
        padding:0;
        line-height:32px;
      ">✕</button>
      <h3 style="margin-right:40px">Sabotaje: ${this.type}</h3>
      <p>${this.payload.instruction || "Resuelve el sabotaje antes de que termine el tiempo."}</p>
      <div class="countdown" data-ends="${this.endsAt}">⏱</div>
    </div>`;
  }

  cleanup() {
    this.active = false;
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { SabotageModule, escapeHtml };