# BONYAN Team Device Installation

This guide covers pre-hosting tests and production-like staging builds through the Expo
project `@bonyan_ai/bonyan`. Team builds use the `staging` EAS profile and the EAS
`preview` environment. They do not require Metro after installation, but they still
require a reachable API and database.

## Current availability

The previously documented Quick Tunnel hostname did not resolve on September 17, 2026.
The Android build listed below is an older build, not the current shared-main app.
Do not distribute it as the latest test version or use it for connected-flow signoff.
Before a new team build, provide a reachable, access-controlled staging API URL,
update the EAS `preview` value of `EXPO_PUBLIC_API_URL`, verify `/health`, and create
a new build from `main`. Record that build's ID and commit here.

For testing before a hosted staging API exists, contributors can run the API and
Expo locally. On the same Wi-Fi as the development computer:

1. Install the repository and start PostgreSQL/migrations as in the root README.
2. Find the computer's LAN IPv4 address. Set `EXPO_PUBLIC_API_URL` in
   `apps/mobile/.env` to `http://<LAN IPv4>:8000`. Set `API_PUBLIC_URL` in
   `apps/api/.env` to the same address so private media URLs also resolve.
   Never put a provider key or private database URL in the mobile file.
3. Start the API from the repository root with
   `python -m uvicorn app.main:app --app-dir apps/api --host 0.0.0.0 --port 8000`.
   Allow port 8000 only on the trusted private network, not the public internet.
4. Start Metro with `npm run mobile:dev`, then scan its QR code with Expo Go.
   Verify `http://<LAN IPv4>:8000/health` from the phone browser first.
5. Stop the API and Metro when the session ends. Each contributor should use their
   own branch and local data; never share the owner's `.env` or private fixtures.

Android emulators on the same computer can use `http://10.0.2.2:8000` instead of
the LAN address for `EXPO_PUBLIC_API_URL`. A physical iPhone cannot use
`127.0.0.1` to reach the computer's API.

## Before every build

From `apps/mobile`, verify the public staging API and mobile gates:

```powershell
Invoke-WebRequest -UseBasicParsing https://<current-staging-host>/health
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run routes:check
npx.cmd expo export --platform all --clear
npx.cmd eas-cli env:get preview --variable-name EXPO_PUBLIC_API_URL --scope project --format long --non-interactive
```

The health request must return `200`, and the EAS value must match the public staging API URL.
A temporary Quick Tunnel address can change or expire. If its address changes,
update the EAS variable and create new binaries before sharing them. Do not treat
a successful mobile build as proof that the API is available to testers.

Never put backend keys, provider keys, JWT secrets, database URLs, or signing credentials in an
`EXPO_PUBLIC_*` variable. Anything with that prefix is bundled into the app.

## Historical Android team build (not current)

- EAS build ID: `b821a464-f9dc-4dbf-91bd-2afe4aa2ab25`
- Install page: `https://expo.dev/accounts/bonyan_ai/projects/bonyan/builds/b821a464-f9dc-4dbf-91bd-2afe4aa2ab25`
- EAS artifact expiry: September 27, 2026
- Retained APK: `D:\BONYAN-private\builds\bonyan-staging-b821a464.apk`
- APK SHA-256: `61FAF3C3968056139B4B82FEE6282F242EF76E42AE69D6F38AF0F6E02BF5ABCC`

The retained APK stays private on the release owner's D: partition. Share it through an approved
private team channel, not a public repository or issue.

## Android: installable APK

An Expo or Google account is not required to install a shared internal APK unless unauthenticated
build access is disabled in Expo project settings.

1. The release owner creates the signed staging APK:

   ```powershell
   cd D:\BONYAN\apps\mobile
   npx.cmd eas-cli build --platform android --profile staging
   ```

2. Open the build page printed by EAS. Under **Build artifact**, select **Install**, then copy the
   device link or QR code. Share that build-page link only with BONYAN testers.
3. On the Android phone, open the link, download the APK, and approve the browser's **Install unknown
   apps** prompt if Android asks. Install BONYAN, then disable that browser permission again.
4. If Android reports an incompatible signature, uninstall the older BONYAN test build and install
   the new APK. This removes that build's local app data.
5. Record the phone model, Android version, build ID, installer, and smoke-test result in the release
   checklist.

## iPhone: ad hoc installation

An installable iPhone build requires an active paid Apple Developer Program team. Expo Go can run the
project before membership is active, but it is not a substitute for a signed native QA build.

After the Apple team is active:

1. The release owner signs into the Apple account during EAS credential setup. Keep Apple credentials
   private and let EAS manage the distribution certificate and provisioning profile.
2. Register every tester's iPhone:

   ```powershell
   cd D:\BONYAN\apps\mobile
   npx.cmd eas-cli device:create
   ```

   Send the generated registration URL or QR code to the tester. They must open it on that iPhone and
   complete the profile flow. Repeat for each device.
3. Confirm the devices:

   ```powershell
   npx.cmd eas-cli device:list
   ```

4. Create the signed ad hoc build interactively so EAS can add the registered devices to the Apple
   provisioning profile:

   ```powershell
   npx.cmd eas-cli build --platform ios --profile staging
   ```

5. Open the finished build page, select **Install**, and send its link to the registered testers.
   Only iPhones included in the build's provisioning profile can install it.
6. On iOS 16 or newer, enable **Settings > Privacy & Security > Developer Mode** if iOS requests it,
   restart the phone, then open BONYAN.
7. When adding a later iPhone, register it first and either make a new iOS staging build or re-sign an
   existing build with `npx.cmd eas-cli build:resign`.

Apple can take 24 to 72 hours to process devices on a new or recently renewed developer membership.
If provisioning fails immediately after registration, wait for Apple processing and retry.

## Expo access for contributors

Do not share the Expo owner's password. Manage contributors through the `bonyan_ai` Expo organization:

1. Open `https://expo.dev/accounts/bonyan_ai/settings/members` as an Owner or Admin.
2. Invite each contributor using their own Expo account email.
3. Assign the minimum role they need. Testers who only receive an unauthenticated internal-build link
   do not need project membership.
4. In the project settings, disable unauthenticated access to internal builds if every tester has an
   authorized Expo account and stricter access is desired.

## Tester smoke check

On both platforms, verify the same build against staging:

- launch, registration, sign-in, sign-out, and session restore;
- onboarding and profile updates;
- gallery, camera, and file import permissions;
- one InBody upload, review, confirmation, and Progress result;
- Training, exercise media, set logging, and Coach prompts;
- Avatar source-photo upload, generation, rendering, and deletion;
- Community privacy defaults and explicit sharing;
- airplane mode, slow network, permission denial, background, and resume behavior.

Report issues with platform/version, device model, build ID, exact steps, expected result, screenshot,
and the approximate Cairo time. Never attach private report files, body photos, tokens, or provider
responses to a public issue.
