module.exports = {
  id: "brick",
  name: "Ladrillo",
  isInteractive: true,
  scope: "individual",
  endsGame: false,
  weight: 2,
  version: "1.0.0",
  apiVersion: "1.0.0",
  manifest: {
    description: "Apila ladrillos",
    schema: {
      type: "object",
      properties: {
        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
      },
    },
  },
};