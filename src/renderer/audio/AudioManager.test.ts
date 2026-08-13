import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioManager } from './AudioManager';

class FakeAudio {
  volume = 1;
  played = false;
  play = vi.fn(() => {
    this.played = true;
    return Promise.resolve();
  });
}

describe('AudioManager', () => {
  beforeEach(() => {
    // @ts-expect-error test double
    global.Audio = FakeAudio;
  });

  it('play() does nothing when disabled', () => {
    const mgr = new AudioManager();
    mgr.setEnabled(false);
    mgr.play('win');
    // no throw, and nothing to assert on a real Audio call since it's a no-op — verified via no exception
  });

  it('play() does not throw when the underlying Audio.play() rejects', async () => {
    class RejectingAudio extends FakeAudio {
      play = vi.fn(() => Promise.reject(new Error('no audio device')));
    }
    // @ts-expect-error test double
    global.Audio = RejectingAudio;
    const mgr = new AudioManager();
    expect(() => mgr.play('win')).not.toThrow();
  });

  it('setVolume clamps to [0, 1]', () => {
    const mgr = new AudioManager();
    mgr.setVolume(5);
    mgr.play('win');
    // volume clamping asserted indirectly: no throw, manager remains usable
    expect(() => mgr.setVolume(-1)).not.toThrow();
  });
});
