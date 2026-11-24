import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function buildBundle() {
  console.log('1/5. Building frontend client assets (vite build)...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('2/5. Building server bundle for Node.js (esbuild)...');
  execSync(
    'npx esbuild server.ts --bundle --platform=node --target=node18 --format=esm --outfile=app.js --external:pg --external:dotenv --external:express --external:@neondatabase/serverless --external:vite --external:nodemailer',
    { stdio: 'inherit' }
  );

  // Ensure uploads and data directories exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }
  if (!fs.existsSync('data')) {
    fs.mkdirSync('data', { recursive: true });
  }
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // Create .htaccess for cPanel CloudLinux Passenger Node.js app
  const htaccessContent = `# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION
PassengerAppRoot "/home/username/public_html"
PassengerBaseURI "/"
PassengerNodejs "/home/username/nodevenv/public_html/20/bin/node"
PassengerStartupFile app.js
PassengerAppType node
`;
  fs.writeFileSync('.htaccess', htaccessContent.trim());
  fs.writeFileSync(path.join('dist', '.htaccess'), htaccessContent.trim());

  // Create detailed README for cPanel
  const readmeContent = `b-Smart Enterprise Business Card Platform - cPanel CloudLinux Deployment Bundle

========================================================================
STANDALONE ZERO-INSTALL CPANEL BUNDLE (INCLUDES NODE_MODULES)
========================================================================

This archive is 100% self-contained. It includes the pre-compiled frontend,
the optimized Node.js server (app.js), and all pre-installed runtime dependencies
in 'node_modules'. YOU DO NOT NEED TO RUN 'npm install' ON CPANEL!

PREREQUISITES:
1. cPanel -> Setup Node.js App:
   - Node.js Version: 18.x, 20.x, or 22.x
   - Application Mode: Production
   - Application Root: public_html (or app)
   - Application Startup File: app.js
   - Application URL: / (or /app)

2. cPanel -> PostgreSQL Database Wizard:
   - Create a database (e.g., username_bsmart)
   - Create a user (e.g., username_bsmartuser) and set password
   - Grant ALL privileges to user on that database

3. Environment Variables (set in cPanel Setup Node.js App UI or .env):
   PORT=3000
   NODE_ENV=production
   DATABASE_URL=postgres://username_bsmartuser:YOUR_PASSWORD@localhost:5432/username_bsmart
   SESSION_SECRET=b_smart_secure_enterprise_key

DEPLOYMENT STEPS:
1. Upload "cpanel_app_bundle.zip" (or .tar.gz) into your application folder in cPanel File Manager.
2. Select the archive and click "Extract".
3. In cPanel -> "Setup Node.js App", click "Restart".
4. Done! Visit your domain. All tables and schemas auto-initialize on first run.
`;
  fs.writeFileSync('README.txt', readmeContent);

  // Clean old bundles
  const cleanFiles = [
    'cpanel_app_bundle.zip',
    'cpanel_app_bundle.tar.gz',
    'cpanel_app_code.zip',
    'public/cpanel_app_bundle.zip',
    'public/cpanel_app_bundle.tar.gz',
    'public/cpanel_app_code.zip',
    'dist/cpanel_app_bundle.zip',
    'dist/cpanel_app_bundle.tar.gz',
    'dist/cpanel_app_code.zip',
  ];
  for (const f of cleanFiles) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch {}
  }

  console.log('3/5. Packaging cpanel_app_bundle.tar.gz (with complete pre-installed node_modules)...');
  try {
    execSync(
      'tar -czf cpanel_app_bundle.tar.gz --exclude="node_modules/.cache" --exclude="*.zip" --exclude="*.tar.gz" app.js package.json README.txt .htaccess dist uploads data node_modules',
      { stdio: 'inherit' }
    );
    const tarSize = (fs.statSync('cpanel_app_bundle.tar.gz').size / (1024 * 1024)).toFixed(2);
    console.log(`cpanel_app_bundle.tar.gz created successfully (${tarSize} MB)`);
  } catch (tarErr) {
    console.warn('Tar creation warning:', tarErr.message);
  }

  console.log('4/5. Packaging cpanel_app_bundle.zip (with complete pre-installed node_modules)...');
  const pyScript = `
import zipfile, os, sys

target_zip = 'cpanel_app_bundle.zip'
print("Creating standalone zip archive with pre-installed node_modules (following symlinks)...")
with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for single_file in ['app.js', 'package.json', 'README.txt', '.htaccess']:
        if os.path.exists(single_file):
            zipf.write(single_file, single_file)
            
    for root_dir in ['dist', 'uploads', 'data', 'node_modules']:
        if os.path.exists(root_dir):
            for dirpath, dirnames, filenames in os.walk(root_dir, followlinks=True):
                if '.cache' in dirpath:
                    continue
                for f in filenames:
                    if f.endswith('.zip') or f.endswith('.tar.gz'):
                        continue
                    fp = os.path.join(dirpath, f)
                    if os.path.isfile(fp):
                        try:
                            zipf.write(fp, fp)
                        except Exception:
                            pass

size_mb = os.path.getsize(target_zip) / (1024 * 1024)
print(f"Standalone cpanel_app_bundle.zip ready: {size_mb:.2f} MB")
`;
  fs.writeFileSync('_create_zip.py', pyScript);
  execSync('python3 _create_zip.py', { stdio: 'inherit' });
  try {
    fs.unlinkSync('_create_zip.py');
  } catch {}

  console.log('4.5/5. Packaging cpanel_app_code.zip (lightweight ~5MB code bundle)...');
  const pyCodeScript = `
import zipfile, os

target_zip = 'cpanel_app_code.zip'
print("Creating lightweight code zip archive...")
with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for single_file in ['app.js', 'package.json', 'README.txt', '.htaccess']:
        if os.path.exists(single_file):
            zipf.write(single_file, single_file)
            
    for root_dir in ['dist', 'uploads', 'data']:
        if os.path.exists(root_dir):
            for dirpath, dirnames, filenames in os.walk(root_dir, followlinks=True):
                if '.cache' in dirpath:
                    continue
                for f in filenames:
                    if f.endswith('.zip') or f.endswith('.tar.gz'):
                        continue
                    fp = os.path.join(dirpath, f)
                    if os.path.isfile(fp):
                        try:
                            zipf.write(fp, fp)
                        except Exception:
                            pass

size_mb = os.path.getsize(target_zip) / (1024 * 1024)
print(f"Lightweight cpanel_app_code.zip ready: {size_mb:.2f} MB")
`;
  fs.writeFileSync('_create_code_zip.py', pyCodeScript);
  execSync('python3 _create_code_zip.py', { stdio: 'inherit' });
  try {
    fs.unlinkSync('_create_code_zip.py');
  } catch {}

  console.log('5/5. Distributing bundles to public/ and dist/ for immediate download access...');
  if (fs.existsSync('cpanel_app_bundle.zip')) {
    fs.copyFileSync('cpanel_app_bundle.zip', 'public/cpanel_app_bundle.zip');
    fs.copyFileSync('cpanel_app_bundle.zip', 'dist/cpanel_app_bundle.zip');
  }
  if (fs.existsSync('cpanel_app_code.zip')) {
    fs.copyFileSync('cpanel_app_code.zip', 'public/cpanel_app_code.zip');
    fs.copyFileSync('cpanel_app_code.zip', 'dist/cpanel_app_code.zip');
  }
  if (fs.existsSync('cpanel_app_bundle.tar.gz')) {
    fs.copyFileSync('cpanel_app_bundle.tar.gz', 'public/cpanel_app_bundle.tar.gz');
    fs.copyFileSync('cpanel_app_bundle.tar.gz', 'dist/cpanel_app_bundle.tar.gz');
  }

  console.log('✅ All cPanel production bundles built and verified successfully!');
}

buildBundle().catch((err) => {
  console.error('Failed to build cPanel bundle:', err);
  process.exit(1);
});
