import { MissionModule } from './types.js';

class MissionLoader {
  constructor() {
    this.missions = new Map();
    this.manifest = null;
    this.loaded = false;
  }

  async loadManifest() {
    try {
      const res = await fetch('/js/missions/manifest.json');
      if (!res.ok) throw new Error('Manifest not found');
      this.manifest = await res.json();
      return this.manifest;
    } catch (e) {
      console.warn('Using fallback manifest:', e.message);
      this.manifest = { missions: [] };
      return this.manifest;
    }
  }

  async discoverMissions() {
    // Dynamically discover all missions in the ./missions/ directory
    // This relies on manifest.json being present (generated at build time)
    const discovered = [];
    
    if (!this.manifest) await this.loadManifest();
    
    for (const m of this.manifest.missions) {
      discovered.push(m.id);
    }
    
    return discovered;
  }

  async loadAllMissions() {
    if (this.loaded) return Array.from(this.missions.keys());
    
    await this.loadManifest();
    
    // Register base GENERIC type
    this.missions.set('GENERIC', MissionModule);
    
    // Load each mission dynamically
    for (const m of this.manifest.missions) {
      if (m.id === 'GENERIC') continue;
      
      try {
        const modulePath = m.path || `./missions/${m.id.toLowerCase()}.js`;
        const module = await import(modulePath);
        const MissionClass = module.default;
        
        if (this.validateContract(MissionClass)) {
          this.missions.set(m.id, MissionClass);
        } else {
          console.warn(`Invalid contract for mission: ${m.id}`);
          this.missions.set(m.id, MissionModule);
        }
      } catch (e) {
        console.warn(`Failed to load mission ${m.id}, using fallback:`, e.message);
        this.missions.set(m.id, MissionModule);
      }
    }
    
    this.loaded = true;
    return Array.from(this.missions.keys());
  }

  validateContract(MissionClass) {
    if (typeof MissionClass !== 'function') return false;
    return typeof MissionClass.prototype?.render === 'function' &&
           typeof MissionClass.prototype?.mount === 'function';
  }

  createMission(type, data) {
    const MissionClass = this.missions.get(type);
    if (!MissionClass) {
      console.warn(`Unknown mission type: ${type}, falling back to MissionModule`);
      return new MissionModule({ ...data, type });
    }
    return new MissionClass(data);
  }

  getAvailableTypes() {
    return this.loaded ? Array.from(this.missions.keys()) : ['GENERIC'];
  }

  getMetadata(type) {
    const MissionClass = this.missions.get(type);
    return MissionClass?.metadata || {};
  }

  // Get config fields HTML for admin panel
  getConfigFields(type, config = {}) {
    const MissionClass = this.missions.get(type);
    if (MissionClass && typeof MissionClass.getConfigFields === 'function') {
      return MissionClass.getConfigFields(config);
    }
    return "";
  }

  // Collect config from DOM element
  collectConfig(type, row) {
    const MissionClass = this.missions.get(type);
    if (MissionClass && typeof MissionClass.collectConfig === 'function') {
      return MissionClass.collectConfig(null, row);
    }
    return {};
  }

  // Public method to register new missions at runtime
  registerMission(id, MissionClass) {
    if (this.validateContract(MissionClass)) {
      this.missions.set(id, MissionClass);
      this.loaded = true;
      return true;
    }
    console.warn(`Failed to register mission: invalid contract for ${id}`);
    return false;
  }
}

const missionLoader = new MissionLoader();

export { missionLoader, MissionLoader };