const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const APP_URL = process.env.SIEHUB_APP_URL || 'http://localhost:5173';
const configuredAppUrls = [
  APP_URL,
  process.env.SIEVOX_APP_URL,
  process.env.SIEBRIDGE_APP_URL
].filter(Boolean);

function hostVariants(url) {
  const host = new URL(url).host;
  return [host, host.startsWith('www.') ? host.slice(4) : `www.${host}`];
}

const ALLOWED_HOSTS = new Set(configuredAppUrls.flatMap(hostVariants));

function isAppUrl(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.has(parsed.host);
  } catch {
    return false;
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'SIEHUB',
    icon: path.join(__dirname, 'assets', 'SIEHUB_LOGO.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) {
      mainWindow.loadURL(url);
    } else {
      shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(APP_URL);
}

function createMenu() {
  const template = [
    {
      label: 'SIEHUB',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  app.setAppUserModelId('cn.siehub.desktop');
  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
