export type BotResourceId = 'agate' | 'aquamarine' | 'turquoise';

export interface BotResourceProps {
  id: BotResourceId;
  name: string;
  markerColor: string;
  articleId: number;
}

export interface BotResourceSnapshot {
  id: BotResourceId;
  name: string;
  markerColor: string;
  articleId: number;
}

export class BotResource {
  private constructor(
    private readonly id: BotResourceId,
    private readonly name: string,
    private readonly markerColor: string,
    private readonly articleId: number
  ) {}

  static create(props: BotResourceProps): BotResource {
    const name = props.name.trim();
    const markerColor = props.markerColor.trim();

    if (name.length === 0) {
      throw new Error('Resource name is required.');
    }

    if (!/^#[0-9a-f]{6}$/i.test(markerColor)) {
      throw new Error('Resource marker color must be a hex color.');
    }

    if (!Number.isInteger(props.articleId) || props.articleId <= 0) {
      throw new Error('Resource article id must be a positive integer.');
    }

    return new BotResource(props.id, name, markerColor, props.articleId);
  }

  getId(): BotResourceId {
    return this.id;
  }

  getArticleId(): number {
    return this.articleId;
  }

  getName(): string {
    return this.name;
  }

  getMarkerColor(): string {
    return this.markerColor;
  }

  toSnapshot(): BotResourceSnapshot {
    return {
      id: this.id,
      name: this.name,
      markerColor: this.markerColor,
      articleId: this.articleId
    };
  }
}
