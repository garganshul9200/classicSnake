# Neon Serpent — Android & Play Store Guide

Neon Serpent is a React + Vite arcade game wrapped with [Capacitor](https://capacitorjs.com/) for Android. The web game runs inside a native shell and ships as an **Android App Bundle (`.aab`)** for Google Play.

## Project structure

```
create-polished-mobile-game/
├── src/Game.tsx          # Game logic, canvas rendering, touch controls
├── android/              # Native Android project (Capacitor)
├── capacitor.config.ts   # App ID, splash screen, status bar
└── dist/                 # Built web assets (synced into Android)
```

**App ID:** `com.neonserpent.game`  
Change this in `capacitor.config.ts` and `android/app/build.gradle` before publishing if you want your own package name.

---

## Prerequisites

1. **Node.js** 18+ and npm
2. **Android Studio** (latest) with:
   - Android SDK 35
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
3. **Java JDK 21** (required by Capacitor 8 / Android Gradle Plugin 8.7)
   - macOS: `brew install openjdk@21`
   - Set before building: `export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`
4. A **Google Play Developer account** ($25 one-time fee)

Set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) to your SDK path.

---

## Local development

```bash
# Install dependencies
npm install

# Run in browser (fast iteration)
npm run dev

# Open in Android Studio emulator/device
npm run build
npx cap sync android
npm run cap:open
```

In Android Studio, click **Run** to install on a connected device or emulator.

---

## Build a Play Store release

### 1. Create a signing keystore (one time)

```bash
keytool -genkeypair -v \
  -keystore android/release.keystore \
  -alias neon-serpent \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12
```

**Back up `release.keystore` and passwords securely.** You cannot update your app on Play Store without the same key.

### 2. Configure signing

```bash
cp android/keystore.properties.example android/keystore.properties
```

Edit `android/keystore.properties` with your real passwords and keystore path.

### 3. Bump version for each release

In `android/app/build.gradle`:

- `versionCode` — integer, must increase every upload (1, 2, 3…)
- `versionName` — user-visible version ("1.0.1", "1.1.0", …)

### 4. Build the App Bundle

```bash
npm run android:build
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Upload this `.aab` file to [Google Play Console](https://play.google.com/console).

---

## Google Play Console checklist

### Store listing
- **App name:** Neon Serpent
- **Short description:** A neon arcade snake game — drag to steer, collect orbs, chase high scores.
- **Full description:** Describe gameplay, controls, and features.
- **App icon:** 512×512 PNG (use your branded icon; the project includes adaptive icons in `android/app/src/main/res/`)
- **Feature graphic:** 1024×500 PNG
- **Screenshots:** At least 2 phone screenshots (portrait recommended)

### Content & compliance
- **Category:** Games → Arcade
- **Content rating:** Complete the IARC questionnaire (likely Everyone / PEGI 3 — no violence, no user-generated content)
- **Target audience:** Select appropriate age groups
- **Data safety:** This app stores high scores **locally only** (localStorage). No accounts, analytics, or network data collection. Declare "No data collected" or "Data not shared" accordingly.
- **Privacy policy:** Required even if you collect no data. Host a simple page stating scores are stored on-device only.

### Technical
- **App bundle:** Upload `app-release.aab`
- **Signing:** Use **Play App Signing** (recommended). Google manages the distribution key; you upload with your upload key.
- **Minimum SDK:** 23 (Android 6.0)
- **Target SDK:** 35

### Testing track (recommended first upload)
1. Create an **Internal testing** release
2. Upload the `.aab`
3. Add testers via email list
4. Verify on a real device before promoting to Production

---

## Customization before launch

| Item | File |
|------|------|
| App name | `android/app/src/main/res/values/strings.xml` |
| Package / App ID | `capacitor.config.ts`, `android/app/build.gradle` |
| App icon | `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml` |
| Splash screen | `android/app/src/main/res/drawable/splash.xml` |
| Theme colors | `android/app/src/main/res/values/colors.xml` |

After any web changes:

```bash
npm run cap:sync
```

---

## Troubleshooting

**Gradle build fails — SDK not found**  
Open Android Studio → SDK Manager → install Android 15 (API 35).

**White screen on launch**  
Run `npm run cap:sync` to copy latest `dist/` into the Android project.

**Touch not working**  
The game uses canvas touch handlers with `passive: false`. Test on a real device; emulators can behave differently.

**Signing errors**  
Verify `keystore.properties` paths are relative to the `android/` folder.

---

## Useful commands

```bash
npm run dev              # Browser dev server
npm run build            # Production web build
npm run cap:sync         # Build + sync to Android
npm run cap:open         # Open Android Studio
npm run android:build    # Build signed release AAB
```
