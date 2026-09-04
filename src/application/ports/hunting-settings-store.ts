import type { BotHuntTargetId } from '../../domain/entities/bot-hunt-target';

export interface HuntingSettings {
  targetIds: readonly BotHuntTargetId[];
  preferCrowdedTarget: boolean;
  aggressiveHunting: boolean;
  angerMob: boolean;
}

export interface HuntingSettingsStore {
  load(): HuntingSettings | null;
  save(settings: HuntingSettings): void;
}
