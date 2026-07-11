import { SabotageModule } from '../types.js';
import { startNFCRead, isNFCSupported } from '../../nfc-reader.js';

class NFCSabotage extends SabotageModule {
  static type = "NFC";
  static durationSec = 240;
  static cooldownSec = 240;
  static metadata = {
    name: "Reparación NFC",
    icon: "📱",
    defaultZones: 2
  };

  constructor(sabotage) {
    super(sabotage);
    this.targetZones = sabotage.zones || sabotage.targetZones || ["Pasillo", "Cocina"];
    this.scannedBy = [];
  }

  activate() {
    super.activate();
    this.cooldownUntil = this.endsAt + this.cooldownSec * 1000;
  }

  validateProgress({ playerId, zone, timestamp }) {
    if (!this.active) return false;
    
    this.scannedBy.push({ playerId, zone, timestamp });
    
    const sorted = [...this.scannedBy].sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = sorted[i+1].timestamp - sorted[i].timestamp;
      const zonesMatch = sorted[i].zone !== sorted[i+1].zone;
      const playersMatch = sorted[i].playerId !== sorted[i+1].playerId;
      
      if (diff <= 10000 && zonesMatch && playersMatch) {
        this.cleanup();
        return true;
      }
    }
    return false;
  }

  checkResolution() {
    const sorted = [...this.scannedBy].sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = sorted[i+1].timestamp - sorted[i].timestamp;
      if (diff <= 10000 && sorted[i].playerId !== sorted[i+1].playerId) {
        return true;
      }
    }
    return false;
  }

  getPopupContent(ctx) {
    const supportInfo = isNFCSupported() 
      ? 'Toque el botón y acerque una etiqueta NFC.' 
      : 'NFC no disponible. Usa Chrome en Android.';
    
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
      <h3 style="margin-right:40px">🚨 Sabotaje: Reparación NFC</h3>
      <p>${supportInfo}</p>
      <p class="tiny">Zonas objetivo: ${this.targetZones.join(', ')}</p>
      <div class="countdown" data-ends="${this.endsAt}" style="font-size:1.5rem">⏱ <span id="sab-cd">--</span>s</div>
      <button class="good" id="sab-nfc-scan" style="margin-top:10px;width:100%" ${!isNFCSupported() ? 'disabled' : ''}>Escanear NFC ahora</button>
      ${!isNFCSupported() ? `<button class="ghost" id="sab-nfc-mock" style="margin-top:6px;width:100%;font-size:0.8rem">Simular escaneo (desarrollo)</button>` : ''}
    </div>`;
  }

  mount(ctx) {
    // Real NFC scan button
    const scanBtn = document.getElementById('sab-nfc-scan');
    if (scanBtn && isNFCSupported()) {
      scanBtn.addEventListener('click', async () => {
        try {
          const nfcData = await startNFCRead();
          ctx.socket.emit('sabotage:nfcScan', {
            code: ctx.code,
            sessionToken: ctx.sessionToken,
            sabotageId: this.id,
            zone: this.targetZones[0],
            nfcContent: nfcData.content || nfcData.serialNumber
          });
        } catch (error) {
          console.log('NFC cancelled or failed');
        }
      });
    }
    
    // Mock button for testing
    const mockBtn = document.getElementById('sab-nfc-mock');
    if (mockBtn) {
      mockBtn.addEventListener('click', () => {
        ctx.socket.emit('sabotage:nfcScan', {
          code: ctx.code,
          sessionToken: ctx.sessionToken,
          sabotageId: this.id,
          zone: this.targetZones[0],
          nfcContent: 'mock-tag-' + Math.random().toString(36).slice(2, 8)
        });
      });
    }
    
    // Close button handler
    const closeBtn = document.querySelector(`[data-close-sabotage="${this.id}"]`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('sabotage-modal')?.classList.add('hidden');
      });
    }
  }
}

export default NFCSabotage;