import type { BotLogEntrySnapshot } from '../../domain/entities/bot-log-entry';

export interface BotLogTagPart {
  text: string;
  color: string;
  title?: string;
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

export function clearLogList(logList: HTMLElement): void {
  logList.replaceChildren();
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
