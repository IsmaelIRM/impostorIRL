import { MissionModule, escapeHtml } from '../types.js';

class PhotoMission extends MissionModule {
  static type = "PHOTO";
  static metadata = {
    name: "Foto", icon: "📸", defaultInteractive: true
  };

  constructor(mission) {
    super(mission);
    this.photoObjects = mission.config?.photoObjects || ["Objeto"];
    this.assignedObject = mission.assignedObject || null;
    this.status = mission.status || "PENDING";
  }

  renderConfigContent() {
    return PhotoMission.getConfigFields(this.config);
  }

  static getConfigFields(config = {}) {
    const objectsStr = Array.isArray(config.photoObjects) ? config.photoObjects.join(", ") : "";
    return `<label style="margin-top:6px">Objetos para foto (separados por coma)</label>
      <input class="m-config-photo-objects" placeholder="Objeto 1, Objeto 2" value="${escapeHtml(objectsStr)}" />`;
  }

  static collectConfig(mission, row) {
    const input = row.querySelector(".m-config-photo-objects");
    const config = {};
    if (input && input.value) {
      config.photoObjects = input.value.split(",").map(o => o.trim()).filter(Boolean);
    }
    return config;
  }

  interactiveScreen() {
    return `
      <div id="photo-modal" class="modal hidden">
        <div class="card">
          <h3>Hazte una foto con: <span id="photo-target"></span></h3>
          <video id="photo-preview" autoplay playsinline style="width:100%;max-width:300px;background:#000;border-radius:8px;"></video>
          <canvas id="photo-canvas" style="display:none;"></canvas>
          <div class="row" style="margin-top:10px">
            <button class="ghost" id="photo-cancel">Cancelar</button>
            <button class="good" id="photo-take">📸 Tomar foto</button>
          </div>
          <div id="photo-result" style="margin-top:10px;display:none;">
            <img id="photo-img" style="width:100%;border-radius:8px;" />
          </div>
        </div>
      </div>
    `;
  }

  render(ctx) {
    const statusClass = this.status === "DONE" ? "done" : "pending";
    
    return `<div class="mission ${statusClass}" data-mission-id="${this.id}" data-type="${this.type}">
      <div class="meta">Foto · ${this.escapeHtml(this.zone)}</div>
      <div class="title">${this.escapeHtml(this.name)}</div>
    </div>`;
  }

  renderPopupContent() {
    return `<button class="ghost" data-open-photo="${this.id}">📸 Abrir cámara</button>`;
  }

  mount(ctx) {
    const photoBtn = document.querySelector(`[data-open-photo="${this.id}"]`);
    if (photoBtn) {
      photoBtn.addEventListener('click', () => this.openCamera(ctx));
    }
  }

  async openCamera(ctx) {
    const modal = document.getElementById('photo-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.dataset.missionId = this.id;
      document.getElementById('photo-target').textContent = this.assignedObject;
      const video = document.getElementById('photo-preview');
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
      } catch (e) {
        this.toast('No se pudo acceder a la cámara');
      }
    }
  }

  toast(msg) {
    const el = document.getElementById("toast");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
      setTimeout(() => el.classList.add("hidden"), 2500);
    }
  }
}

export default PhotoMission;