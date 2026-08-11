import { CURRENT_PLAYER_NICKNAME } from '../../domain/current-player';

const SYSTEM_MESSAGE_SELECTOR = 'div.cml_spc[nick=""]';
const PRIVATE_CHANNEL_SELECTOR = '.cml_prv[data-channel="2"]';
const MESSAGE_TEXT_SELECTOR = '.msgtxt';
const PRIVATE_TAG_PATTERN = /\buserPrvTag\s*\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/u;

export class DwarSplinterHealerMessageParser {
  parse(html: string): string | null {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const message = document.body.firstElementChild;

    if (
      !message?.matches(SYSTEM_MESSAGE_SELECTOR)
      || !message.querySelector(PRIVATE_CHANNEL_SELECTOR)
    ) {
      return null;
    }

    const messageText = message.querySelector(MESSAGE_TEXT_SELECTOR)?.textContent;

    if (!messageText || !containsSplinterRemovalText(messageText)) {
      return null;
    }

    for (const element of Array.from(message.querySelectorAll<HTMLElement>('[onclick]'))) {
      const healerNick = extractPrivateTagNick(element.getAttribute('onclick'));

      if (healerNick !== null) {
        return healerNick;
      }
    }

    return null;
  }
}

function containsSplinterRemovalText(messageText: string): boolean {
  const normalizedText = messageText.replace(/\s+/gu, ' ').trim();

  return normalizedText.includes(
    `избавляет воина ${CURRENT_PLAYER_NICKNAME} от занозы`
  );
}

function extractPrivateTagNick(onclick: string | null): string | null {
  if (onclick === null) {
    return null;
  }

  const match = PRIVATE_TAG_PATTERN.exec(onclick);
  const encodedNick = match?.[2];

  if (encodedNick === undefined) {
    return null;
  }

  const nick = encodedNick.replace(/\\(['"\\])/gu, '$1').trim();

  return nick.length > 0 ? nick : null;
}
