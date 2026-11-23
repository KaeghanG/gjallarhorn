// Newer npm versions can skip dependency install scripts, which leaves Electron without its binary.
// This runs Electron's own installer if the binary is missing, so `npm install && npm run dev` just works.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = path.join(__dirname, '..', 'node_modules', 'electron');
if (fs.existsSync(dir) && !fs.existsSync(path.join(dir, 'path.txt'))) {
  console.log('Gjallarhorn: downloading the Electron binary…');
  execFileSync(process.execPath, [path.join(dir, 'install.js')], { stdio: 'inherit' });
}
