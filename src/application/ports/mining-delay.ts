export interface MiningDelay {
  wait(durationMs: number, signal?: AbortSignal): Promise<void>;
}
