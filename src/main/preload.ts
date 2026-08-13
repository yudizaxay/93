import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (partial: unknown) => ipcRenderer.invoke('settings:update', partial),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  getWinners: () => ipcRenderer.invoke('winners:get'),
  addWinner: (name: string, lawFirm: string, email: string, result: number, displayResult: string, category: string) =>
    ipcRenderer.invoke('winners:add', name, lawFirm, email, result, displayResult, category),
  clearWinners: () => ipcRenderer.invoke('winners:clear'),
  getPlays: () => ipcRenderer.invoke('plays:get'),
  addPlay: (category: string, result: number, displayResult: string) =>
    ipcRenderer.invoke('plays:add', category, result, displayResult),
  clearPlays: () => ipcRenderer.invoke('plays:clear'),
  onAdminToggle: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on('shortcut:toggle-admin', listener);
    return () => ipcRenderer.removeListener('shortcut:toggle-admin', listener);
  },
});

