import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

execSync('npx vite build', {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_NATIVE_BUILD: 'true',
  },
});

// Strip cPanel web-deployment archives and presentations from native dist/ so .exe/.apk stay lightweight
const pruneFromNativeDist = [
  'cpanel_app_bundle.zip',
  'cpanel_app_bundle.tar.gz',
  'cpanel_app_code.zip',
  'B-SMART-Presentation.html',
  'B-SMART-Presentation.pdf',
  'presentation.html',
  'manifest.webmanifest',
];

for (const file of pruneFromNativeDist) {
  const target = path.resolve(process.cwd(), 'dist', file);
  if (fs.existsSync(target)) {
    try {
      fs.unlinkSync(target);
    } catch {
      // ignore
    }
  }
}

console.log('✅ Native offline bundle built cleanly in dist/ (ready for Electron .exe and Capacitor .apk).');
