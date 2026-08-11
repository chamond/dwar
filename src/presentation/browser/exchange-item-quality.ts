import type { ExchangeItemQuality } from '../../domain/entities/exchange-monitoring-rule';

export interface ExchangeItemQualityPresentation {
  value: ExchangeItemQuality;
  label: string;
  color: string;
}

export const EXCHANGE_ITEM_QUALITY_OPTIONS: readonly ExchangeItemQualityPresentation[] = [
  { value: -1, label: 'Все', color: '#aeb8c7' },
  { value: 0, label: 'Серый', color: '#9aa3af' },
  { value: 1, label: 'Зелёный', color: '#63c94f' },
  { value: 2, label: 'Синий', color: '#6f82ff' },
  { value: 3, label: 'Фиолетовый', color: '#d169e3' },
  { value: 4, label: 'Красный', color: '#ff6262' },
  { value: 5, label: 'Бирюзовый', color: '#45c6c9' }
];

export function getExchangeItemQualityPresentation(
  quality: ExchangeItemQuality
): ExchangeItemQualityPresentation {
  const presentation = EXCHANGE_ITEM_QUALITY_OPTIONS.find(
    (candidate) => candidate.value === quality
  );

  if (!presentation) {
    throw new Error(`Unknown exchange item quality: ${String(quality)}.`);
  }

  return presentation;
}
