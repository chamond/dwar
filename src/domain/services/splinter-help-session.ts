import { CURRENT_PLAYER_NICKNAME } from '../current-player';
import type { LocationPlayerSnapshot } from '../entities/location-player';
import { PRIVATE_MESSAGE_EXCLUDED_CLAN_ID } from '../private-message-rules';

const MINIMUM_HELPER_LEVEL = 4;
const MAXIMUM_RECIPIENTS_PER_ROUND = 3;

const HELP_MESSAGES = [
  'дернитезанозу, пожалуйста',
  'заноза( помогите',
  'можете занозу дернуть, пожалуйста?',
  ' :zanoza: помогите'
] as const;

export class SplinterHelpSession {
  private readonly contactedNickKeys = new Set<string>();
  private nextMessageIndex = 0;

  selectRecipients(
    players: readonly LocationPlayerSnapshot[]
  ): readonly LocationPlayerSnapshot[] {
    const selectedNickKeys = new Set<string>();
    const recipients: LocationPlayerSnapshot[] = [];

    for (const player of players) {
      if (recipients.length >= MAXIMUM_RECIPIENTS_PER_ROUND) {
        break;
      }

      const nickKey = normalizeNick(player.nick);

      if (
        selectedNickKeys.has(nickKey)
        || !this.canContact(player, nickKey)
      ) {
        continue;
      }

      selectedNickKeys.add(nickKey);
      recipients.push(player);
    }

    return recipients;
  }

  markContacted(players: readonly LocationPlayerSnapshot[]): void {
    players.forEach((player) => {
      this.contactedNickKeys.add(normalizeNick(player.nick));
    });
  }

  takeNextMessage(): string {
    const message = HELP_MESSAGES[this.nextMessageIndex];

    if (message === undefined) {
      throw new Error('Splinter help message rotation is invalid.');
    }

    this.nextMessageIndex = (this.nextMessageIndex + 1) % HELP_MESSAGES.length;

    return message;
  }

  private canContact(player: LocationPlayerSnapshot, nickKey: string): boolean {
    return player.level >= MINIMUM_HELPER_LEVEL
      && player.clanId !== PRIVATE_MESSAGE_EXCLUDED_CLAN_ID
      && nickKey !== CURRENT_PLAYER_NICK_KEY
      && !this.contactedNickKeys.has(nickKey);
  }
}

function normalizeNick(nick: string): string {
  return nick.trim().toLocaleLowerCase('ru-RU');
}

const CURRENT_PLAYER_NICK_KEY = normalizeNick(CURRENT_PLAYER_NICKNAME);
