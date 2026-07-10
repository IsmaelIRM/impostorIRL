const fs = require("fs");
const path = require("path");
const fastGlob = require("fast-glob");

class MissionLoader {
  constructor() {
    this.registry = new Map();
  }

  async loadAll() {
    const files = await fastGlob(["src/missions/*/index.js"]);
    for (const file of files) {
      try {
        const mod = require(path.resolve(file));
        const MissionClass = mod.default || mod;
        if (MissionClass && MissionClass.version) {
          this.register(MissionClass);
        }
      } catch (e) {
        console.error("Failed to load mission", file, e.message);
      }
    }
  }

  register(mod) {
    this.registry.set(mod.id, mod);
  }

  get(id) {
    return this.registry.get(id);
  }

  list() {
    return Array.from(this.registry.values()).map((m) => ({
      id: m.id,
      name: m.name,
      isInteractive: m.isInteractive,
      scope: m.scope || "individual",
      endsGame: m.endsGame || false,
      weight: m.weight || 1,
      version: m.version,
      apiVersion: m.apiVersion,
    }));
  }
}

module.exports = { MissionLoader };