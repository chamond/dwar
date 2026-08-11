import { CURRENT_PLAYER_NICKNAME } from '../current-player';
import type { LocationPlayerSnapshot } from '../entities/location-player';
import { PRIVATE_MESSAGE_EXCLUDED_CLAN_ID } from '../private-message-rules';

const MINIMUM_HELPER_LEVEL = 3;
const MAXIMUM_RECIPIENTS_PER_ROUND = 3;

const HELP_MESSAGES = [
  {
    group: 'дерните занозу, пожалуйста',
    personal: 'дерни занозу, пожалуйста'
  },
  {
    group: 'заноза( помогите',
    personal: 'заноза( помоги'
  },
  {
    group: 'можете занозу дернуть, пожалуйста?',
    personal: 'можешь занозу дернуть, пожалуйста?'
  },
  {
    group: ':zanoza: помогите',
    personal: ':zanoza: помоги'
  },
  {
    group: 'ребят, помогите занозу снять, пожалуйста',
    personal: 'помоги занозу снять, пожалуйста'
  },
  {
    group: 'выручите с занозой, пожалуйста)',
    personal: 'выручи с занозой, пожалуйста)'
  },
  {
    group: 'кто может занозу дернуть?',
    personal: 'можешь занозу дернуть?'
  },
  {
    group: 'помогите с занозой',
    personal: 'помоги с занозой'
  },
  {
    group: 'народ, снимите занозу, пожалуйста',
    personal: 'сними занозу, пожалуйста'
  },
  {
    group: ':zanoza: спасайте, пожалуйста)',
    personal: ':zanoza: спаси, пожалуйста)'
  },
  {
    group: 'хелп с занозой, пожалуйста',
    personal: 'хелп с занозой, пожалуйста'
  }
] as const;

type HelpMessage = (typeof HELP_MESSAGES)[number];

export class SplinterHelpSession {
  private readonly contactedNickKeys = new Set<string>();
  private availableMessages: HelpMessage[] = [];
  private previousMessage: HelpMessage | null = null;

  constructor(private readonly random: () => number = Math.random) {}

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

  takeNextMessage(isPersonal: boolean): string {
    if (this.availableMessages.length === 0) {
      this.availableMessages = this.shuffleMessages();

      if (
        this.availableMessages.length > 1
        && this.availableMessages[0] === this.previousMessage
      ) {
        swapMessages(this.availableMessages, 0, 1);
      }
    }

    const message = this.availableMessages.shift();

    if (message === undefined) {
      throw new Error('Splinter help message selection is invalid.');
    }

    this.previousMessage = message;

    return isPersonal ? message.personal : message.group;
  }

  private shuffleMessages(): HelpMessage[] {
    const messages = [...HELP_MESSAGES];

    for (let index = messages.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1));
      swapMessages(messages, index, swapIndex);
    }

    return messages;
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

function swapMessages(
  messages: HelpMessage[],
  firstIndex: number,
  secondIndex: number
): void {
  const firstMessage = messages[firstIndex];
  const secondMessage = messages[secondIndex];

  if (firstMessage === undefined || secondMessage === undefined) {
    throw new Error('Splinter help message selection is invalid.');
  }

  messages[firstIndex] = secondMessage;
  messages[secondIndex] = firstMessage;
}

const CURRENT_PLAYER_NICK_KEY = normalizeNick(CURRENT_PLAYER_NICKNAME);
