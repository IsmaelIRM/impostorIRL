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
      },
    },
    default: { difficulty: "medium" },
  };

  assign(player: Player, mission: MissionType): AssignedMission {
    return {
      playerId: player.id,
      targetId: null,
      deadline: Date.now() + 300000,
      uuid: crypto.randomUUID(),
    };
  }

  renderPopup(player: Player, assigned: AssignedMission): string {
    return `<div>Completa para ${player.name}: <canvas id="draw-${assigned.uuid}"></canvas></div>`;
  }
}