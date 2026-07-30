# SIEHUB Desktop App

Electron wrapper for the configured SIEHUB endpoint.

## Development

```powershell
npm install
npm start
```

To test deployed endpoints:

```powershell
$env:SIEHUB_APP_URL='https://siehub.example.cn'
$env:SIEVOX_APP_URL='https://sievox.example.cn'
$env:SIEBRIDGE_APP_URL='https://siebridge.example.cn'
npm start
```

## Build Windows App

```powershell
npm run dist:win
```

Build outputs are written to `desktop-app/release/`.
