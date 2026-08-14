import type {
  HuntAttackEvent,
  HuntAttackMobInfo
} from '../../application/events/hunt-attack-event';
import type { AddBotLog } from './bot-log-appender';
import type { BotLogLinePart } from './log-list';

export function presentHuntAttackEvent(
  event: HuntAttackEvent,
  addLog: AddBotLog
): void {
  switch (event.type) {
    case 'no-safe-target':
      addLog(
        event.targetCandidateCount === 0
          ? 'Целевой моб не найден.'
          : 'Безопасный целевой моб не найден: рядом моб другого вида.',
        {
          tone: 'failure'
        }
      );
      return;

    case 'attack-request-sent':
      addLog(
        `Отправлен запрос нападения на ${formatMobLabel(event.mob)}.`,
        {
          parts: [
            'Отправлен запрос нападения на ',
            createMobLogPart(event.mob),
            '.'
          ],
          tone: 'success'
        }
      );
      return;

    case 'fight-finished':
      addLog(
        `Бой после нападения на ${formatMobLabel(event.mob)} завершён.`,
        {
          parts: [
            'Бой после нападения на ',
            createMobLogPart(event.mob),
            ' завершён.'
          ],
          tone: 'success'
        }
      );
      return;
  }
}

function formatMobLabel(mob: HuntAttackMobInfo): string {
  return `${mob.name}[${mob.level}]`;
}

function createMobLogPart(mob: HuntAttackMobInfo): BotLogLinePart {
  return {
    text: formatMobLabel(mob),
    color: mob.aggressionColor,
    title: `Агрессия ${mob.aggressionLevel}`
  };
}
