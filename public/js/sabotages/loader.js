import { SabotageModule } from './types.js';
import GlobalSabotage from './types/global.js';
import SingleTargetSabotage from './types/single.js';
import NFCSabotage from './types/nfc.js';

// Metadata for sabotage types displayed in the role modal
const sabotageMetadata = {
  NFC: { name: "Reparación NFC", icon: "📱", duration: 240, cooldown: 240 },
  LIGHTS: { name: "Luces apagadas", icon: "💡", duration: 120, cooldown: 180 },
  REACTOR: { name: "Reactor crítico", icon: "⚠️", duration: 180, cooldown: 240 }
};

// Set metadata on the NFC class
NFCSabotage.metadata = sabotageMetadata.NFC;
GlobalSabotage.metadata = sabotageMetadata.NFC;

const sabotageTypes = {
  GENERIC: SabotageModule,
  GLOBAL: GlobalSabotage,
  SINGLE: SingleTargetSabotage,
  NFC: NFCSabotage,
  LIGHTS: GlobalSabotage,
  REACTOR: GlobalSabotage
};

function createSabotageCtx(sabotage, ctx) {
  // Create sabotage instance based on type
  const SabotageClass = sabotageTypes[sabotage.type] || SabotageModule;
  const instance = sabotage.impostorId 
    ? new SabotageClass(sabotage, sabotage.impostorId) 
    : new SabotageClass(sabotage);
  // Merge ctx for mount
  return instance;
}

class SabotageLoader {
  constructor() {
    this.sabotages = new Map();
    this.roomCooldowns = new Map(); // room.code -> expiresAt
    this.manifest = null;
    this.loaded = true; // All types are statically imported
  }

  async loadManifest() {
    // For sabotages, types are statically imported, no dynamic loading needed
    this.manifest = { sabotages: Object.keys(sabotageTypes) };
    return this.manifest;
  }

  async loadAllSabotages() {
    if (this.loaded) return Object.keys(sabotageTypes);
    this.loaded = true;
    return Object.keys(sabotageTypes);
  }

  validateContract(SabotageClass) {
    if (typeof SabotageClass !== 'function') return false;
    return typeof SabotageClass.prototype?.render === 'function' ||
           typeof SabotageClass.prototype?.getPopupContent === 'function';
  }

  createSabotage(type, data, impostorId) {
    const SabotageClass = sabotageTypes[type] || SabotageModule;
    const instance = impostorId 
      ? new SabotageClass(data, impostorId) 
      : new SabotageClass(data);
    this.sabotages.set(instance.id, instance);
    return instance;
  }

  getSabotage(id) {
    return this.sabotages.get(id);
  }

  canActivate(type, roomCode) {
    const cooldown = this.roomCooldowns.get(roomCode) || 0;
    return Date.now() > cooldown;
  }

  setCooldown(roomCode, durationSec) {
    this.roomCooldowns.set(roomCode, Date.now() + durationSec * 1000);
  }

  getAvailableTypes() {
    return this.loaded ? Object.keys(sabotageTypes) : ['GENERIC'];
  }

  getMetadata(type) {
    if (sabotageTypes[type]?.metadata) {
      return sabotageTypes[type].metadata;
    }
    return sabotageMetadata[type] || {};
  }

  // Public method to register new sabotages at runtime
  registerSabotage(id, SabotageClass) {
    if (this.validateContract(SabotageClass)) {
      sabotageTypes[id] = SabotageClass;
      this.loaded = true;
      return true;
    }
    console.warn(`Failed to register sabotage: invalid contract for ${id}`);
    return false;
  }
}

const sabotageLoader = new SabotageLoader();

export { sabotageMetadata, sabotageLoader, SabotageLoader, sabotageTypes };
export { createSabotageCtx, SabotageModule, GlobalSabotage, SingleTargetSabotage, NFCSabotage };