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

    case 'confirmation-opened':
      addLog(
        `Открыто подтверждение нападения на ${formatMobLabel(event.mob)}.`,
        {
          parts: [
            'Открыто подтверждение нападения на ',
            createMobLogPart(event.mob),
            '.'
          ]
        }
      );
      return;

    case 'fight-opened':
      addLog(
        `Начато нападение на ${formatMobLabel(event.mob)}.`,
        {
          parts: [
            'Начато нападение на ',
            createMobLogPart(event.mob),
            '.'
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
