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
  },
  {
    id: 'krets-digger',
    name: 'Крэтс-землерой',
    level: 2,
    articleId: 2717
  },
  {
    id: 'orc-conqueror-skeleton',
    name: 'Скелет орка-завоевателя',
    level: 5,
    articleId: 352
  },
  {
    id: 'young-beron-tiger',
    name: 'Молодой беронский тигр',
    level: 4,
    articleId: 355
  },
  {
    id: 'experienced-beron-tiger',
    name: 'Опытный беронский тигр',
    level: 4,
    articleId: 354
  },
  {
    id: 'brown-hakurt',
    name: 'Хакурт бурый',
    level: 4,
    articleId: 356
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
