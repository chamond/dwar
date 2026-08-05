import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { LocationPlayer } from '../../domain/entities/location-player';

const CHAT_USERS_LIST_SELECTOR = '#chat_users_list';
const CHAT_USER_SELECTOR = '.chat_user_item';

export class DwarChatUsersHtmlParser {
  parse(responseText: string): readonly LocationPlayer[] {
    const chatUsersHtml = extractChatUsersHtml(responseText);
    const document = new DOMParser().parseFromString(chatUsersHtml, 'text/html');
    const userList = document.querySelector(CHAT_USERS_LIST_SELECTOR);

    if (!userList) {
      throw new UnexpectedServerResponseError(
        'Chat users response does not contain parent.chatUserHtml with a user list.'
      );
    }

    return Array.from(userList.querySelectorAll<HTMLElement>(CHAT_USER_SELECTOR))
      .map(parseLocationPlayer);
  }
}

function extractChatUsersHtml(responseText: string): string {
  const assignment = /\bparent\s*\.\s*chatUserHtml\s*=\s*/.exec(responseText);

  if (assignment) {
    const valueStart = assignment.index + assignment[0].length;
    const quote = responseText[valueStart];

    if (quote !== '"' && quote !== "'") {
      throw new UnexpectedServerResponseError(
        'parent.chatUserHtml is not a quoted string.'
      );
    }

    return parseQuotedJavascriptString(responseText, valueStart, quote);
  }

  if (!responseText.includes('chat_users_list')) {
    throw new UnexpectedServerResponseError(
      'Chat users response does not contain parent.chatUserHtml.'
    );
  }

  return decodeJavascriptEscapes(responseText);
}

function parseQuotedJavascriptString(source: string, valueStart: number, quote: string): string {
  let value = '';

  for (let index = valueStart + 1; index < source.length; index += 1) {
    const character = source[index];

    if (character === quote) {
      return value;
    }

    if (character !== '\\') {
      value += character;
      continue;
    }

    const escape = decodeJavascriptEscape(source, index);
    value += escape.value;
    index = escape.endIndex;
  }

  throw new UnexpectedServerResponseError(
    'parent.chatUserHtml contains an unterminated string.'
  );
}

function decodeJavascriptEscapes(source: string): string {
  let value = '';

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character !== '\\') {
      value += character;
      continue;
    }

    const escape = decodeJavascriptEscape(source, index);
    value += escape.value;
    index = escape.endIndex;
  }

  return value;
}

interface JavascriptEscape {
  value: string;
  endIndex: number;
}

function decodeJavascriptEscape(source: string, slashIndex: number): JavascriptEscape {
  const escapedIndex = slashIndex + 1;
  const escapedCharacter = source[escapedIndex];

  if (escapedCharacter === undefined) {
    return {
      value: '\\',
      endIndex: slashIndex
    };
  }

  if (escapedCharacter === '\n') {
    return {
      value: '',
      endIndex: escapedIndex
    };
  }

  if (escapedCharacter === '\r') {
    return {
      value: '',
      endIndex: source[escapedIndex + 1] === '\n' ? escapedIndex + 1 : escapedIndex
    };
  }

  const simpleEscapes: Readonly<Record<string, string>> = {
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v'
  };
  const simpleEscape = simpleEscapes[escapedCharacter];

  if (simpleEscape !== undefined) {
    return {
      value: simpleEscape,
      endIndex: escapedIndex
    };
  }

  if (escapedCharacter === 'x') {
    return decodeHexEscape(source, escapedIndex, 2);
  }

  if (escapedCharacter === 'u') {
    return decodeHexEscape(source, escapedIndex, 4);
  }

  return {
    value: escapedCharacter,
    endIndex: escapedIndex
  };
}

function decodeHexEscape(source: string, markerIndex: number, digitCount: number): JavascriptEscape {
  const digitsStart = markerIndex + 1;
  const digits = source.slice(digitsStart, digitsStart + digitCount);

  if (!new RegExp(`^[0-9a-f]{${String(digitCount)}}$`, 'i').test(digits)) {
    throw new UnexpectedServerResponseError(
      'parent.chatUserHtml contains an invalid hexadecimal escape.'
    );
  }

  return {
    value: String.fromCharCode(Number.parseInt(digits, 16)),
    endIndex: digitsStart + digitCount - 1
  };
}

function parseLocationPlayer(element: HTMLElement): LocationPlayer {
  const nick = getRequiredAttribute(element, 'data-nick').trim();
  const level = getNonNegativeIntegerAttribute(element, 'data-level');
  const clanId = getNonNegativeIntegerAttribute(element, 'data-clanid');

  if (nick.length === 0) {
    throw new UnexpectedServerResponseError(
      'Chat user contains an empty data-nick.'
    );
  }

  if (level <= 0) {
    throw new UnexpectedServerResponseError(
      `Chat user "${nick}" contains an invalid positive data-level.`
    );
  }

  return LocationPlayer.create({
    nick,
    level,
    clanId
  });
}

function getRequiredAttribute(element: Element, attributeName: string): string {
  const value = element.getAttribute(attributeName);

  if (value === null) {
    throw new UnexpectedServerResponseError(
      `Chat user does not contain ${attributeName}.`
    );
  }

  return value;
}

function getNonNegativeIntegerAttribute(element: Element, attributeName: string): number {
  const value = getRequiredAttribute(element, attributeName).trim();

  if (!/^\d+$/.test(value)) {
    throw new UnexpectedServerResponseError(
      `Chat user contains an invalid ${attributeName}.`
    );
  }

  const integer = Number(value);

  if (!Number.isSafeInteger(integer)) {
    throw new UnexpectedServerResponseError(
      `Chat user contains an unsafe ${attributeName}.`
    );
  }

  return integer;
}
