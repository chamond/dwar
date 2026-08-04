import { EMPTY, catchError, from, take } from 'rxjs';

export interface MinigameCueSound {
  prepare(): void;
  play(): void;
  setVolume(volume: number): void;
}

export function createMinigameCueSound(): MinigameCueSound {
  return new BrowserMinigameCueSound();
}

class BrowserMinigameCueSound implements MinigameCueSound {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stopActiveCue: (() => void) | null = null;
  private volume = 1;

  prepare(): void {
    const context = this.getAudioContext();

    if (context?.state === 'suspended') {
      try {
        from(context.resume()).pipe(
          catchError(() => EMPTY),
          take(1)
        ).subscribe();
      } catch {
        // The cue is optional and must not interrupt mining when audio is unavailable.
      }
    }
  }

  play(): void {
    try {
      this.playCue();
    } catch {
      this.stopActiveCue?.();
      this.stopActiveCue = null;
    }
  }

  private playCue(): void {
    const context = this.getAudioContext();
    const masterGain = this.masterGain;

    if (!context || !masterGain || this.volume === 0) {
      return;
    }

    this.stopActiveCue?.();

    const startedAt = context.currentTime;
    const endedAt = startedAt + 1.05;
    const tension = context.createOscillator();
    const body = context.createOscillator();
    const wobble = context.createOscillator();
    const wobbleDepth = context.createGain();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    let stopped = false;

    tension.type = 'triangle';
    tension.frequency.setValueAtTime(150, startedAt);
    tension.frequency.exponentialRampToValueAtTime(610, startedAt + 0.88);
    tension.frequency.exponentialRampToValueAtTime(480, endedAt);

    body.type = 'sawtooth';
    body.frequency.setValueAtTime(72, startedAt);
    body.frequency.exponentialRampToValueAtTime(190, startedAt + 0.88);
    body.detune.value = -8;

    wobble.type = 'sine';
    wobble.frequency.setValueAtTime(7, startedAt);
    wobble.frequency.linearRampToValueAtTime(13, endedAt);
    wobbleDepth.gain.setValueAtTime(16, startedAt);
    wobbleDepth.gain.linearRampToValueAtTime(35, startedAt + 0.88);

    envelope.gain.setValueAtTime(0.0001, startedAt);
    envelope.gain.exponentialRampToValueAtTime(0.13, startedAt + 0.08);
    envelope.gain.linearRampToValueAtTime(0.2, startedAt + 0.82);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endedAt);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1_100, startedAt);
    filter.frequency.exponentialRampToValueAtTime(3_200, startedAt + 0.88);
    filter.Q.value = 4.5;

    wobble.connect(wobbleDepth);
    wobbleDepth.connect(tension.detune);
    tension.connect(filter);
    body.connect(filter);
    filter.connect(envelope);
    envelope.connect(masterGain);

    const cleanup = (): void => {
      if (stopped) {
        return;
      }

      stopped = true;
      tension.removeEventListener('ended', cleanup);
      tension.disconnect();
      body.disconnect();
      wobble.disconnect();
      wobbleDepth.disconnect();
      filter.disconnect();
      envelope.disconnect();

      if (this.stopActiveCue === stop) {
        this.stopActiveCue = null;
      }
    };

    const stop = (): void => {
      if (stopped) {
        return;
      }

      tension.stop();
      body.stop();
      wobble.stop();
      cleanup();
    };

    this.stopActiveCue = stop;
    tension.addEventListener('ended', cleanup, { once: true });
    tension.start(startedAt);
    body.start(startedAt);
    wobble.start(startedAt);
    tension.stop(endedAt);
    body.stop(endedAt);
    wobble.stop(endedAt);

    if (context.state === 'suspended') {
      this.prepare();
    }
  }

  setVolume(volume: number): void {
    this.volume = clampVolume(volume);

    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }

    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      return null;
    }

    try {
      this.audioContext = new AudioContextConstructor();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
      return this.audioContext;
    } catch {
      this.audioContext = null;
      this.masterGain = null;
      return null;
    }
  }
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 1;
  }

  return Math.min(1, Math.max(0, volume));
}

function getAudioContextConstructor(): (new () => AudioContext) | null {
  const browserGlobal = globalThis as typeof globalThis & {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };

  return browserGlobal.AudioContext ?? browserGlobal.webkitAudioContext ?? null;
}
