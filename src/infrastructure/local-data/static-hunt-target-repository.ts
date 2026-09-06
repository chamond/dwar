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
    articleId: 19,
    canBeAngered: false
  },
  {
    id: 'phadd-bear',
    name: 'Медведь Пхадд',
    level: 5,
    articleId: 15,
    canBeAngered: true
  },
  {
    id: 'old-phadd-bear',
    name: 'Старый медведь Пхадд',
    level: 6,
    articleId: 26,
    canBeAngered: true
  },
  {
    id: 'kodrag',
    name: 'Кодраг',
    level: 6,
    articleId: 50,
    canBeAngered: true
  },
  {
    id: 'valdagor-wolf',
    name: 'Волк Валдагор',
    level: 7,
    articleId: 46,
    canBeAngered: true
  },
  {
    id: 'young-valdagor-wolf',
    name: 'Молодой волк Валдагор',
    level: 7,
    articleId: 53,
    canBeAngered: true
  },
  {
    id: 'ghoul',
    name: 'Упырь',
    level: 5,
    articleId: 172,
    canBeAngered: false
  },
  {
    id: 'dead-man',
    name: 'Мертвец',
    level: 5,
    articleId: 173,
    canBeAngered: true
  },
  {
    id: 'zombie',
    name: 'Зомби',
    level: 4,
    articleId: 159,
    canBeAngered: true
  },
  {
    id: 'forest-iguraon',
    name: 'Лесной игураон',
    level: 5,
    articleId: 100,
    canBeAngered: false
  },
  {
    id: 'krets',
    name: 'Крэтс',
    level: 1,
    articleId: 268,
    canBeAngered: false
  },
  {
    id: 'krets-digger',
    name: 'Крэтс-землерой',
    level: 2,
    articleId: 2717,
    canBeAngered: false
  },
  {
    id: 'krets-leader',
    name: 'Крэтс-лидер',
    level: 2,
    articleId: 280,
    canBeAngered: false
  },
  {
    id: 'rabid-dog',
    name: 'Бешеный пёс',
    level: 2,
    articleId: 20,
    canBeAngered: true
  },
  {
    id: 'frail-skeleton',
    name: 'Дряхлый скелет',
    level: 2,
    articleId: 157,
    canBeAngered: false
  },
  {
    id: 'fire-spider',
    name: 'Огненный паук',
    level: 2,
    articleId: 284,
    canBeAngered: false
  },
  {
    id: 'zigred',
    name: 'Зигред',
    level: 2,
    articleId: 36,
    canBeAngered: true
  },
  {
    id: 'zigred-warrior',
    name: 'Зигред-воин',
    level: 3,
    articleId: 35,
    canBeAngered: true
  },
  {
    id: 'furious-dog',
    name: 'Неистовый пёс',
    level: 3,
    articleId: 21,
    canBeAngered: true
  },
  {
    id: 'krets-chief',
    name: 'Крэтс-вожак',
    level: 3,
    articleId: 269,
    canBeAngered: false
  },
  {
    id: 'warrior-skeleton',
    name: 'Скелет-воин',
    level: 3,
    articleId: 158,
    canBeAngered: true
  },
  {
    id: 'demon-dog',
    name: 'Пёс-демон',
    level: 3,
    articleId: 23,
    canBeAngered: true
  },
  {
    id: 'fire-spideress',
    name: 'Огненная паучиха',
    level: 3,
    articleId: 285,
    canBeAngered: false
  },
  {
    id: 'ash-spider',
    name: 'Пепельный паук',
    level: 3,
    articleId: 350,
    canBeAngered: false
  },
  {
    id: 'mature-demon-dog',
    name: 'Матёрый пёс-демон',
    level: 4,
    articleId: 24,
    canBeAngered: true
  },
  {
    id: 'purple-zigred',
    name: 'Пурпурный зигред',
    level: 4,
    articleId: 40,
    canBeAngered: true
  },
  {
    id: 'giant-zigred',
    name: 'Гигантский зигред',
    level: 4,
    articleId: 44,
    canBeAngered: true
  },
  {
    id: 'young-treant',
    name: 'Древень молодой',
    level: 4,
    articleId: 349,
    canBeAngered: true
  },
  {
    id: 'treant',
    name: 'Древень',
    level: 4,
    articleId: 351,
    canBeAngered: true
  },
  {
    id: 'krogan',
    name: 'Кроган',
    level: 4,
    articleId: 509,
    canBeAngered: false
  },
  {
    id: 'agile-ficilia',
    name: 'Ловкая фицилия',
    level: 4,
    articleId: 508,
    canBeAngered: false
  },
  {
    id: 'orc-conqueror-skeleton',
    name: 'Скелет орка-завоевателя',
    level: 5,
    articleId: 352,
    canBeAngered: false
  },
  {
    id: 'bloody-zigred',
    name: 'Кровавый зигред',
    level: 5,
    articleId: 55,
    canBeAngered: true
  },
  {
    id: 'young-beron-tiger',
    name: 'Молодой беронский тигр',
    level: 4,
    articleId: 355,
    canBeAngered: false
  },
  {
    id: 'experienced-beron-tiger',
    name: 'Опытный беронский тигр',
    level: 4,
    articleId: 354,
    canBeAngered: false
  },
  {
    id: 'brown-hakurt',
    name: 'Хакурт бурый',
    level: 4,
    articleId: 356,
    canBeAngered: false
  },
  {
    id: 'cerberus',
    name: 'Цербер',
    level: 7,
    articleId: 807,
    canBeAngered: false
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
