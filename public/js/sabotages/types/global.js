import { SabotageModule } from '../types.js';

class GlobalSabotage extends SabotageModule {
  constructor(sabotage) {
    super(sabotage);
    this.scannedBy = [];
  }

  activate() {
    super.activate();
    this.cooldownUntil = this.endsAt;
  }

  validateProgress(data) {
    if (!this.active) return false;
    this.scannedBy.push(data);
    return this.checkResolution();
  }

  checkResolution() {
    // Override in subclasses
    return false;
  }

  getCooldown() {
    return { global: this.cooldownUntil || 0 };
  }
}

export default GlobalSabotage;