export type BotHuntTargetId = 'mad-dog';

export interface BotHuntTargetProps {
  id: BotHuntTargetId;
  name: string;
  articleId: number;
}

export interface BotHuntTargetSnapshot {
  id: BotHuntTargetId;
  name: string;
  articleId: number;
}

export class BotHuntTarget {
  private constructor(
    private readonly id: BotHuntTargetId,
    private readonly name: string,
    private readonly articleId: number
  ) {}

  static create(props: BotHuntTargetProps): BotHuntTarget {
    const name = props.name.trim();

    if (name.length === 0) {
      throw new Error('Hunt target name is required.');
    }

    if (!Number.isInteger(props.articleId) || props.articleId <= 0) {
      throw new Error('Hunt target article id must be a positive integer.');
    }

    return new BotHuntTarget(props.id, name, props.articleId);
  }

  getId(): BotHuntTargetId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getArticleId(): number {
    return this.articleId;
  }

  toSnapshot(): BotHuntTargetSnapshot {
    return {
      id: this.id,
      name: this.name,
      articleId: this.articleId
    };
  }
}
