export interface LauncherPosition {
  left: number;
  top: number;
}

export interface LauncherPositionStore {
  load(): LauncherPosition | null;
  save(position: LauncherPosition): void;
}
