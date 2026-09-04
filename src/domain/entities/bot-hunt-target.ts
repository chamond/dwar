export const BOT_HUNT_TARGET_IDS = [
  'mad-dog',
  'krets',
  'krets-digger',
  'krets-leader',
  'rabid-dog',
  'frail-skeleton',
  'fire-spider',
  'zigred',
  'zigred-warrior',
  'krets-chief',
  'warrior-skeleton',
  'demon-dog',
  'fire-spideress',
  'ash-spider',
  'mature-demon-dog',
  'purple-zigred',
  'young-treant',
  'krogan',
  'agile-ficilia',
  'orc-conqueror-skeleton',
  'young-beron-tiger',
  'experienced-beron-tiger',
  'brown-hakurt',
  'cerberus'
] as const;

export type BotHuntTargetId = typeof BOT_HUNT_TARGET_IDS[number];

export interface BotHuntTargetProps {
  id: BotHuntTargetId;
  name: string;
  level: number;
  articleId: number;
  canBeAngered: boolean;
}

export interface BotHuntTargetSnapshot {
  id: BotHuntTargetId;
  name: string;
  level: number;
  articleId: number;
  canBeAngered: boolean;
}

export class BotHuntTarget {
  private constructor(
    private readonly id: BotHuntTargetId,
    private readonly name: string,
    private readonly level: number,
    private readonly articleId: number,
    private readonly angerAvailable: boolean
  ) {}

  static create(props: BotHuntTargetProps): BotHuntTarget {
    const name = props.name.trim();

    if (name.length === 0) {
      throw new Error('Hunt target name is required.');
    }

    if (!Number.isInteger(props.level) || props.level <= 0) {
      throw new Error('Hunt target level must be a positive integer.');
    }

    if (!Number.isInteger(props.articleId) || props.articleId <= 0) {
      throw new Error('Hunt target article id must be a positive integer.');
    }

    if (typeof props.canBeAngered !== 'boolean') {
      throw new Error('Hunt target anger availability must be a boolean.');
    }

    return new BotHuntTarget(
      props.id,
      name,
      props.level,
      props.articleId,
      props.canBeAngered
    );
  }

  getId(): BotHuntTargetId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getLevel(): number {
    return this.level;
  }

  getArticleId(): number {
    return this.articleId;
  }

  canBeAngered(): boolean {
    return this.angerAvailable;
  }

  toSnapshot(): BotHuntTargetSnapshot {
    return {
      id: this.id,
      name: this.name,
      level: this.level,
      articleId: this.articleId,
      canBeAngered: this.angerAvailable
    };
  }
}
