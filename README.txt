b-Smart Enterprise Business Card Platform - cPanel CloudLinux Deployment Bundle

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
