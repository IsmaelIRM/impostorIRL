import { Mission } from "../../src/mission/decorator";
import { Player, Mission as MissionType, AssignedMission } from "../../src/mission/types";

@Mission({
  id: "draw",
  name: "Dibujar",
  isInteractive: true,
  scope: "individual",
})
export class DrawMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";

  manifest = {
    description: "Completa un dibujo en 5 minutos",
    schema: {
      type: "object",
      properties: {
        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        timeSeconds: { type: "number", minimum: 30, maximum: 600 },
      },
    },
    default: { difficulty: "medium", timeSeconds: 300 },
  };

  assign(player: Player, mission: MissionType): AssignedMission {
    return {
      playerId: player.id,
      targetId: null,
      deadline: Date.now() + (mission.config?.timeSeconds || 300) * 1000,
      uuid: (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
    };
  }

  renderPopup(player: Player, assigned: AssignedMission): string {
    return `<div class="mission-popup">
      <h3>Misión: Dibujar</h3>
      <p>Jugador: ${player.name}</p>
      <canvas id="draw-${assigned.uuid}" width="200" height="200" style="border:1px solid #ccc;"></canvas>
    </div>`;
  }
}