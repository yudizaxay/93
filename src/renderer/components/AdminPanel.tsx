import { useEffect, useState } from 'react';
import { GameSettings } from '../types/settings';
import { Winner, PlayRecord } from '../types/game';
import { audioManager, SoundName } from '../audio/AudioManager';
import { Logger, LogEntry } from '../logging/Logger';
import { HardwareTestPanel } from './HardwareTestPanel';
import './AdminPanel.css';

type Tab = 'rules' | 'audio' | 'input' | 'display' | 'stats';

// Inline SVGs instead of emoji: emoji glyph rendering (and width) varies
// wildly by OS/font stack — it rendered as mismatched tofu-ish glyphs on
// this machine and would be just as unpredictable on the Windows kiosk
// target. A stroked line-icon always renders identically and inherits the
// tab's current text color for free.
function TabIcon({ id }: { id: Tab }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'rules':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
          <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
        </svg>
      );
    case 'audio':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 9v6h4l5 5V4L8 9H4Z" />
          <path d="M17 8a5 5 0 0 1 0 8M19.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      );
    case 'input':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="2" y="9" width="20" height="9" rx="4" />
          <path d="M7 12v3M5.5 13.5h3M15.5 13.5h.01M18.5 13.5h.01" />
        </svg>
      );
    case 'display':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="2" y="4" width="20" height="13" rx="1.5" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
    case 'stats':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 20V10M12 20V4M20 20v-7" />
          <path d="M2 20h20" />
        </svg>
      );
  }
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h6M4 12h12M4 18h9" />
      <circle cx="14" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'rules', label: 'Game Rules & Ranges' },
  { id: 'audio', label: 'Audio & FX' },
  { id: 'input', label: 'USB Hardware Input' },
  { id: 'display', label: 'Kiosk & TV Display' },
  { id: 'stats', label: 'Booth Stats & Export' },
];

function toCsv(plays: PlayRecord[]): string {
  const header = 'id,category,result,displayResult,createdAt';
  const rows = plays.map((p) => [p.id, p.category, p.result, p.displayResult, p.createdAt].join(','));
  return [header, ...rows].join('\n');
}

// CSV field escaping: name/lawFirm/email are free text and may contain commas
// or quotes (e.g. "Smith, Jones & Co."), which would otherwise corrupt columns.
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toWinnersCsv(winners: Winner[]): string {
  const header = 'id,category,name,lawFirm,email,result,displayResult,createdAt';
  const rows = winners.map((w) =>
    [
      w.id,
      w.category,
      csvField(w.name),
      csvField(w.lawFirm),
      csvField(w.email),
      w.result,
      w.displayResult,
      w.createdAt,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function AdminPanel({
  settings,
  logger,
  onClose,
  onSettingsChange,
}: {
  settings: GameSettings;
  logger?: Logger;
  onClose: () => void;
  onSettingsChange?: (settings: GameSettings) => void;
}) {
  const [tab, setTab] = useState<Tab>('rules');
  const [draft, setDraft] = useState<Partial<GameSettings>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [showHardwareTest, setShowHardwareTest] = useState(false);
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [showWinners, setShowWinners] = useState(false);
  const [plays, setPlays] = useState<PlayRecord[]>([]);

  useEffect(() => {
    audioManager.setEnabled(settings.soundEnabled);
    audioManager.setVolume(settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume]);

  useEffect(() => {
    if (tab === 'stats') {
      window.api.getPlays().then(setPlays);
      window.api.getWinners().then(setWinners);
    }
  }, [tab]);

  const field = (key: keyof GameSettings) =>
    draft[key] !== undefined ? draft[key] : settings[key];

  const setField = (key: keyof GameSettings, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleWinners = () => setShowWinners((v) => !v);

  const clearWinners = async () => {
    await window.api.clearWinners();
    setWinners([]);
  };

  const clearHistory = async () => {
    await window.api.clearPlays();
    setPlays([]);
  };

  const downloadCsv = (content: string, filenamePrefix: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => downloadCsv(toCsv(plays), '9-3-verdict-challenge-plays');
  // The lead-gen list booth staff actually want: every name/law firm/email left
  // behind, whether they won or just left details after a near/other attempt.
  const exportWinnersCsv = () => downloadCsv(toWinnersCsv(winners), '9-3-verdict-challenge-winners');

  const save = async () => {
    const result = await window.api.updateSettings(draft);
    if (result.ok) {
      setDraft({});
      setErrors([]);
      onSettingsChange?.(result.settings);
    } else {
      setErrors(result.errors ?? ['Invalid settings']);
    }
  };

  const totalPlays = plays.length;
  const totalWinners = plays.filter((p) => p.category === 'WIN').length;
  const totalNearMisses = plays.filter((p) => p.category === 'NEAR').length;

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h1>
            <SettingsIcon /> ADMIN &amp; BOOTH KIOSK SETTINGS
          </h1>
          <button className="admin-panel-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="admin-tabs-wrap">
          <div className="admin-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`admin-tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <TabIcon id={t.id} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-tab-content">
          {tab === 'rules' && (
            <>
              <div className="admin-grid-2">
                <div className="admin-card">
                  <label className="admin-card-label">TARGET TIME (SECONDS):</label>
                  <input type="number" step="0.001" value={field('target') as number}
                    onChange={(e) => setField('target', Number(e.target.value))} />
                  <p className="admin-hint">Default 0.93 represents the 9-3 Plaintiff Verdict.</p>
                </div>
                <div className="admin-card">
                  <label className="admin-card-label">AUTO-RESET DELAY (SECONDS):</label>
                  <input type="number" min="1" value={(field('autoResetMs') as number) / 1000}
                    onChange={(e) => setField('autoResetMs', Number(e.target.value) * 1000)} />
                  <p className="admin-hint">Seconds before screen resets automatically for next player.</p>
                </div>
              </div>

              <div className="admin-card">
                <label className="admin-card-label">TOLERANCE &amp; DIFFICULTY RANGES:</label>
                <div className="admin-grid-2">
                  <label className="admin-subfield">Near Miss Lower Bound (s):
                    <input type="number" step="0.001" value={field('nearMin') as number}
                      onChange={(e) => setField('nearMin', Number(e.target.value))} />
                  </label>
                  <label className="admin-subfield">Near Miss Upper Bound (s):
                    <input type="number" step="0.001" value={field('nearMax') as number}
                      onChange={(e) => setField('nearMax', Number(e.target.value))} />
                  </label>
                  <label className="admin-subfield">Win Window Lower Bound (s):
                    <input type="number" step="0.001" value={field('winMin') as number}
                      onChange={(e) => setField('winMin', Number(e.target.value))} />
                  </label>
                  <label className="admin-subfield">Win Window Upper Bound (s):
                    <input type="number" step="0.001" value={field('winMax') as number}
                      onChange={(e) => setField('winMax', Number(e.target.value))} />
                  </label>
                </div>
              </div>

              <div className="admin-card">
                <label className="admin-card-label">GRAND PRIZE HEADER SUBTITLE:</label>
                <input type="text" maxLength={40} value={field('winSubtitleText') as string}
                  onChange={(e) => setField('winSubtitleText', e.target.value)} />
              </div>

              <div className="admin-toggle-row">
                <label className="admin-toggle">
                  <div>
                    <strong>Capture Details on Win</strong>
                    <p className="admin-hint">Ask winners for Name/Law Firm/Email after a win.</p>
                  </div>
                  <input type="checkbox" checked={field('winnerCaptureEnabled') as boolean}
                    onChange={(e) => setField('winnerCaptureEnabled', e.target.checked)} />
                </label>
                <label className="admin-toggle">
                  <div>
                    <strong>Idle Winner Rotation</strong>
                    <p className="admin-hint">Show recent winner names on the idle screen.</p>
                  </div>
                  <input type="checkbox" checked={field('winnerRotationEnabled') as boolean}
                    onChange={(e) => setField('winnerRotationEnabled', e.target.checked)} />
                </label>
                <label className="admin-toggle">
                  <div>
                    <strong>Capture Details on Near-Miss/Try Again</strong>
                    <p className="admin-hint">
                      Also ask non-winners for Name/Law Firm/Email — captures leads even when they don't win. Never
                      shown on the public idle rotation, only in Booth Stats.
                    </p>
                  </div>
                  <input type="checkbox" checked={field('captureOnLossEnabled') as boolean}
                    onChange={(e) => setField('captureOnLossEnabled', e.target.checked)} />
                </label>
              </div>
            </>
          )}

          {tab === 'audio' && (
            <>
              <label className="admin-card admin-toggle">
                <div>
                  <strong>Sound Effects &amp; Fanfare</strong>
                  <p className="admin-hint">Play procedural audio on start, win, near-miss, and reset.</p>
                </div>
                <input type="checkbox" checked={field('soundEnabled') as boolean}
                  onChange={(e) => {
                    setField('soundEnabled', e.target.checked);
                    audioManager.setEnabled(e.target.checked);
                  }} />
              </label>

              <div className="admin-card">
                <label className="admin-card-label">
                  MASTER AUDIO VOLUME ({Math.round((field('soundVolume') as number) * 100)}%):
                </label>
                <input type="range" min="0" max="1" step="0.05" value={field('soundVolume') as number}
                  onChange={(e) => {
                    const vol = Number(e.target.value);
                    setField('soundVolume', vol);
                    audioManager.setVolume(vol);
                  }} />
              </div>

              <div className="admin-card">
                <label className="admin-card-label">TEST SOUND EFFECTS (WEB AUDIO API):</label>
                <div className="admin-sound-grid">
                  <button onClick={() => audioManager.play('start' as SoundName)}>Start Sweep</button>
                  <button onClick={() => audioManager.play('stop' as SoundName)}>Tick Click</button>
                  <button onClick={() => audioManager.play('near' as SoundName)}>Near Miss</button>
                  <button className="admin-sound-primary" onClick={() => audioManager.play('win' as SoundName)}>
                    Win Fanfare
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'input' && (
            <>
              <div className="admin-card">
                <label className="admin-card-label">USB HARDWARE BUTTON MAPPED KEY:</label>
                <select value={field('buttonKey') as string} onChange={(e) => setField('buttonKey', e.target.value)}>
                  <option value="Space">Spacebar (Default USB Arcade Standard)</option>
                  <option value="Enter">Enter Key</option>
                </select>
                <p className="admin-hint">
                  Most USB arcade buttons emulate a standard keyboard Spacebar or Enter key. Select your USB
                  encoder's signal key.
                </p>
              </div>

              <label className="admin-card admin-toggle">
                <div>
                  <strong>Allow Screen Touch/Mouse Click</strong>
                  <p className="admin-hint">Allow attendees to tap the on-screen button if a touchscreen monitor is present.</p>
                </div>
                <input type="checkbox" checked={field('allowManualTrigger') as boolean}
                  onChange={(e) => setField('allowManualTrigger', e.target.checked)} />
              </label>

              <button className="admin-secondary-action" onClick={() => setShowHardwareTest(true)}>
                TEST USB BUTTON
              </button>
            </>
          )}

          {tab === 'display' && (
            <>
              <div className="admin-card">
                <label className="admin-card-label">TV DISPLAY ORIENTATION MODE:</label>
                <div className="admin-pill-row">
                  <button
                    className={`admin-pill${field('orientation') === 'landscape' ? ' active' : ''}`}
                    onClick={() => setField('orientation', 'landscape')}
                  >
                    16:9 LANDSCAPE MODE
                  </button>
                  <button
                    className={`admin-pill${field('orientation') === 'portrait' ? ' active' : ''}`}
                    onClick={() => setField('orientation', 'portrait')}
                  >
                    9:16 VERTICAL PORTRAIT
                  </button>
                </div>
              </div>

              <label className="admin-card admin-toggle">
                <div>
                  <strong>Hide Mouse Cursor in Kiosk Mode</strong>
                  <p className="admin-hint">Keeps the display clean on the 43" booth TV screen.</p>
                </div>
                <input type="checkbox" checked={field('hideCursor') as boolean}
                  onChange={(e) => setField('hideCursor', e.target.checked)} />
              </label>
            </>
          )}

          {tab === 'stats' && (
            <>
              <div className="admin-stat-row">
                <div className="admin-stat-card">
                  <span className="admin-stat-label">TOTAL PLAYS</span>
                  <span className="admin-stat-value">{totalPlays}</span>
                </div>
                <div className="admin-stat-card highlight">
                  <span className="admin-stat-label">WINNERS</span>
                  <span className="admin-stat-value">{totalWinners}</span>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-label">NEAR MISSES</span>
                  <span className="admin-stat-value">{totalNearMisses}</span>
                </div>
              </div>

              <div className="admin-stat-actions">
                <button className="admin-export-button" onClick={exportCsv} disabled={totalPlays === 0}>
                  <DownloadIcon /> EXPORT PLAYS TO CSV
                </button>
                <button className="admin-export-button" onClick={exportWinnersCsv} disabled={winners.length === 0}>
                  <DownloadIcon /> EXPORT LEADS (NAME/FIRM/EMAIL) TO CSV
                </button>
                <button className="admin-danger-button" onClick={clearHistory}>
                  <TrashIcon /> CLEAR HISTORY
                </button>
              </div>

              <div className="admin-secondary-actions">
                <button onClick={() => setLogs(logs ? null : logger?.getRecent() ?? [])}>
                  {logs ? 'HIDE LOGS' : 'VIEW LOGS'}
                </button>
                <button onClick={toggleWinners}>{showWinners ? 'HIDE WINNERS' : 'VIEW WINNERS'}</button>
                <button onClick={clearWinners}>CLEAR TODAY'S WINNERS</button>
              </div>

              {logs && (
                <ul className="admin-logs">
                  {logs.length === 0
                    ? <li>NO EVENTS LOGGED</li>
                    : logs.slice(-25).reverse().map((entry, i) => (
                        <li key={`${entry.timestamp}-${i}`}>{entry.timestamp} {entry.event}</li>
                      ))}
                </ul>
              )}

              {showWinners && (
                <ul className="admin-winners">
                  {winners.length === 0
                    ? <li>NO WINNERS YET</li>
                    : winners.map((w) => (
                        <li key={w.id}>
                          {w.category !== 'WIN' && <span className="admin-lead-tag">LEAD</span>} {w.name} — {w.lawFirm || '—'} — {w.email || '—'}
                        </li>
                      ))}
                </ul>
              )}
            </>
          )}
        </div>

        {errors.length > 0 && (
          <ul className="admin-errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        )}

        <div className="admin-actions">
          <button className="admin-apply-button" onClick={save}>DONE &amp; APPLY</button>
        </div>
      </div>
      {showHardwareTest && (
        <HardwareTestPanel buttonKey={settings.buttonKey} onClose={() => setShowHardwareTest(false)} />
      )}
    </div>
  );
}
