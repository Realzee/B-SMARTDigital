const fs = require('fs');

const files = [
  'node_modules/vite/dist/client/client.mjs',
  'node_modules/vite/dist/client/bundledDevClient.mjs',
  'node_modules/vite/dist/node/module-runner.js'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('WebSocket closed without opened.')) {
      content = content.replace(/reject\(\/\* @__PURE__ \*\/ (?:new )?Error\(\"WebSocket closed without opened\.\"\)\);/g, 'return;');
      fs.writeFileSync(file, content);
      console.log('[patch-vite] Patched', file);
    }
  }
}
