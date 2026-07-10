import { Mission } from "../../src/mission/decorator";

@Mission({
  id: "sabotage-core",
  name: "Sabotaje del Núcleo",
  isInteractive: true,
  scope: "global",
  endsGame: true,
})
export class SabotageCoreMission {
  static version = "1.0.0";
  static apiVersion = "1.0.0";

  manifest = {
    description: "Reinicia el núcleo del reactor",
    schema: {
      type: "object",
      properties: {
        sequenceLength: { type: "number", minimum: 3, maximum: 10 },
      },
    },
    default: { sequenceLength: 5 },
  };

  onActivate(ctx: any, room: any, mission: any) {
    return {
      active: true,
      endsAt: Date.now() + 300000,
      progress: { sequence: Array.from({ length: 5 }, () => Math.floor(Math.random() * 4)) },
    };
  }

  onProgress(ctx: any, room: any, player: any, data: any) {
    // Validate sequence input
    const sequence = room.progress?.sequence || [];
    const input = data.input || [];
    if (JSON.stringify(sequence) === JSON.stringify(input)) {
      return { active: false, progress: { resolved: true } };
    }
    return { active: true, progress: room.progress };
  }

  renderPopup(_assigned: any, room: any): string {
    return `<div class="sabotage-popup">
      <h2 class="impostor">🚨 SABOTAGE DEL NÚCLEO</h2>
      <p>Reproduce la secuencia correcta antes de que se acabe el tiempo</p>
      <p>Tiempo restante: <span id="timer">300</span>s</p>
    </div>`;
  }
}