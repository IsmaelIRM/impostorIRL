import { SabotageModule } from '../types.js';

class SingleTargetSabotage extends SabotageModule {
  constructor(sabotage, impostorId) {
    super(sabotage);
    this.impostorId = impostorId;
    this.resolvedBy = new Set();
  }

  activate() {
    super.activate();
    // Set individual cooldown on the impostor
    const cooldownEnd = this.endsAt + (this.cooldownSec * 1000);
    if (!this.payload.cooldowns) this.payload.cooldowns = {};
    this.payload.cooldowns[this.impostorId] = cooldownEnd;
  }

  validateProgress({ playerId }) {
    if (!this.active) return false;
    this.resolvedBy.add(playerId);
    // Check if required number of players resolved
    return this.resolvedBy.size >= this.requiredPlayers;
  }

  getCooldown() {
    const cooldowns = this.payload.cooldowns || {};
    return { [this.impostorId]: cooldowns[this.impostorId] || 0 };
  }
}

export default SingleTargetSabotage;