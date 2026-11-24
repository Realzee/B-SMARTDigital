================================================================================
b-Smart Online Deployment Package (https://b-smart-online.co.za/app)
================================================================================

HOW TO DEPLOY ON CPANEL TODAY:

1. POSTGRESQL DATABASE:
   - In cPanel > PostgreSQL Databases:
     Create database: bsmarton_appdb
     Create user: bsmarton_dbuser
     Grant All Privileges to the user on this database.
   - In cPanel > phpPgAdmin:
     Open your database, click the "SQL" tab, paste the contents of "setup_postgres.sql", and click Execute.
     (All tables: companies, cards, users, leads, uploads will be created).

2. UPLOAD FILES:
   - In cPanel > File Manager:
     Open or create the "app" folder in your cPanel home directory.
     Upload "cpanel_app_bundle.zip" and click "Extract".

3. SETUP NODE.JS APP:
   - In cPanel > Setup Node.js App:
     Node.js Version: 18.x or 20.x
     Application mode: Production
     Application root: app
     Application URL: app
     Application startup file: app.js
   - Environment variables (Click "Add Variable"):
     DATABASE_URL = postgresql://bsmarton_dbuser:YOUR_PASSWORD@localhost:5432/bsmarton_appdb
     NODE_ENV = production
     PORT = 3000

4. RUN NPM INSTALL & RESTART:
   - Click "Run NPM Install" (takes only 5 seconds).
   - Click "RESTART".
   - Open https://b-smart-online.co.za/app in your browser!

5. CARD SHARE LINK 404 PREVENTION (IMPORTANT FOR LITESPEED):
   - In cPanel > File Manager > public_html:
     Open ".htaccess" (enable "Show Hidden Files" in Settings if not visible).
     Add the lines from "public_html_htaccess.txt":
     
     RewriteEngine On
     RewriteRule ^card/(.*)$ /app/card/$1 [R=301,L]
     
   - This ensures any shared link at https://b-smart-online.co.za/card/your-name
     instantly routes to the app without showing LiteSpeed's 404!
================================================================================
