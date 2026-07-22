import sirenAudioSource from './assets/siren-alarm.ogg';

export interface HumanAttentionAlarm {
  play(): void;
}

export function createHumanAttentionAlarm(): HumanAttentionAlarm {
  return new BrowserHumanAttentionAlarm(sirenAudioSource);
}

class BrowserHumanAttentionAlarm implements HumanAttentionAlarm {
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  play(): void {
    const audio = new Audio(this.source);
    audio.preload = 'auto';
    audio.volume = 1;

    void audio.play().catch(() => undefined);
  }
}
