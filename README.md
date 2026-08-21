# Snake Line

Classic snake arcade for Android (Capacitor). Steer with the on-screen joystick, collect orbs, chase high scores.

**App ID:** `com.SnakeLine.game`  
**App name:** `Snake Line`

## Prerequisites

1. **Node.js** 18+ and npm
2. **Android Studio** (latest) with Android SDK 35+
3. **Java JDK 21**
4. A **Google Play Developer account** (for publishing)

## Local development

```bash
npm install
npm run android:run   # build + sync + run on device/emulator
```

Or open in Android Studio:

```bash
npm run cap:sync
npm run cap:open
```

## Project structure

```
Snake Line/
├── src/Game.tsx          # Game logic, canvas rendering, joystick
├── src/ads/              # AdMob helpers (banner + interstitial)
├── android/              # Native Android project (Capacitor)
├── capacitor.config.ts   # App ID, splash, status bar
└── dist/                 # Built web assets (synced into Android)
```

## Offline

The app requires an internet connection. When offline, a full-screen gate blocks play and resumes automatically when connectivity returns.

## AdMob

Ads use `@capacitor-community/admob`:

- Banner while playing / on menus
- Interstitial every 3 game-overs and every ~3 minutes of play

Config lives in `src/ads/config.ts`. **Test IDs are on by default** (`USE_TEST_ADS = true`). Before Play Store release:

1. Create an AdMob app + banner/interstitial (and rewarded if needed) units
2. Put your App ID in `AndroidManifest.xml` (`APPLICATION_ID`) and `src/ads/config.ts`
3. Set `USE_TEST_ADS = false`

## Release build

```bash
npm run android:build
```

Signed AAB output is under `android/app/build/outputs/bundle/release/`.
