import sirenAudioSource from './assets/siren-alarm.ogg';

export interface HumanAttentionAlarm {
  play(): void;
}

export function createHumanAttentionAlarm(): HumanAttentionAlarm {
  return new BrowserHumanAttentionAlarm(sirenAudioSource);
}

class BrowserHumanAttentionAlarm implements HumanAttentionAlarm {
  private readonly template: HTMLAudioElement;

  constructor(source: string) {
    this.template = new Audio(source);
    this.template.preload = 'auto';
    this.template.volume = 1;
  }

  play(): void {
    const audio = this.template.cloneNode(true) as HTMLAudioElement;
    audio.volume = 1;
    audio.currentTime = 0;

    void audio.play().catch(() => undefined);
  }
}
