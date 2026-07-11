// Shared mission metadata generators
// Used server-side (via src/mission-generators.js) and documented for client modules

const DEFAULT_DRAW_OBJECTS = [
  "manzana", "perro", "gato", "casa", "arbol", "coche",
  "avion", "barco", "reloj", "taza", "libro", "llave",
  "sombrero", "zapatos", "mesa", "silla", "lampara", "puerta",
  "ventana", "flores"
];

// Simple hash function for better distribution across player IDs
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function generateBrickPattern(config, player) {
  const n = Math.max(1, Math.min(10, config.blocksLength || 4));
  const colors = Array.isArray(config.availableColors) ? [...config.availableColors] : [];
  const pattern = [];
  const seed = simpleHash(player.id);
  for (let i = 0; i < n && colors.length > 0; i++) {
    const idx = (seed + i) % colors.length;
    pattern.push(colors.splice(idx, 1)[0]);
  }
  return { pattern };
}

function generatePhotoObject(config, player) {
  if (Array.isArray(config.photoObjects) && config.photoObjects.length > 0) {
    const idx = simpleHash(player.id) % config.photoObjects.length;
    return { assignedObject: config.photoObjects[idx] };
  }
  return {};
}

function generateDrawObject(config, player) {
  const objects = Array.isArray(config.drawObjects) && config.drawObjects.length > 0
    ? config.drawObjects
    : DEFAULT_DRAW_OBJECTS;
  const idx = simpleHash(player.id) % objects.length;
  return { assignedObject: objects[idx] };
}

module.exports = { generateBrickPattern, generatePhotoObject, generateDrawObject, DEFAULT_DRAW_OBJECTS, simpleHash };