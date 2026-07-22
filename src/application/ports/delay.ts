export interface Delay {
  wait(durationMs: number, signal?: AbortSignal): Promise<void>;
}
