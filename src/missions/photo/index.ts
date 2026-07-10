import { Mission } from "../../mission/decorator";

@Mission({
  id: "photo",
  name: "Foto",
  isInteractive: true,
  scope: "individual",
})
export class PhotoMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";

  manifest = {
    description: "Toma una foto en un lugar específico",
    schema: {
      type: "object",
      properties: {
        location: { type: "string" },
        objectCount: { type: "number", minimum: 1, maximum: 5 },
      },
    },
    default: { location: "recepción", objectCount: 3 },
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
      <h3>Misión: Foto</h3>
      <p>Jugador: ${player.name}</p>
      <p>Ubicación: ${mission.config?.location || "recepción"}</p>
      <input type="file" accept="image/*" id="photo-input" />
      <button id="btn-complete-photo">Enviar foto</button>
    </div>`;
  }
}