# GitHub deployment — etraasdahl/health-timeline

The repository **must** contain files at its root (`index.html`, `package.json`, `vite.config.js`, `src/`, `tests/`, `auth-redirect.html`) and `.github/workflows/deploy.yml`.

1. GitHub repository > Settings > Pages > Build and deployment > Source: **GitHub Actions**.
2. Upload the project files and directories, **not the ZIP itself**, via Add file > Upload files. Preserve directory structure. Commit to main.
3. Repository > Actions > Build and deploy Health Timeline. Verify build and Pages deployment succeed.
4. Visit https://etraasdahl.github.io/health-timeline/ and verify the basic interface loads.
5. Azure > App registrations > Health Timeline > Authentication > Add Redirect URI > Single-page application. Add exactly `https://etraasdahl.github.io/health-timeline/auth-redirect.html` and save.
6. When ready to test: enter the Azure Application (client) ID in the app, sign in, test with **fictional** health events, and validate manual sync on two devices.

WARNING: **All files in this public repository are public. Do not upload health data, passphrases, tokens, personal exports, or secrets.** The app stores local event data **unencrypted**. Cloud sync is beta and has not been live-tested. It should not be relied on for real health records.

The app uses `Files.ReadWrite.AppFolder` and stops rather than silently expanding to broader OneDrive permissions.
