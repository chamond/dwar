import type { SplinterHelpEvent } from '../../application/events/splinter-help-event';
import type { LocationPlayerSnapshot } from '../../domain/entities/location-player';
import type { AddBotLog } from './bot-log-appender';

export function presentSplinterHelpEvent(
  event: SplinterHelpEvent,
  addLog: AddBotLog
): void {
  switch (event.type) {
    case 'recipients-selected':
      addLog(
        `Отправляю просьбу игрокам: ${formatPlayers(event.recipients)}. Текст: «${event.message.trim()}».`
      );
      return;

    case 'message-sent':
      addLog(
        `Просьба о помощи отправлена: ${formatPlayers(event.recipients)}.`,
        { tone: 'success' }
      );
      return;

    case 'waiting-for-help':
      addLog(`Ожидаю помощи ${formatSeconds(event.delayMs)}.`);
      return;

    case 'splinter-still-present':
      addLog('Заноза ещё не снята. Ищу других игроков.');
      return;

    case 'splinter-removed':
      addLog('Заноза снята. Протокол помощи завершён.', {
        tone: 'success'
      });
      return;

    case 'no-eligible-players':
      addLog(
        `В текущей локации нет новых подходящих игроков. Повторный поиск через ${formatSeconds(event.retryDelayMs)}.`
      );
      return;
  }
}

function formatPlayers(players: readonly LocationPlayerSnapshot[]): string {
  return players.map((player) => `${player.nick}[${String(player.level)}]`).join(', ');
}

function formatSeconds(durationMs: number): string {
  return `${Math.round(durationMs / 1_000)} сек`;
}
