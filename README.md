# Health Timeline — synchronization milestone (v0.2 beta)

This is a **development prototype**, not a deployed or clinically validated product. It runs on Windows and can be served over HTTPS for iPhone browsers. It retains an **unencrypted localStorage copy** of records in each browser. Remote OneDrive records are encrypted using a separate user-supplied passphrase (PBKDF2 SHA-256 + AES-256-GCM). Do not use as the only copy of important health records.

## Windows development

1. Install Node.js 22 or newer. In this folder, run `npm install` then `npm run dev`.
2. Open the Vite localhost URL (typically `http://localhost:5173`). Do not open `index.html` directly from disk; module imports and identity login require a served app.
3. `npm test` runs local synchronization and cryptography unit tests. `npm run build` produces a distribution in `dist/`.

## Microsoft account setup

1. Register an app at the Microsoft Entra admin center (App registrations → New registration). Choose **Personal Microsoft accounts only** (or the setting that includes personal accounts).
2. Configure the **Single-page application (SPA)** platform with redirect URI `http://localhost:5173/auth-redirect.html`. Add your exact hosted HTTPS origin + `/auth-redirect.html` for the eventual iPhone-accessible deployment. Do not use a client secret in the browser.
3. Add Microsoft Graph **delegated** `Files.ReadWrite.AppFolder` permission; grant consent during sign-in. Do **not** grant broad `Files.ReadWrite` merely to bypass a permission failure without reviewing the security implications.
4. In the app, open **Data & backups**, enter the public Application (client) ID, choose **Connect Microsoft account**, and provide a **unique 14+ character cloud encryption passphrase** (not your Microsoft password). Click **Sync now**.
5. Use the **same** App/client ID, Microsoft account and encryption passphrase on both devices. Repeat manual sync on each device. Always export a JSON backup before first sync.

If OneDrive app-folder permission fails on your personal account, this prototype **stops** rather than broadening access. Verify tenant/registration/consent and check Microsoft Graph service support before changing permissions.

## What has been implemented

- Timestamped entries for glucose, meals, exercise sessions, blood pressure, weight and more, with meal/exercise links.
- Local browser diary, chart and JSON/CSV export.
- Manual Microsoft identity login using MSAL.js; OneDrive app-folder discovery via Microsoft Graph.
- Encrypted, append-only event-version files in app folder, with new events and deletion tombstones merged between devices on manual sync.
- A cloud configuration file holding a nonsecret random key-derivation salt, never the password.
- Unit tests for encryption and basic merge/delete operations.

## Known limits — important

- **Not tested against a live Microsoft account in this build environment.** Authentication, consent, storage quota, iPhone browser behavior, and cross-device sync need end-to-end validation.
- **Not production secure:** local browser data is unencrypted and stored in localStorage; passphrase is not retained; localStorage may be cleared. No encrypted IndexedDB, device unlock, native Apple Health integration, background sync or installable service worker yet.
- Concurrent editing of the same record is resolved by the newest timestamp (not a user-facing conflict review).
- Every changed event creates a new cloud version file. No safe compaction or retention policy has been implemented.
- This prototype uses manual sync, not automatic background synchronization. Cloud files are encrypted, but sync metadata such as file count and changes is visible to your cloud provider.
- No bidirectional automatic import into the Excel workbook; use CSV/JSON export for now.
- Changing the app registration ID changes the OneDrive app folder. The passphrase cannot be recovered if lost.

## Roadmap

1. Verify sign-in and Graph API behavior using personal OneDrive and test data, including two-device merge and delete tests.
2. Migrate local records to encrypted IndexedDB and implement recovery key management.
3. Add sync conflict UI, incremental listing, limits and integrity checks.
4. Add PWA manifest and service worker for installation, followed by Excel-compatible export and optional native HealthKit integration.

Microsoft documentation:
- https://learn.microsoft.com/graph/onedrive-sharepoint-appfolder
- https://learn.microsoft.com/en-us/entra/msal/javascript/browser/login-user
