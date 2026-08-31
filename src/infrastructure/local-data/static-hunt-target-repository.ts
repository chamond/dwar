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
    id: 'krets-leader',
    name: 'Крэтс-лидер',
    level: 2,
    articleId: 280
  },
  {
    id: 'rabid-dog',
    name: 'Бешеный пёс',
    level: 2,
    articleId: 20
  },
  {
    id: 'frail-skeleton',
    name: 'Дряхлый скелет',
    level: 2,
    articleId: 157
  },
  {
    id: 'fire-spider',
    name: 'Огненный паук',
    level: 2,
    articleId: 284
  },
  {
    id: 'zigred',
    name: 'Зигред',
    level: 2,
    articleId: 36
  },
  {
    id: 'zigred-warrior',
    name: 'Зигред-воин',
    level: 3,
    articleId: 35
  },
  {
    id: 'krets-chief',
    name: 'Крэтс-вожак',
    level: 3,
    articleId: 269
  },
  {
    id: 'warrior-skeleton',
    name: 'Скелет-воин',
    level: 3,
    articleId: 158
  },
  {
    id: 'demon-dog',
    name: 'Пёс-демон',
    level: 3,
    articleId: 23
  },
  {
    id: 'fire-spideress',
    name: 'Огненная паучиха',
    level: 3,
    articleId: 285
  },
  {
    id: 'ash-spider',
    name: 'Пепельный паук',
    level: 3,
    articleId: 350
  },
  {
    id: 'mature-demon-dog',
    name: 'Матёрый пёс-демон',
    level: 4,
    articleId: 24
  },
  {
    id: 'purple-zigred',
    name: 'Пурпурный зигред',
    level: 4,
    articleId: 40
  },
  {
    id: 'young-treant',
    name: 'Древень молодой',
    level: 4,
    articleId: 349
  },
  {
    id: 'krogan',
    name: 'Кроган',
    level: 4,
    articleId: 509
  },
  {
    id: 'agile-ficilia',
    name: 'Ловкая фицилия',
    level: 4,
    articleId: 508
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
