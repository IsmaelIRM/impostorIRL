import { Mission } from "../../src/mission/decorator";

@Mission({
  id: "pool",
  name: "Piscina",
  isInteractive: true,
  scope: "individual",
})
export class PoolMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";

  manifest = {
    description: "Busca un objeto en la piscina",
    schema: {
      type: "object",
      properties: {
        objectsToFind: { type: "number", minimum: 1, maximum: 10 },
      },
    },
    default: { objectsToFind: 3 },
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
      <h3>Misión: Piscina</h3>
      <p>Jugador: ${player.name}</p>
      <p>Encuentra ${mission.config?.objectsToFind || 3} objetos.</p>
      <button id="btn-complete-pool">Marcar completado</button>
    </div>`;
  }
}