const path = require('node:path');
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;

// ── Auto-updater config ──────────────────────────────────
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = console;

// ── Single-instance lock ─────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

/** @returns {BrowserWindow|null} */
function getMainWindow() {
  return BrowserWindow.getAllWindows()[0] || null;
}

// ── Auto-update events → renderer ────────────────────────
function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    const win = getMainWindow();
    if (win) win.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    const win = getMainWindow();
    if (win) win.webContents.send('update-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes || '',
    });
  });

  autoUpdater.on('update-not-available', () => {
    const win = getMainWindow();
    if (win) win.webContents.send('update-status', { status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    const win = getMainWindow();
    if (win) win.webContents.send('update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    const win = getMainWindow();
    if (win) win.webContents.send('update-status', {
      status: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    const win = getMainWindow();
    if (win) win.webContents.send('update-status', {
      status: 'error',
      message: err.message || String(err),
    });
  });
}

// ── IPC handlers (renderer → main) ──────────────────────
ipcMain.handle('updater:check', async () => {
  if (isDev) return { status: 'dev-mode' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { status: 'ok', version: result?.updateInfo?.version };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
});

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// ── Window creation ──────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'FrotaGestor Pro',
    icon: iconPath,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for electron-updater IPC
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Remove menu in production
  if (!isDev) Menu.setApplicationMenu(null);

  // Mostra a janela apenas quando pronta (evita flash branco)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Verificar atualizações 3s após abrir a janela
    if (!isDev) {
      setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000);
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }
}

// ── App lifecycle ────────────────────────────────────────
app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Prevent crashes from unhandled errors ────────────────
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled Rejection:', reason);
});
