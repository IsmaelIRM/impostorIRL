const { v4: uuid } = require("uuid");

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Default 10 missions from the PDF template.
function defaultMissions() {
  return [
    { id: uuid(), name: "Fregar platos", zone: "Cocina", desc: "Lava todos los platos del fregadero." },
    { id: uuid(), name: "Recoger naranjas", zone: "Jardín", desc: "Recoge las naranjas caídas." },
    { id: uuid(), name: "Encender luces", zone: "Pasillo", desc: "Enciende el interruptor de la luz." },
    { id: uuid(), name: "Apilar sillas", zone: "Comedor", desc: "Apila las sillas en la esquina." },
    { id: uuid(), name: "Barrer pasillo", zone: "Pasillo", desc: "Barre todo el pasillo." },
    { id: uuid(), name: "Llenar nevera", zone: "Cocina", desc: "Llena la nevera con las bebidas." },
    { id: uuid(), name: "Sacar basura", zone: "Cocina", desc: "Lleva la basura al contenedor." },
    { id: uuid(), name: "Regar plantas", zone: "Jardín", desc: "Riega todas las plantas." },
    { id: uuid(), name: "Doblar mantas", zone: "Salón", desc: "Dobla las mantas del sofá." },
    { id: uuid(), name: "Mover cajas", zone: "Trastero", desc: "Mueve las cajas al trastero." },
  ];
}

// Assign roles + mission cards to all players in a room.
// crewmate at 0-based ordinal k gets card c=(k%10)+1 with 5 consecutive mission
// indices wrapping modulo M (matches PDF cards #01–#10 for M=10; cycles for >10).
// Impostors get a shuffled sample of ~min(8,M) distinct mission indices (fake tasks).
function assignCards(room) {
  const M = room.missions.length;
  const players = Array.from(room.players.values());
  const shuffled = shuffle(players);

  const numImpostors = Math.max(
    1,
    Math.min(room.numImpostors || 1, Math.min(2, players.length - 1))
  );

  const impostorSet = new Set(shuffled.slice(0, numImpostors).map((p) => p.id));

  let crewOrdinal = 0;
  for (const p of shuffled) {
    p.role = impostorSet.has(p.id) ? "IMPOSTOR" : "CREW";

    let indices;
    let cardId = null;
    if (p.role === "CREW") {
      const c = (crewOrdinal % 10) + 1;
      cardId = c;
      const winLen = Math.min(5, M);
      const start = c - 1; // 0-based start
      indices = [];
      for (let m = 0; m < winLen; m++) {
        indices.push((start + m) % M);
      }
      crewOrdinal++;
    } else {
      const count = Math.min(8, M);
      indices = sample(
        room.missions.map((_, i) => i),
        count
      );
    }

    p.cardId = cardId;
    p.alive = true;
    p.killCooldownUntil = 0;
    p.missions = indices.map((i) => ({
      missionId: room.missions[i].id,
      status: "PENDING",
    }));
  }

  room.numImpostors = numImpostors;
  return room;
}

module.exports = { defaultMissions, assignCards, shuffle };
