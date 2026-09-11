import type { BotHuntTarget } from '../entities/bot-hunt-target';
import type { HuntMob } from '../entities/hunt-mob';

export function canAngerHuntMob(
  mob: HuntMob,
  targets: readonly BotHuntTarget[]
): boolean {
  return targets.some((target) => {
    return target.getArticleId() === mob.getArticleId()
      && target.canBeAngered();
  });
}
