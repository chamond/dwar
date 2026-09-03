import type {
  ResourceMiningEvent,
  ResourceMiningMobInfo,
  ResourceMiningResourceInfo
} from '../../application/events/resource-mining-event';
import type { AddBotLog } from './bot-log-appender';
import type { BotLogLinePart } from './log-list';
import type { ProcessBarController } from './process-bar';
import { formatResourceLabel } from './resource-label';

export type MiningPhase = 'idle' | 'busy' | 'active' | 'waiting' | 'pause' | 'complete';

export function presentMiningEvent(
  event: ResourceMiningEvent,
  addLog: AddBotLog,
  processBar: ProcessBarController
): void {
  updateMiningProcessBar(event, processBar);
  logMiningEvent(event, addLog);
}

export function getMiningPhase(event: ResourceMiningEvent): MiningPhase {
  switch (event.type) {
    case 'scan-started':
    case 'scan-completed':
      return 'busy';

    case 'no-safe-resource':
      return 'pause';

    case 'farm-started':
      return 'active';

    case 'monitoring-scan-started':
    case 'monitoring-scan-completed':
      return event.nominalDurationElapsed ? 'waiting' : 'active';

    case 'farm-completed':
    case 'farm-failed':
      return 'complete';

    case 'farm-cancelled':
    case 'farm-interrupted':
    case 'splinter-detected':
      return 'idle';
  }
}

export function isMiningAttemptTerminal(event: ResourceMiningEvent): boolean {
  return event.type === 'farm-completed'
    || event.type === 'farm-failed'
    || event.type === 'farm-cancelled'
    || event.type === 'farm-interrupted';
}

function updateMiningProcessBar(
  event: ResourceMiningEvent,
  processBar: ProcessBarController
): void {
  switch (event.type) {
    case 'scan-started':
    case 'scan-completed':
      return;

    case 'no-safe-resource':
      processBar.start({
        label: 'Пауза поиска',
        durationMs: event.delayMs
      });
      return;

    case 'farm-started':
      processBar.start({
        label: `Добыча ${formatResourceLabel(event.resource)}`,
        durationMs: event.durationMs,
        accentColor: event.resource.markerColor
      });
      return;

    case 'farm-cancelled':
    case 'farm-interrupted':
    case 'splinter-detected':
      processBar.reset();
      return;

    case 'monitoring-scan-started':
      processBar.setLabel(`Проверка ${formatResourceLabel(event.resource)}`);
      return;

    case 'monitoring-scan-completed':
      processBar.setLabel(
        event.nominalDurationElapsed
          ? `Ожидание результата ${formatResourceLabel(event.resource)}`
          : `Добыча ${formatResourceLabel(event.resource)}`
      );
      return;

    case 'farm-completed':
    case 'farm-failed':
      processBar.complete();
      return;
  }
}

function logMiningEvent(event: ResourceMiningEvent, addLog: AddBotLog): void {
  switch (event.type) {
    case 'scan-started':
    case 'monitoring-scan-started':
    case 'monitoring-scan-completed':
      return;

    case 'scan-completed':
      addLog(
        `Скан: мобов ${event.totalMobCount}, опасных ${event.dangerousMobCount}, ресурсов ${event.selectedResourceCount}, безопасных ${event.safeResourceCount}.`
      );
      return;

    case 'no-safe-resource':
      addLog(
        event.selectedResourceCount === 0
          ? `Выбранные ресурсы не найдены, пауза ${formatSeconds(event.delayMs)}.`
          : `Безопасных ресурсов нет, пауза ${formatSeconds(event.delayMs)}.`
      );
      return;

    case 'farm-started':
      addLog(
        `Начата добыча ${formatResourceLabel(event.resource)} (num: ${event.resource.serverNumber}).`,
        {
          parts: [
            'Начата добыча ',
            createResourceLogPart(event.resource),
            ` (num: ${event.resource.serverNumber}).`
          ]
        }
      );
      return;

    case 'farm-cancelled':
      addLog(
        `Добыча отменена: ${formatResourceLabel(event.resource)} занят.`,
        {
          parts: [
            'Добыча отменена: ',
            createResourceLogPart(event.resource),
            ' занят.'
          ]
        }
      );
      return;

    case 'farm-interrupted':
      addLog(
        'Добыча прервана: рядом опасный моб.',
        {
          parts: createDangerLogParts('Добыча прервана: рядом ', event.dangerousMob)
        }
      );
      return;

    case 'farm-completed':
      addLog(
        `Добыча завершена: ${formatResourceLabel(event.resource)}.`,
        {
          parts: [
            'Добыча завершена: ',
            createResourceLogPart(event.resource),
            '.'
          ],
          tone: 'success'
        }
      );
      return;

    case 'farm-failed':
      addLog(
        `Добыча не удалась: ${formatResourceLabel(event.resource)}.`,
        {
          parts: [
            'Добыча не удалась: ',
            createResourceLogPart(event.resource),
            '.'
          ],
          tone: 'failure'
        }
      );
      return;

    case 'splinter-detected':
      addLog('Добыча остановлена: обнаружена заноза.', {
        tone: 'failure'
      });
      return;
  }
}

function createDangerLogParts(
  prefix: string,
  mob: ResourceMiningMobInfo | null
): readonly BotLogLinePart[] {
  if (!mob) {
    return [`${prefix}опасность рядом.`];
  }

  return [
    prefix,
    createMobLogPart(mob),
    '.'
  ];
}

function createResourceLogPart(resource: ResourceMiningResourceInfo): BotLogLinePart {
  const label = formatResourceLabel(resource);

  return {
    text: label,
    color: resource.markerColor,
    title: `Ресурс ${label}`
  };
}

function createMobLogPart(mob: ResourceMiningMobInfo): BotLogLinePart {
  return {
    text: `${mob.name}[${mob.level}]`,
    color: mob.aggressionColor,
    title: `Агрессия ${mob.aggressionLevel}`
  };
}

function formatSeconds(durationMs: number): string {
  return `${Math.round(durationMs / 1000)} сек`;
}
