import type { SplinterHealerThanksEvent } from '../../application/events/splinter-healer-thanks-event';
import type { AddBotLog } from './bot-log-appender';

export function presentSplinterHealerThanksEvent(
  event: SplinterHealerThanksEvent,
  addLog: AddBotLog
): void {
  switch (event.type) {
    case 'healer-detected':
      addLog(
        `Занозу снял ${event.healerNick}. Благодарность будет отправлена через ${formatSeconds(event.delayMs)}.`
      );
      return;

    case 'thanks-sent':
      addLog(
        `Игроку ${event.healerNick} отправлена благодарность: «${event.message}».`,
        { tone: 'success' }
      );
      return;
  }
}

function formatSeconds(durationMs: number): string {
  const seconds = durationMs / 1_000;

  return `${seconds.toLocaleString('ru-RU', { maximumFractionDigits: 3 })} сек`;
}
