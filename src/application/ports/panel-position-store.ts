export interface PanelPosition {
  left: number;
  top: number;
}

export interface PanelPositionStore {
  load(): PanelPosition | null;
  save(position: PanelPosition): void;
}
