# Native Release Configuration

## Identifiers and Versions

- App name: `BONYAN`
- Expo slug/scheme: `bonyan`
- Android package: `com.bonyan.app`
- iOS bundle identifier: `com.bonyan.app`
- App version: `0.1.0`
- Initial Android `versionCode`: `1`
- Initial iOS `buildNumber`: `1`

Person 01 must confirm that `com.bonyan.app` is available and owned before store registration. EAS
uses remote versioning and auto-increments production builds after that initial configuration.

## Permissions and Public Configuration

The current app uses system document/photo pickers and declares no broad Android storage permission.
Do not add camera, photo-library, or storage permissions unless a shipped native flow requires them.
`EXPO_PUBLIC_API_URL` is public configuration and must select the matching HTTPS environment; provider
and signing secrets must never use the `EXPO_PUBLIC_` prefix or enter app config.

## EAS Environments

- `staging`: internal distribution using an installable Android APK or ad hoc iOS IPA, with the
  EAS `preview` environment.
- `production`: store distribution using the EAS `production` environment and automatic
  build-number increment.

EAS Update is not currently installed, so build channels are intentionally absent from `eas.json`.
Every JavaScript or native-code change requires a new staging binary until OTA updates are explicitly
adopted and tested.

Configure the public API/model URLs in the matching EAS environment. Store Android upload/signing and
Apple distribution credentials in EAS managed credentials or the approved signing service.

## Required Commands

```sh
npx eas-cli build --profile staging --platform android
npx eas-cli device:create
npx eas-cli build --profile staging --platform ios
npx eas-cli build --profile production --platform android
npx eas-cli build --profile production --platform ios
```

These commands require an approved Expo project/account and signing credentials. No native build or
device PASS is claimed until the resulting artifact is installed and the QA evidence is recorded.
See [Team device installation](team-device-installation.md) for tester enrollment and install steps.
