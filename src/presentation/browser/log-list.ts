import type { BotLogEntrySnapshot } from '../../domain/entities/bot-log-entry';

const MAX_LOG_ENTRY_COUNT = 100;

export interface BotLogTagPart {
  text: string;
  color: string;
  title?: string;
}

export type BotLogLinePart = string | BotLogTagPart;
export type BotLogLineTone = 'success' | 'failure';

export interface BotLogLineOptions {
  parts?: readonly BotLogLinePart[];
  tone?: BotLogLineTone;
}

export function appendLogLine(
  logList: HTMLElement,
  entry: BotLogEntrySnapshot,
  options: BotLogLineOptions = {}
): void {
  const parts = options.parts ?? [entry.message];
  appendLogEntry(logList, createLogLine(entry, parts, options.tone));
}

export function appendLogContent(
  logList: HTMLElement,
  entry: BotLogEntrySnapshot,
  content: Node
): void {
  const line = createLogLine(entry, []);
  line.append(content);
  appendLogEntry(logList, line);
}

function appendLogEntry(logList: HTMLElement, line: HTMLElement): void {
  logList.append(line);

  while (logList.childElementCount > MAX_LOG_ENTRY_COUNT) {
    logList.firstElementChild?.remove();
  }

  logList.scrollTop = logList.scrollHeight;
}

export function clearLogList(logList: HTMLElement): void {
  logList.replaceChildren();
}

function createLogLine(
  entry: BotLogEntrySnapshot,
  parts: readonly BotLogLinePart[],
  tone?: BotLogLineTone
): HTMLElement {
  const line = document.createElement('div');
  line.className = 'dwar-log-line';

  if (tone) {
    line.classList.add(`dwar-log-line--${tone}`);
  }

  line.append(createLogTime(entry.createdAt), ...parts.map((part) => createLogPart(part)));

  return line;
}

function createLogTime(date: Date): HTMLElement {
  const time = document.createElement('span');
  time.className = 'dwar-log-line__time';
  time.textContent = `${formatTime(date)}: `;

  return time;
}

function createLogPart(part: BotLogLinePart): Node {
  if (typeof part === 'string') {
    return document.createTextNode(part);
  }

  return createTagPart(part);
}

function createTagPart(part: BotLogTagPart): HTMLElement {
  const tag = document.createElement('span');
  tag.className = 'dwar-log-tag';
  tag.textContent = part.text;
  tag.style.setProperty('--dwar-log-tag-color', part.color);

  if (part.title) {
    tag.title = part.title;
  }

  return tag;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}
