export interface PanelSize {
  width: number;
  height: number;
}

export interface PanelSizeStore {
  load(): PanelSize | null;
  save(size: PanelSize): void;
}
