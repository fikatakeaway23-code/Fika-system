# Mobile Deployment — EAS Build (Expo)

The React Native app is built with [EAS Build](https://docs.expo.dev/build/introduction/) and distributed via the Google Play Store (Android) and optionally TestFlight (iOS).

---

## Prerequisites

- Expo account: `npx expo login`
- EAS CLI: `npm install -g eas-cli`
- Android: Google Play Console account
- iOS: Apple Developer account (optional)

---

## One-time Setup

### 1. Configure app

Edit `mobile/app.json` if needed:
- `expo.name` — display name
- `expo.slug` — URL-safe identifier
- `expo.android.package` — `com.fikatakeaway.app`
- `expo.version` — increment for each release

### 2. Set environment variable

Create `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://your-backend.up.railway.app
```

For EAS builds, set it as a secret:
```bash
cd mobile
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://your-backend.up.railway.app"
```

### 3. Configure EAS project

```bash
cd mobile
eas build:configure
# Creates/updates eas.json with your Expo project ID
```

---

## Build Profiles (eas.json)

| Profile       | Output   | Use For                          |
|---------------|----------|----------------------------------|
| `development` | APK      | Local testing with dev client    |
| `preview`     | APK      | QA / internal distribution      |
| `production`  | AAB      | Google Play Store submission     |

---

## Build Commands

```bash
# Development APK (install directly on device)
eas build --platform android --profile development

# Preview APK (share with testers via QR code)
eas build --platform android --profile preview

# Production AAB (for Play Store)
eas build --platform android --profile production

# iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

EAS builds run in the cloud — no local Android SDK required.

---

## Submit to Google Play

### First submission (manual)
1. Build a production AAB: `eas build --platform android --profile production`
2. Download the `.aab` from the EAS dashboard
3. Go to [Google Play Console](https://play.google.com/console)
4. Create app → **Internal testing** → **Create new release** → upload the AAB
5. Complete the store listing (see `docs/PLAYSTORE.md`)

### Subsequent submissions (automated)
```bash
# Build + submit in one command
eas build --platform android --profile production --auto-submit

# Or submit an existing build
eas submit --platform android --profile production
```

Requires `google-play-service-account.json` in the `mobile/` directory (do not commit — add to `.gitignore`).

---

## Over-the-Air (OTA) Updates

For JavaScript-only changes (no native code changes), use EAS Update:

```bash
eas update --branch production --message "Fix cash log discrepancy display"
```

Users receive the update on next app launch — no Play Store review needed.

---

## Version Bumping

Before each Play Store release:
1. Increment `version` in `mobile/app.json`
2. Increment `android.versionCode` (integer, must increase each release)

```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

---

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view

# List secrets
eas secret:list

# Update a secret
eas secret:push --scope project
```
