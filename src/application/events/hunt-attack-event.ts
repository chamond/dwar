export interface HuntAttackMobInfo {
  id: string;
  name: string;
  level: number;
  aggressionLevel: number;
  aggressionColor: string;
}

export type HuntAttackEvent =
  | {
      type: 'no-safe-target';
      targetCandidateCount: number;
    }
  | {
      type: 'attack-request-sent';
      mob: HuntAttackMobInfo;
    }
  | {
      type: 'attack-target-not-recovered';
      mob: HuntAttackMobInfo;
    }
  | {
      type: 'anger-applied';
      mob: HuntAttackMobInfo;
    }
  | {
      type: 'fight-finished';
      mob: HuntAttackMobInfo;
    };
