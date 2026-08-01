export interface AlarmVolumeStore {
  load(): number | null;
  save(volume: number): void;
}
