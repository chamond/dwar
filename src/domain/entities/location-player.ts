export interface LocationPlayerProps {
  nick: string;
  level: number;
  clanId: number;
}

export interface LocationPlayerSnapshot {
  nick: string;
  level: number;
  clanId: number;
}

export class LocationPlayer {
  private constructor(
    private readonly nick: string,
    private readonly level: number,
    private readonly clanId: number
  ) {}

  static create(props: LocationPlayerProps): LocationPlayer {
    const nick = props.nick.trim();

    if (nick.length === 0) {
      throw new Error('Location player nick is required.');
    }

    if (!Number.isSafeInteger(props.level) || props.level <= 0) {
      throw new Error('Location player level must be a positive safe integer.');
    }

    if (!Number.isSafeInteger(props.clanId) || props.clanId < 0) {
      throw new Error('Location player clan id must be a non-negative safe integer.');
    }

    return new LocationPlayer(nick, props.level, props.clanId);
  }

  getNick(): string {
    return this.nick;
  }

  toSnapshot(): LocationPlayerSnapshot {
    return {
      nick: this.nick,
      level: this.level,
      clanId: this.clanId
    };
  }
}
