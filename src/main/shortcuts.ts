import { BrowserWindow, app, globalShortcut } from 'electron';

export function registerGlobalShortcuts(win: BrowserWindow): void {
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    win.webContents.send('shortcut:toggle-admin');
  });

  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}
