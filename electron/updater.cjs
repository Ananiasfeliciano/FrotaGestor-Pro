/**
 * updater.cjs — Módulo profissional de Auto-Update para FrotaGestor Pro
 *
 * Usa electron-updater com GitHub Releases.
 * - checkForUpdates()
 * - downloadUpdate()
 * - installUpdate()
 * - Logs detalhados
 * - Fallback e tratamento de erros
 */

const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// ── Configuração do repositório ──────────────────────────
const GITHUB_OWNER = 'Ananiasfeliciano';
const GITHUB_REPO  = 'frotagestor-pro---sistema-de-gest-o-de-frotas';

// ── Logger personalizado ─────────────────────────────────
const LOG_FILE = path.join(app.getPath('userData'), 'updater.log');

const logger = {
  _write(level, ...args) {
    const ts = new Date().toISOString();
    const msg = `[${ts}] [${level}] ${args.join(' ')}`;
    console.log(msg);
    try {
      fs.appendFileSync(LOG_FILE, msg + '\n');
    } catch { /* ignore */ }
  },
  info(...args)  { this._write('INFO', ...args); },
  warn(...args)  { this._write('WARN', ...args); },
  error(...args) { this._write('ERROR', ...args); },
  debug(...args) { this._write('DEBUG', ...args); },
};

// ── Estado interno ───────────────────────────────────────
let isUpdating = false;
let lastCheckTime = 0;

/** @returns {BrowserWindow|null} */
function getMainWindow() {
  return BrowserWindow.getAllWindows()[0] || null;
}

/** Envia evento para o renderer */
function sendStatus(payload) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('update-status', payload);
  }
}

// ── Configuração do autoUpdater ──────────────────────────
function configureAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = logger;

  // Forçar repositório correto via setFeedURL
  const feedConfig = {
    provider: 'github',
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
  };

  autoUpdater.setFeedURL(feedConfig);
  logger.info(`Feed URL configurado: github.com/${GITHUB_OWNER}/${GITHUB_REPO}`);

  // Token para repositórios privados (opcional)
  const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
  if (ghToken) {
    // Para repos privados, incluir token via requestHeaders
    autoUpdater.requestHeaders = { Authorization: `token ${ghToken}` };
    logger.info('Token GitHub configurado para repo privado');
  }
}

// ── Event listeners ──────────────────────────────────────
function setupEvents() {
  autoUpdater.on('checking-for-update', () => {
    logger.info('Verificando atualizações...');
    sendStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    logger.info(`Nova versão disponível: v${info.version}`);
    sendStatus({
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes || '',
      releaseDate: info.releaseDate || '',
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info(`Versão atual (v${info.version}) é a mais recente`);
    sendStatus({ status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(1);
    logger.debug(`Download: ${pct}% (${speed} MB/s)`);
    sendStatus({
      status: 'downloading',
      percent: pct,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    isUpdating = false;
    logger.info(`Atualização v${info.version} baixada e pronta para instalar`);
    sendStatus({
      status: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    isUpdating = false;
    logger.error('Erro no auto-updater:', err.message || String(err));
    sendStatus({
      status: 'error',
      message: err.message || String(err),
    });
  });
}

// ── API pública ──────────────────────────────────────────

/**
 * Verifica se há atualizações disponíveis.
 * Retorna info da versão ou null.
 */
async function checkForUpdates() {
  // Throttle: evitar verificações em menos de 60s de intervalo
  const now = Date.now();
  if (now - lastCheckTime < 60_000) {
    logger.info('Verificação ignorada (throttle 60s)');
    return { status: 'throttled' };
  }
  lastCheckTime = now;

  try {
    logger.info('Iniciando verificação de atualizações...');
    const result = await autoUpdater.checkForUpdates();
    if (result?.updateInfo) {
      return { status: 'ok', version: result.updateInfo.version };
    }
    return { status: 'ok', version: null };
  } catch (err) {
    logger.error('Falha ao verificar atualizações:', err.message);
    return { status: 'error', message: err.message || String(err) };
  }
}

/**
 * Inicia download da atualização disponível.
 */
async function downloadUpdate() {
  if (isUpdating) {
    logger.warn('Download já em andamento');
    return { status: 'already-downloading' };
  }

  try {
    isUpdating = true;
    logger.info('Iniciando download da atualização...');
    await autoUpdater.downloadUpdate();
    return { status: 'ok' };
  } catch (err) {
    isUpdating = false;
    logger.error('Falha no download:', err.message);
    return { status: 'error', message: err.message || String(err) };
  }
}

/**
 * Instala a atualização e reinicia o aplicativo.
 */
function installUpdate() {
  logger.info('Instalando atualização e reiniciando...');
  // isSilent=false → mostra instalador, isForceRunAfter=true → reabre após instalar
  autoUpdater.quitAndInstall(false, true);
}

/**
 * Inicializa o sistema de auto-update completo.
 * Chamado uma vez no app.whenReady().
 */
function initAutoUpdate() {
  configureAutoUpdater();
  setupEvents();
  logger.info(`Auto-update inicializado (app v${app.getVersion()}, packaged: ${app.isPackaged})`);
}

/**
 * Agenda verificação automática após delay.
 * Só funciona em produção (app.isPackaged).
 */
function scheduleAutoCheck(delayMs = 3000) {
  if (!app.isPackaged) {
    logger.info('Modo desenvolvimento — verificação automática desabilitada');
    return;
  }

  setTimeout(async () => {
    try {
      await checkForUpdates();
    } catch (err) {
      logger.warn('Verificação automática falhou:', err.message);
    }
  }, delayMs);
}

module.exports = {
  initAutoUpdate,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  scheduleAutoCheck,
};
