AIKA — PHONE-ONLY APK PREPARATION

This folder is a web app/PWA starter, not an APK yet. It uses Gemini Live API for live audio conversation. It has not been live-tested on your phone.

PART A — HOST THE WEBSITE (HTTPS REQUIRED)
1. Extract this ZIP using your Android Files app or a ZIP extractor.
2. Open https://app.netlify.com/drop in Chrome and sign in if prompted.
3. Use the site's upload flow to publish the extracted website folder (the folder containing index.html, app.js, manifest.json, sw.js and icons). If mobile upload won't let you select the folder, use a static host with a folder upload feature or ask for the GitHub Pages phone-only route.
4. Copy the published HTTPS website URL and open it in Chrome.
5. Create a Gemini API key at https://aistudio.google.com/apikey. Paste it in Aika Settings & setup and tap Save on this device, then Start voice chat.

PART B — MAKE AN APK
1. Open https://www.pwabuilder.com in Chrome.
2. Paste the published HTTPS URL and let it analyze the PWA.
3. Choose Package for stores / Android, then Generate Package.
4. Select the Other Android tab if offered when you want an installable APK for your own phone. Choose a signed package/new signing key if available, and download the package.
5. Extract the downloaded PWABuilder ZIP. Find the .apk file, tap it in Downloads/Files, and allow Chrome/Files to install unknown apps if Android asks. Only install the APK you just generated yourself.
6. Keep the signing keystore and password details private and backed up; they are needed for updates.

IMPORTANT
- PWABuilder requires a valid PWA served over HTTPS. Official guide: https://github.com/pwa-builder/PWABuilder/blob/main/docs/builder/other-android.md
- API quotas/free access may change. Check https://ai.google.dev/gemini-api/docs/pricing
- The API key is saved in browser localStorage and is extractable by someone with access to your unlocked device. Do not share the key or publish the app with your key prefilled. A public production app should use a backend and short-lived credentials.
- Live voice needs internet, microphone permission and an available Gemini Live model. Singing/full song generation is not guaranteed.
