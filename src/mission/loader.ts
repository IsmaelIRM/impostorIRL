import { Injectable, OnModuleInit } from "@nestjs/common";
import FastGlob from "fast-glob";
import { MissionDefinition } from "./types";

interface MissionMetadata {
  id: string;
  name: string;
  isInteractive: boolean;
  scope: string;
  endsGame: boolean;
  weight: number;
  version: string;
  apiVersion: string;
  description?: string;
  schema?: Record<string, any>;
}

@Injectable()
export class MissionLoader implements OnModuleInit {
  private registry = new Map<string, MissionDefinition>();

  async onModuleInit() {
    await this.loadAll();
  }

  async loadAll() {
    const fastGlob = FastGlob as any;
    const files = await fastGlob(["src/missions/*/index.ts"]);
    for (const file of files) {
      const mod = await import(file);
      const MissionClass: any = mod.default || Object.values(mod).find((c: any) => c.version);
      if (MissionClass) {
        const meta = MissionClass.prototype._missionMeta;
        const definition: MissionDefinition = {
          id: meta.id,
          name: meta.name || MissionClass.name,
          isInteractive: meta.isInteractive,
          scope: meta.scope || "individual",
          endsGame: meta.endsGame || false,
          weight: meta.weight || 1,
          version: MissionClass.version,
          apiVersion: MissionClass.apiVersion,
          ...(MissionClass.manifest && {
            description: MissionClass.manifest.description,
            schema: MissionClass.manifest.schema,
          }),
          assign: MissionClass.prototype.assign?.bind(MissionClass),
          renderPopup: MissionClass.prototype.renderPopup?.bind(MissionClass),
        };
        this.register(definition);
      }
    }
  }

  register(mod: MissionDefinition): void {
    this.registry.set(mod.id, mod);
  }

  get(id: string): MissionDefinition | undefined {
    return this.registry.get(id);
  }

  list(): MissionMetadata[] {
    return Array.from(this.registry.values()).map((m) => ({
      id: m.id,
      name: m.name,
      isInteractive: m.isInteractive,
      scope: m.scope,
      endsGame: m.endsGame,
      weight: m.weight,
      version: m.version,
      apiVersion: m.apiVersion,
      description: m.description,
      schema: m.schema,
    }));
  }
}