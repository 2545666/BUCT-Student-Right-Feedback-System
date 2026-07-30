# SIEHUB Mobile App

Capacitor wrapper for the current SIEHUB web experience.

## What this does

This package loads the configured SIEHUB web endpoint inside a mobile WebView shell.
The fallback web page supports a `target` query parameter, for example:

```text
web/index.html?target=https://siehub.example.cn
```

## Setup

```powershell
npm install
npm run add:android
npm run add:ios
```

## Sync assets

```powershell
npm run sync
```

## Generate icons and splash screens

```powershell
npm run assets
```

## Build Android debug APK

```powershell
npm run build:android:debug
```

The debug APK is generated at:

```text
mobile-app/android/app/build/outputs/apk/debug/app-debug.apk
```

## Notes

Android APK builds need a local JDK and Android SDK.
The iOS project can be generated here, but building an IPA requires macOS/Xcode.
