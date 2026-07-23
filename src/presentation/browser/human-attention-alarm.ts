import sirenAudioSource from './assets/siren-alarm.ogg';

export interface HumanAttentionAlarm {
  prepare(): void;
  play(): void;
  stop(): void;
}

export function createHumanAttentionAlarm(): HumanAttentionAlarm {
  return new BrowserHumanAttentionAlarm(sirenAudioSource);
}

class BrowserHumanAttentionAlarm implements HumanAttentionAlarm {
  private activeAlarm: ActiveAlarm | null = null;
  private audioContext: AudioContext | null = null;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  prepare(): void {
    const context = this.getAudioContext();

    if (context?.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }
  }

  play(): void {
    if (this.activeAlarm) {
      return;
    }

    try {
      if (!this.playEmbeddedSiren()) {
        this.playGeneratedSiren();
      }
    } catch {
      this.stop();
    }
  }

  stop(): void {
    this.activeAlarm?.stop();
  }

  private playEmbeddedSiren(): boolean {
    const audio = new Audio(this.source);

    if (!canPlayOggAudio(audio)) {
      return false;
    }

    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 1;
    let activeAlarm: ActiveAlarm | null = null;

    const cleanup = (): void => {
      if (this.activeAlarm !== activeAlarm) {
        return;
      }

      this.activeAlarm = null;
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', fallbackToGeneratedSiren);
    };

    const fallbackToGeneratedSiren = (): void => {
      if (this.activeAlarm !== activeAlarm) {
        return;
      }

      cleanup();
      this.playGeneratedSiren();
    };

    activeAlarm = {
      stop: () => {
        audio.pause();
        audio.currentTime = 0;
        cleanup();
      }
    };

    this.activeAlarm = activeAlarm;
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', fallbackToGeneratedSiren);

    void audio.play().catch(fallbackToGeneratedSiren);

    return true;
  }

  private playGeneratedSiren(): void {
    if (this.activeAlarm) {
      return;
    }

    const context = this.getAudioContext();

    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const sweep = context.createOscillator();
    const sweepGain = context.createGain();
    const outputGain = context.createGain();
    let isStopped = false;

    oscillator.type = 'sine';
    oscillator.frequency.value = 650;
    sweep.type = 'sine';
    sweep.frequency.value = 1.15;
    sweepGain.gain.value = 260;
    outputGain.gain.value = 0.22;

    sweep.connect(sweepGain);
    sweepGain.connect(oscillator.frequency);
    oscillator.connect(outputGain);
    outputGain.connect(context.destination);

    const cleanup = (): void => {
      if (this.activeAlarm !== activeAlarm) {
        return;
      }

      this.activeAlarm = null;
      oscillator.disconnect();
      sweep.disconnect();
      sweepGain.disconnect();
      outputGain.disconnect();
    };

    const activeAlarm: ActiveAlarm = {
      stop: () => {
        if (isStopped) {
          return;
        }

        isStopped = true;
        oscillator.stop();
        sweep.stop();
        cleanup();
      }
    };

    this.activeAlarm = activeAlarm;
    oscillator.start();
    sweep.start();

    if (context.state === 'suspended') {
      void context.resume().catch(() => {
        if (this.activeAlarm === activeAlarm) {
          activeAlarm.stop();
        }
      });
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
    } catch {
      return null;
    }

    return this.audioContext;
  }
}

interface ActiveAlarm {
  stop(): void;
}

function canPlayOggAudio(audio: HTMLAudioElement): boolean {
  return audio.canPlayType('audio/ogg; codecs="vorbis"') !== ''
    || audio.canPlayType('audio/ogg') !== '';
}

function getAudioContextConstructor(): (new () => AudioContext) | null {
  const browserGlobal = globalThis as typeof globalThis & {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };

  return browserGlobal.AudioContext ?? browserGlobal.webkitAudioContext ?? null;
}
