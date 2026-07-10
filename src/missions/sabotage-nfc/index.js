module.exports = {
  id: "sabotage-nfc",
  name: "Sabotaje NFC",
  isInteractive: true,
  scope: "global",
  endsGame: true,
  weight: 1,
  version: "1.0.0",
  apiVersion: "1.0.0",
  manifest: {
    description: "Escanea todos los NFC",
    schema: {
      type: "object",
      properties: {
        timeLimit: { type: "number", default: 300 },
      },
    },
  },
};