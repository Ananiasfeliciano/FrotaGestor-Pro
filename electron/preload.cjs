const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a safe API to the renderer process.
 * Access from the browser via: window.electronAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // ── App info ───────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke('app:version'),

  // ── Auto-updater ───────────────────────────────────────
  updater: {
    check:    () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install:  () => ipcRenderer.invoke('updater:install'),

    /** @param {(event: any, data: object) => void} callback */
    onStatus: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('update-status', handler);
      // Return cleanup function
      return () => ipcRenderer.removeListener('update-status', handler);
    },
  },
});
