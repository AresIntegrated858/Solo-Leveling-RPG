// Solo Leveling RPG — Electron Main Process
// Handles: window management, IPC file operations, secure API key storage, auto-save

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Secure config store — never logs API keys
const store = new Store({
  name: 'solo-leveling-config',
  encryptionKey: 'sl-rpg-v1-config',
});

let mainWindow = null;
let autoSaveInterval = null;

// ─── Window Creation ────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png').replace(/missing/, ''),
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Save on close
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.webContents.send('app:before-close');
    setTimeout(() => {
      mainWindow.destroy();
    }, 1500);
  });
}

// ─── App Lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Secure Store ───────────────────────────────────────────────────────
ipcMain.handle('store:get', (_, key) => store.get(key));
ipcMain.handle('store:set', (_, key, value) => { store.set(key, value); });
ipcMain.handle('store:delete', (_, key) => { store.delete(key); });
ipcMain.handle('store:has', (_, key) => store.has(key));

// ─── IPC: File System ────────────────────────────────────────────────────────
ipcMain.handle('fs:read', (_, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error('fs:read error', err);
    return null;
  }
});

ipcMain.handle('fs:write', (_, filePath, content) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('fs:write error', err);
    return false;
  }
});

ipcMain.handle('fs:exists', (_, filePath) => fs.existsSync(filePath));

ipcMain.handle('fs:mkdir', (_, dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('fs:list', (_, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath);
  } catch (err) {
    return [];
  }
});

ipcMain.handle('fs:delete', (_, filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('fs:rename', (_, oldPath, newPath) => {
  try {
    fs.renameSync(oldPath, newPath);
    return true;
  } catch (err) {
    return false;
  }
});

// ─── IPC: Save Directory ────────────────────────────────────────────────────
ipcMain.handle('app:get-saves-dir', () => {
  const savesDir = path.join(app.getPath('userData'), 'saves');
  if (!fs.existsSync(savesDir)) fs.mkdirSync(savesDir, { recursive: true });
  return savesDir;
});

ipcMain.handle('app:get-archive-dir', () => {
  const archiveDir = path.join(app.getPath('userData'), 'archive');
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  return archiveDir;
});

// ─── IPC: Export Dialog ─────────────────────────────────────────────────────
ipcMain.handle('app:export-dialog', async (_, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Campaign Log',
    defaultPath: defaultName || 'campaign-log.txt',
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
  });
  return result;
});

ipcMain.handle('app:open-external', (_, url) => shell.openExternal(url));

// ─── IPC: App Info ───────────────────────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:quit', () => app.quit());
