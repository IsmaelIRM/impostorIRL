import { MissionModule, escapeHtml } from '../types.js';

class DrawMission extends MissionModule {
  static type = "DRAW";
  static metadata = {
    name: "Dibujo", icon: "🎨", defaultInteractive: true
  };

  constructor(mission) {
    super(mission);
    this.drawTarget = mission.config?.drawTarget || "";
    this.status = mission.status || "PENDING";
  }

  renderConfigContent() {
    return DrawMission.getConfigFields(this.config);
  }

  static getConfigFields(config = {}) {
    return `<label style="margin-top:6px">Dibujar objeto</label>
      <input class="m-config-draw-target" placeholder="Objeto a dibujar" value="${escapeHtml(config.drawTarget || "")}" />`;
  }

  static collectConfig(mission, row) {
    const input = row.querySelector(".m-config-draw-target");
    const config = {};
    if (input && input.value) config.drawTarget = input.value.trim();
    return config;
  }

  interactiveScreen() {
    return `
      <div id="draw-modal" class="modal hidden">
        <div class="card">
          <h3>Dibuja: <span id="draw-target"></span></h3>
          <canvas id="draw-canvas" width="300" height="300" style="border:2px solid var(--line);background:#fff;border-radius:8px;"></canvas>
          <div class="row" style="margin-top:10px">
            <button class="ghost" id="draw-clear">Limpiar</button>
            <button class="good" id="draw-done">✓ Listo</button>
          </div>
        </div>
      </div>
    `;
  }

  render(ctx) {
    const statusClass = this.status === "DONE" ? "done" : "pending";
    
    return `<div class="mission ${statusClass}" data-mission-id="${this.id}" data-type="${this.type}">
      <div class="meta">Dibujo · ${this.escapeHtml(this.zone)}</div>
      <div class="title">${this.escapeHtml(this.name)}</div>
    </div>`;
  }

  renderPopupContent() {
    return `<button class="ghost" data-open-draw="${this.id}">🎨 Abrir dibujo</button>`;
  }

  mount(ctx) {
    const drawBtn = document.querySelector(`[data-open-draw="${this.id}"]`);
    if (drawBtn) {
      drawBtn.addEventListener('click', () => this.openInteractive(ctx));
    }
  }

  openInteractive(ctx) {
    const modal = document.getElementById('draw-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.dataset.missionId = this.id;
      document.getElementById('draw-target').textContent = this.drawTarget;
      this.initCanvas();
    }
  }

  initCanvas() {
    const canvas = document.getElementById('draw-canvas');
    if (!canvas) return;
    
    const ctx2d = canvas.getContext('2d');
    let drawing = false;
    
    // Clear canvas on open
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    
    canvas.addEventListener('mousedown', (e) => {
      drawing = true;
      ctx2d.lineWidth = 3;
      ctx2d.lineCap = 'round';
      ctx2d.strokeStyle = '#000';
      ctx2d.beginPath();
      const rect = canvas.getBoundingClientRect();
      ctx2d.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });
    
    canvas.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      ctx2d.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx2d.stroke();
    });
    
    document.getElementById('draw-clear')?.addEventListener('click', () => {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    });
  }
}

export default DrawMission;