export type BotResourceId = 'agate' | 'aquamarine' | 'turquoise';

export interface BotResourceProps {
  id: BotResourceId;
  name: string;
  markerColor: string;
}

export interface BotResourceSnapshot {
  id: BotResourceId;
  name: string;
  markerColor: string;
}

export class BotResource {
  private constructor(
    private readonly id: BotResourceId,
    private readonly name: string,
    private readonly markerColor: string
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

    return new BotResource(props.id, name, markerColor);
  }

  toSnapshot(): BotResourceSnapshot {
    return {
      id: this.id,
      name: this.name,
      markerColor: this.markerColor
    };
  }
}
