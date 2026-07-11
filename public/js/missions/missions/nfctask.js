import { MissionModule, escapeHtml } from '../types.js';
import { startNFCRead, isNFCSupported } from '../../nfc-reader.js';

class NFCTaskMission extends MissionModule {
  static type = "NFC_TASK";
  static metadata = {
    name: "Tarea NFC", icon: "📱", defaultInteractive: true
  };

  constructor(mission) {
    super(mission);
    this.nfcId = mission.config?.nfcId || "";
    this.status = mission.status || "PENDING";
  }

  renderConfigContent() {
    return NFCTaskMission.getConfigFields(this.config);
  }

  static getConfigFields(config = {}) {
    return `<label style="margin-top:6px">ID NFC objetivo</label>
      <input class="m-config-nfc-id" placeholder="ID NFC" value="${escapeHtml(config.nfcId || "")}" />`;
  }

  static collectConfig(mission, row) {
    const input = row.querySelector(".m-config-nfc-id");
    const config = {};
    if (input && input.value) config.nfcId = input.value.trim();
    return config;
  }

  render(ctx) {
    const statusClass = this.status === "DONE" ? "done" : "pending";
    
    return `<div class="mission ${statusClass}" data-mission-id="${this.id}" data-type="${this.type}">
      <div class="meta">Tarea NFC · ${this.escapeHtml(this.zone)}</div>
      <div class="title">${this.escapeHtml(this.name)}</div>
    </div>`;
  }

  renderPopupContent() {
    const supportText = isNFCSupported() 
      ? 'Acércate una etiqueta NFC para completar la tarea.' 
      : 'NFC no disponible. Necesitas Chrome en Android.';
    
    return `<div style="text-align:center">
      <p style="font-size:0.9rem;margin:10px 0">${supportText}</p>
      <button class="good" id="nfc-task-btn" style="margin-top:10px;width:100%" ${!isNFCSupported() ? 'disabled' : ''}>Leer etiqueta NFC</button>
      ${!isNFCSupported() ? `<button class="ghost" id="nfc-mock-btn" style="margin-top:6px;width:100%;font-size:0.8rem">Simular (desarrollo)</button>` : ''}
    </div>`;
  }

  async mount(ctx) {
    // Real NFC button
    const nfcBtn = document.getElementById('nfc-task-btn');
    if (nfcBtn && isNFCSupported()) {
      nfcBtn.addEventListener('click', async () => {
        try {
          const nfcData = await startNFCRead();
          document.getElementById(`mission-modal-${this.id}`)?.classList.add('hidden');
          ctx.socket.emit("task:toggle", {
            code: ctx.code,
            sessionToken: ctx.sessionToken,
            missionId: this.id,
            nfcData: nfcData
          });
        } catch (error) {
          console.log('NFC task cancelled or failed');
        }
      });
    }
    
    // Mock button for testing
    const mockBtn = document.getElementById('nfc-mock-btn');
    if (mockBtn) {
      mockBtn.addEventListener('click', () => {
        const mockData = {
          serialNumber: 'TEST-' + Math.random().toString(36).slice(2, 8),
          content: 'Mock NFC Tag'
        };
        document.getElementById(`mission-modal-${this.id}`)?.classList.add('hidden');
        ctx.socket.emit("task:toggle", {
          code: ctx.code,
          sessionToken: ctx.sessionToken,
          missionId: this.id,
          nfcData: mockData
        });
      });
    }
  }
}

export default NFCTaskMission;