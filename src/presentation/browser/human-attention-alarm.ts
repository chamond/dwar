import sirenAudioSource from './assets/siren-alarm.ogg';

export interface HumanAttentionAlarm {
  play(): void;
  stop(): void;
}

export function createHumanAttentionAlarm(): HumanAttentionAlarm {
  return new BrowserHumanAttentionAlarm(sirenAudioSource);
}

class BrowserHumanAttentionAlarm implements HumanAttentionAlarm {
  private readonly activeAudios = new Set<ActiveAlarmAudio>();
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  play(): void {
    const audio = new Audio(this.source);
    audio.preload = 'auto';
    audio.volume = 1;

    const cleanup = (): void => {
      this.activeAudios.delete(activeAudio);
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', cleanup);
    };
    const activeAudio: ActiveAlarmAudio = { audio, cleanup };

    this.activeAudios.add(activeAudio);

    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);

    void audio.play().catch(cleanup);
  }

  stop(): void {
    for (const activeAudio of this.activeAudios) {
      activeAudio.audio.pause();
      activeAudio.audio.currentTime = 0;
      activeAudio.cleanup();
    }

    this.activeAudios.clear();
  }
}

interface ActiveAlarmAudio {
  audio: HTMLAudioElement;
  cleanup: () => void;
}
