import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'node:path';
import { createMainWindow } from './window';
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts';
import { registerIpcHandlers } from './ipcHandlers';

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  // macOS dev dock icon: packaged builds get the real .icns via electron-builder's
  // mac.icon config, but `electron .` in dev otherwise shows the generic Electron icon.
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(path.join(__dirname, '../93-media/processed/icon-512.png'));
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon);
  }

  mainWindow = createMainWindow();
  registerGlobalShortcuts(mainWindow);
  registerIpcHandlers();
});

app.on('will-quit', () => {
  unregisterGlobalShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
