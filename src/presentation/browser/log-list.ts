import type { BotLogEntrySnapshot } from '../../domain/entities/bot-log-entry';

export interface BotLogTagPart {
  text: string;
  color: string;
  title?: string;
  appearance?: 'tag' | 'text';
}

export type BotLogLinePart = string | BotLogTagPart;

export function appendLogLine(
  logList: HTMLElement,
  entry: BotLogEntrySnapshot,
  parts: readonly BotLogLinePart[] = [entry.message]
): void {
  logList.append(createLogLine(entry, parts));
  logList.scrollTop = logList.scrollHeight;
}

export function upsertLogLine(
  logList: HTMLElement,
  key: string,
  entry: BotLogEntrySnapshot,
  parts: readonly BotLogLinePart[] = [entry.message]
): void {
  const existingLine = findLogLineByKey(logList, key);
  const nextLine = createLogLine(entry, parts);
  nextLine.dataset.dwarLogKey = key;

  if (existingLine) {
    existingLine.remove();
  }

  logList.append(nextLine);
  logList.scrollTop = logList.scrollHeight;
}

export function clearLogList(logList: HTMLElement): void {
  logList.replaceChildren();
}

function findLogLineByKey(logList: HTMLElement, key: string): HTMLElement | null {
  return Array.from(logList.children).find((child): child is HTMLElement => {
    return child instanceof HTMLElement && child.dataset.dwarLogKey === key;
  }) ?? null;
}

function createLogLine(entry: BotLogEntrySnapshot, parts: readonly BotLogLinePart[]): HTMLElement {
  const line = document.createElement('div');
  line.className = 'dwar-log-line';
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

  if (part.appearance === 'text') {
    return createColoredTextPart(part);
  }

  return createTagPart(part);
}

function createColoredTextPart(part: BotLogTagPart): HTMLElement {
  const text = document.createElement('span');
  text.className = 'dwar-log-colored-text';
  text.textContent = part.text;
  text.style.setProperty('--dwar-log-text-color', part.color);

  if (part.title) {
    text.title = part.title;
  }

  return text;
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
