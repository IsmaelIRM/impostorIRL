const fs = require('fs');
const path = require('path');

const missionsDir = path.join(__dirname, '../public/js/missions/missions');
const manifestPath = path.join(__dirname, '../public/js/missions/manifest.json');

function generateManifest() {
  if (!fs.existsSync(missionsDir)) {
    console.log('No missions directory found, creating empty manifest...');
    const manifest = {
      version: "1.0",
      generated: new Date().toISOString(),
      missions: []
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return;
  }

  const files = fs.readdirSync(missionsDir)
    .filter(f => f.endsWith('.js') && f !== 'index.js');
  
  const manifest = {
    version: "1.0",
    generated: new Date().toISOString(),
    missions: files.map(file => ({
      id: file.replace('.js', '').toUpperCase(),
      path: `./missions/${file}`
    }))
  };
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Generated manifest with ${manifest.missions.length} missions`);
  return manifest;
}

if (require.main === module) {
  try {
    generateManifest();
  } catch (e) {
    console.error('Manifest generation failed:', e.message);
    process.exit(0); // Don't fail the build
  }
}

module.exports = { generateManifest };