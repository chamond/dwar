export interface SoundVolumeStore {
  load(): number | null;
  save(volume: number): void;
}
