import type { BotLogEntrySnapshot } from '../../domain/entities/bot-log-entry';

export function appendLogLine(logList: HTMLElement, entry: BotLogEntrySnapshot): void {
  logList.append(createLogLine(entry));
  logList.scrollTop = logList.scrollHeight;
}

function createLogLine(entry: BotLogEntrySnapshot): HTMLElement {
  const line = document.createElement('div');
  line.className = 'dwar-log-line';
  line.textContent = `${formatTime(entry.createdAt)}: ${entry.message}`;

  return line;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

