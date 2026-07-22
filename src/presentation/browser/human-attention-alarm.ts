import sirenAudioSource from './assets/siren-alarm.ogg';

export interface HumanAttentionAlarm {
  play(): void;
  stop(): void;
}

export function createHumanAttentionAlarm(): HumanAttentionAlarm {
  return new BrowserHumanAttentionAlarm(sirenAudioSource);
}

class BrowserHumanAttentionAlarm implements HumanAttentionAlarm {
  private activeAudio: ActiveAlarmAudio | null = null;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  play(): void {
    if (this.activeAudio) {
      return;
    }

    const audio = new Audio(this.source);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 1;

    const cleanup = (): void => {
      if (this.activeAudio !== activeAudio) {
        return;
      }

      this.activeAudio = null;
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', cleanup);
    };
    const activeAudio: ActiveAlarmAudio = { audio, cleanup };

    this.activeAudio = activeAudio;

    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);

    void audio.play().catch(cleanup);
  }

  stop(): void {
    if (!this.activeAudio) {
      return;
    }

    this.activeAudio.audio.pause();
    this.activeAudio.audio.currentTime = 0;
    this.activeAudio.cleanup();
  }
}

interface ActiveAlarmAudio {
  audio: HTMLAudioElement;
  cleanup: () => void;
}
