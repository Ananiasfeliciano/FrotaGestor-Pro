const { contextBridge } = require('electron');

/**
 * Expose a minimal, safe API to the renderer process.
 * Access from the browser via: window.electronAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  appVersion: process.env.npm_package_version || '1.0.0',
});
