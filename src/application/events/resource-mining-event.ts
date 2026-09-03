export interface ResourceMiningResourceInfo {
  name: string;
  markerColor: string;
  serverNumber: string;
  articleId: number;
  level: number;
}

export interface ResourceMiningMobInfo {
  name: string;
  level: number;
  aggressionLevel: number;
  aggressionColor: string;
}

export type ResourceMiningEvent =
  | {
      type: 'scan-started';
    }
  | {
      type: 'scan-completed';
      totalMobCount: number;
      dangerousMobCount: number;
      selectedResourceCount: number;
      safeResourceCount: number;
    }
  | {
      type: 'no-safe-resource';
      selectedResourceCount: number;
      delayMs: number;
    }
  | {
      type: 'farm-started';
      resource: ResourceMiningResourceInfo;
      durationMs: number;
    }
  | {
      type: 'farm-cancelled';
      resource: ResourceMiningResourceInfo;
      reason: 'not-first-farmer';
    }
  | {
      type: 'monitoring-scan-started';
      resource: ResourceMiningResourceInfo;
      elapsedMs: number;
      nominalDurationElapsed: boolean;
    }
  | {
      type: 'monitoring-scan-completed';
      resource: ResourceMiningResourceInfo;
      resourceState: 'being-mined' | 'available' | 'collected';
      nominalDurationElapsed: boolean;
    }
  | {
      type: 'farm-interrupted';
      resource: ResourceMiningResourceInfo;
      dangerousMob: ResourceMiningMobInfo | null;
      dangerRadius: number;
    }
  | {
      type: 'farm-completed';
      resource: ResourceMiningResourceInfo;
    }
  | {
      type: 'farm-failed';
      resource: ResourceMiningResourceInfo;
    }
  | {
      type: 'splinter-detected';
    };
