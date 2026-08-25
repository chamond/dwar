export type BotHuntTargetId =
  | 'mad-dog'
  | 'krets'
  | 'krets-digger'
  | 'orc-conqueror-skeleton'
  | 'young-beron-tiger'
  | 'experienced-beron-tiger'
  | 'brown-hakurt';

export interface BotHuntTargetProps {
  id: BotHuntTargetId;
  name: string;
  level: number;
  articleId: number;
}

export interface BotHuntTargetSnapshot {
  id: BotHuntTargetId;
  name: string;
  level: number;
  articleId: number;
}

export class BotHuntTarget {
  private constructor(
    private readonly id: BotHuntTargetId,
    private readonly name: string,
    private readonly level: number,
    private readonly articleId: number
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

    return new BotHuntTarget(props.id, name, props.level, props.articleId);
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

  toSnapshot(): BotHuntTargetSnapshot {
    return {
      id: this.id,
      name: this.name,
      level: this.level,
      articleId: this.articleId
    };
  }
}
