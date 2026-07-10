import { Mission } from "../../src/mission/decorator";

@Mission({
  id: "brick",
  name: "Ladrillo",
  isInteractive: true,
  scope: "individual",
})
export class BrickMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";

  manifest = {
    description: "Construye una torre de ladrillos",
    schema: {
      type: "object",
      properties: {
        height: { type: "number", minimum: 5, maximum: 20 },
        colors: { type: "array", items: { type: "string" } },
      },
    },
    default: { height: 10, colors: ["red", "blue", "yellow"] },
  };

  assign(player: any, mission: any) {
    return {
      playerId: player.id,
      targetId: null,
      deadline: Date.now() + 600000,
      uuid: Math.random().toString(36).slice(2),
    };
  }

  renderPopup(player: any, assigned: any, mission: any): string {
    return `<div class="mission-popup">
      <h3>Misión: Ladrillo</h3>
      <p>Jugador: ${player.name}</p>
      <p>Construye una torre de ${player.name} con ${mission.config?.colors?.length || 3} colores.</p>
      <button id="btn-complete-brick">Marcar completado</button>
    </div>`;
  }
}