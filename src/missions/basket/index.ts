import { Mission } from "../../mission/decorator";

@Mission({
  id: "basket",
  name: "Canasta",
  isInteractive: true,
  scope: "individual",
})
export class BasketMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";

  manifest = {
    description: "Lanza bolitas en una canasta",
    schema: {
      type: "object",
      properties: {
        targetScore: { type: "number", minimum: 1, maximum: 20 },
      },
    },
    default: { targetScore: 5 },
  };

  assign(player: any, mission: any) {
    return {
      playerId: player.id,
      targetId: null,
      deadline: Date.now() + 300000,
      uuid: Math.random().toString(36).slice(2),
    };
  }

  renderPopup(player: any, assigned: any, mission: any): string {
    return `<div class="mission-popup">
      <h3>Misión: Canasta</h3>
      <p>Jugador: ${player.name}</p>
      <p>Anota ${mission.config?.targetScore || 5} puntos.</p>
      <button id="btn-complete-basket">Marcar completado</button>
    </div>`;
  }
}