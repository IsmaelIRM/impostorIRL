// Shared mission metadata generators
// Used server-side (via src/mission-generators.js) and documented for client modules

function generateBrickPattern(config, player) {
  const n = Math.max(1, Math.min(10, config.blocksLength || 4));
  const colors = Array.isArray(config.availableColors) ? [...config.availableColors] : [];
  const pattern = [];
  for (let i = 0; i < n && colors.length > 0; i++) {
    const seedChar = (player.id.charCodeAt(i % player.id.length) || i) % colors.length;
    pattern.push(colors.splice(seedChar, 1)[0]);
  }
  return { pattern };
}

function generatePhotoObject(config, player) {
  if (Array.isArray(config.photoObjects) && config.photoObjects.length > 0) {
    const idx = (player.id.charCodeAt(0) || 0) % config.photoObjects.length;
    return { assignedObject: config.photoObjects[idx] };
  }
  return {};
}

module.exports = { generateBrickPattern, generatePhotoObject };