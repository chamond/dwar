import type { HuntTargetRepository } from '../../application/ports/hunt-target-repository';
import {
  BotHuntTarget,
  type BotHuntTargetId,
  type BotHuntTargetProps
} from '../../domain/entities/bot-hunt-target';

const LOCAL_HUNT_TARGET_RECORDS = [
  {
    id: 'mad-dog',
    name: 'Шальной пёс',
    level: 1,
    articleId: 19
  },
  {
    id: 'krets',
    name: 'Крэтс',
    level: 1,
    articleId: 268
  }
] as const satisfies readonly BotHuntTargetProps[];

export class StaticHuntTargetRepository implements HuntTargetRepository {
  private readonly targets = LOCAL_HUNT_TARGET_RECORDS.map((record) => BotHuntTarget.create(record));

  findAll(): readonly BotHuntTarget[] {
    return this.targets;
  }

  findById(id: BotHuntTargetId): BotHuntTarget | null {
    return this.targets.find((target) => target.getId() === id) ?? null;
  }
}
