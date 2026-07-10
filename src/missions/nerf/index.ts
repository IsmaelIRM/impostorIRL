import { Mission } from "../../mission/decorator";

@Mission({
  id: "nerf",
  name: "Nerf",
  isInteractive: true,
  scope: "individual",
})
export class NerfMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";

  manifest = {
    description: "Dispara un objetivo con Nerf",
    schema: {
      type: "object",
      properties: {
        shots: { type: "number", minimum: 1, maximum: 10 },
      },
    },
    default: { shots: 3 },
  };

  assign(player: any, mission: any) {
    return {
      playerId: player.id,
      targetId: null,
      deadline: Date.now() + 180000,
      uuid: Math.random().toString(36).slice(2),
    };
  }

  renderPopup(player: any, assigned: any, mission: any): string {
    return `<div class="mission-popup">
      <h3>Misión: Nerf</h3>
      <p>Jugador: ${player.name}</p>
      <p>Acerta ${mission.config?.shots || 3} disparos.</p>
      <button id="btn-complete-nerf">Marcar completado</button>
    </div>`;
  }
}