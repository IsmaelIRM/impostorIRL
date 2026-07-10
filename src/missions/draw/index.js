// Simple mission descriptor for Node.js compatibility
module.exports = {
  id: "draw",
  name: "Dibujar",
  isInteractive: true,
  scope: "individual",
  endsGame: false,
  weight: 1,
  version: "1.0.0",
  apiVersion: "1.0.0",
  manifest: {
    description: "Completa un dibujo",
    schema: {
      type: "object",
      properties: {
        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
      },
    },
  },
  assign(player, mission) {
    return {
      playerId: player.id,
      targetId: null,
      deadline: Date.now() + 300000,
      uuid: Math.random().toString(36).slice(2),
    };
  },
  renderPopup(player, assigned) {
    return `<div>Completa: ${player.name}</div>`;
  },
};