const path = require('node:path');
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const updater = require('./updater.cjs');

const isDev = !app.isPackaged;

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

// ── IPC handlers (renderer → main) ──────────────────────
ipcMain.handle('updater:check', async () => {
  if (isDev) return { status: 'dev-mode' };
  return updater.checkForUpdates();
});

ipcMain.handle('updater:download', async () => {
  return updater.downloadUpdate();
});

ipcMain.handle('updater:install', () => {
  updater.installUpdate();
});

ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// ── Permitir conexões Firebase no protocolo file:// ──────
function setupFirebaseSecurity() {
  const { session } = require('electron');

  // Permitir WebSocket e HTTP para domínios Firebase
  const allowedOrigins = [
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://*.firebasedatabase.app',
    'wss://*.firebasedatabase.app',
    'https://firebaseinstallations.googleapis.com',
    'https://www.googleapis.com',
  ];

  // Remover CSP restritivo em respostas HTTP para permitir Firebase
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    // Não bloquear Firebase por content-security-policy de respostas externas
    delete headers['content-security-policy'];
    delete headers['Content-Security-Policy'];
    callback({ responseHeaders: headers });
  });

  // Permitir requisições para domínios Firebase quando carregado de file://
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.firebaseio.com/*', 'wss://*.firebaseio.com/*', 'https://*.googleapis.com/*'] },
    (details, callback) => {
      callback({ requestHeaders: details.requestHeaders });
    }
  );
}

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
    // Verificar atualizações 3s após abrir a janela (produção)
    updater.scheduleAutoCheck(3000);
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
  setupFirebaseSecurity();
  updater.initAutoUpdate();
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
