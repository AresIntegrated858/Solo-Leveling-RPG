// Solo Leveling RPG — Secure IPC Bridge
// Exposes safe, namespaced APIs to the renderer process only

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Secure Store ──────────────────────────────────────────────────────────
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key),
    has: (key) => ipcRenderer.invoke('store:has', key),
  },

  // ── File System ───────────────────────────────────────────────────────────
  fs: {
    read: (filePath) => ipcRenderer.invoke('fs:read', filePath),
    write: (filePath, content) => ipcRenderer.invoke('fs:write', filePath, content),
    exists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),
    mkdir: (dirPath) => ipcRenderer.invoke('fs:mkdir', dirPath),
    list: (dirPath) => ipcRenderer.invoke('fs:list', dirPath),
    delete: (filePath) => ipcRenderer.invoke('fs:delete', filePath),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  },

  // ── App ───────────────────────────────────────────────────────────────────
  app: {
    getSavesDir: () => ipcRenderer.invoke('app:get-saves-dir'),
    getArchiveDir: () => ipcRenderer.invoke('app:get-archive-dir'),
    exportDialog: (defaultName) => ipcRenderer.invoke('app:export-dialog', defaultName),
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
    version: () => ipcRenderer.invoke('app:version'),
    quit: () => ipcRenderer.invoke('app:quit'),
    onBeforeClose: (callback) => ipcRenderer.on('app:before-close', callback),
    removeBeforeClose: (callback) => ipcRenderer.removeListener('app:before-close', callback),
  },
});
