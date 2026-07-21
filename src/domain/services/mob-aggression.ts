const MAX_VISIBLE_AGGRESSION_LEVEL = 100;
const SAFE_HUE = 142;
const DANGER_HUE = 0;

export interface MobAggressionProfile {
  level: number;
  isAggressive: boolean;
  color: string;
}

export function getMobAggressionProfile(aggressionLevel: number): MobAggressionProfile {
  const level = Math.max(0, Math.min(MAX_VISIBLE_AGGRESSION_LEVEL, aggressionLevel));
  const hue = Math.round(SAFE_HUE - ((SAFE_HUE - DANGER_HUE) * level) / MAX_VISIBLE_AGGRESSION_LEVEL);

  return {
    level,
    isAggressive: aggressionLevel > 0,
    color: `hsl(${hue} 78% 58%)`
  };
}
