# B-SMART™ Offline Native Installers Guide (.exe & .apk)

This project includes ready-to-build configurations for both **Windows Desktop (`.exe`)** and **Android Mobile (`.apk`)** packages that bundle the entire B-SMART™ application locally on disk so users can run, create, edit, and view everything offline from the very first launch, then tap **Sync Now** whenever internet is available.

---

## Option A: Automatic Cloud Build via GitHub Actions (Easiest)

1. Push this repository to GitHub.
2. Open the **Actions** tab → select **Build Native Offline Installers (.exe & .apk)**.
3. Click **Run workflow** (optionally enter your custom server URL, defaults to `https://b-smart-online.co.za/app`).
4. When finished (~3–5 minutes), download the ready-to-install artifacts:
   - **`B-SMART-Windows-EXE`** → contains both `B-SMART-1.0.0-Windows-x64.exe` (installer) and `B-SMART-1.0.0-Portable-Windows-x64.exe` (portable).
   - **`B-SMART-Android-APK`** → contains `B-SMART-Android-Offline.apk`.

---

## Option B: Build Windows `.exe` Locally on a Windows PC

Prerequisites: **Node.js 18+** installed on Windows.

```bash
npm install
npm run desktop:setup
npm run desktop:exe
```

Output installers appear in `release-native/`:
- `release-native/B-SMART-1.0.0-Windows-x64.exe` (Setup Wizard with Desktop & Start Menu shortcuts)
- `release-native/B-SMART-1.0.0-Portable-Windows-x64.exe` (Runs directly with no admin install required)

*(Optional)* To target a different cPanel server URL during build:
- Windows PowerShell: `$env:VITE_REMOTE_API_URL="https://yourdomain.com/app"; npm run desktop:exe`

---

## Option C: Build Android `.apk` Locally (Android Studio or CLI)

Prerequisites: **Node.js 18+**, **Java 17/21**, and **Android Studio / Android SDK**.

```bash
npm install
npm run mobile:setup
npm run mobile:apk
```

Or open the generated project in Android Studio to sign a Play Store / release APK:
```bash
npx cap open android
```

Output APK appears at:
- `release-native/B-SMART-Android-Offline.apk` (or `android/app/build/outputs/apk/debug/app-debug.apk`)

---

## Changing the Remote Server Sync URL Inside the `.exe` or `.apk`

Inside the installed Windows `.exe` or Android `.apk`:
1. Open the floating **Offline Mode / Back Online** pill in the bottom-right corner.
2. Under **Sync Server**, enter your live cPanel app URL (for example `https://b-smart-online.co.za/app`) and click **Save**.
3. Tap **Check Status**, then tap **Sync Now** whenever ready to review conflicts and upload queued changes.
