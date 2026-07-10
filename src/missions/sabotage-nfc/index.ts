import { Mission } from "../../src/mission/decorator";

@Mission({
  id: "sabotage-nfc",
  name: "Sabotaje NFC",
  isInteractive: true,
  scope: "global",
  endsGame: true,
})
export class SabotageNFCMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";

  manifest = {
    description: "Desactiva un sabotaje NFC escanenado en el mapa",
    schema: {
      type: "object",
      properties: {
        location: { type: "string" },
      },
    },
    default: { location: "ingeniería" },
  };

  onActivate(ctx: any, room: any, mission: any) {
    return {
      active: true,
      endsAt: Date.now() + 300000,
      progress: { scans: 0, required: 3 },
    };
  }

  onProgress(ctx: any, room: any, player: any, data: any) {
    const progress = data.progress || { scans: 0, required: 3 };
    progress.scans = (progress.scans || 0) + 1;
    if (progress.scans >= progress.required) {
      return { active: false, progress: { resolved: true } };
    }
    return { active: true, progress };
  }

  renderPopup(_assigned: any, room: any): string {
    return `<div class="sabotage-popup">
      <h2 class="impostor">🚨 SABOTAGE NFC ACTIVADO</h2>
      <p>Escanea el token NFC en ${room.config?.location || "ingeniería"}</p>
      <p>Progreso: ${room.progress?.scans || 0}/${room.progress?.required || 3}</p>
    </div>`;
  }
}