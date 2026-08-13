import { ipcMain } from 'electron';
import Store from 'electron-store';
import { SettingsStore, PersistenceAdapter } from '../renderer/storage/SettingsStore';
import { WinnerStore } from '../renderer/storage/WinnerStore';
import { PlayStore } from '../renderer/storage/PlayStore';
import { GameSettings } from '../renderer/types/settings';
import { Winner, PlayRecord, ResultCategory } from '../renderer/types/game';

const settingsFileStore = new Store<{ value: GameSettings }>({ name: 'settings' });
const settingsAdapter: PersistenceAdapter = {
  read: () => settingsFileStore.get('value'),
  write: (v) => settingsFileStore.set('value', v),
};
const settingsStore = new SettingsStore(settingsAdapter);

const winnersFileStore = new Store<{ value: Winner[] }>({ name: 'winners' });
const winnersAdapter: PersistenceAdapter = {
  read: () => winnersFileStore.get('value') as unknown as GameSettings,
  write: (v) => winnersFileStore.set('value', v as unknown as Winner[]),
};
const winnerStore = new WinnerStore(winnersAdapter);

const playsFileStore = new Store<{ value: PlayRecord[] }>({ name: 'plays' });
const playsAdapter: PersistenceAdapter = {
  read: () => playsFileStore.get('value') as unknown as GameSettings,
  write: (v) => playsFileStore.set('value', v as unknown as PlayRecord[]),
};
const playStore = new PlayStore(playsAdapter);

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => settingsStore.get());
  ipcMain.handle('settings:update', (_event, partial: Partial<GameSettings>) => settingsStore.update(partial));
  ipcMain.handle('settings:reset', () => settingsStore.resetToDefaults());
  ipcMain.handle('winners:get', () => winnerStore.getAll());
  ipcMain.handle(
    'winners:add',
    (
      _event,
      name: string,
      lawFirm: string,
      email: string,
      result: number,
      displayResult: string,
      category: ResultCategory
    ) => winnerStore.add(name, lawFirm, email, result, displayResult, category)
  );
  ipcMain.handle('winners:clear', () => winnerStore.clear());

  ipcMain.handle('plays:get', () => playStore.getAll());
  ipcMain.handle('plays:add', (_event, category: ResultCategory, result: number, displayResult: string) =>
    playStore.add(category, result, displayResult)
  );
  ipcMain.handle('plays:clear', () => playStore.clear());
}
