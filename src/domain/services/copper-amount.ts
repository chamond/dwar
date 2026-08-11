export interface CopperAmountParts {
  gold: number;
  silver: number;
  copper: number;
}

const COPPER_PER_SILVER = 100;
const COPPER_PER_GOLD = 10_000;

export function splitCopperAmount(amountCopper: number): CopperAmountParts {
  if (!Number.isSafeInteger(amountCopper) || amountCopper < 0) {
    throw new Error('Copper amount must be a non-negative integer.');
  }

  const gold = Math.floor(amountCopper / COPPER_PER_GOLD);
  const afterGold = amountCopper % COPPER_PER_GOLD;
  const silver = Math.floor(afterGold / COPPER_PER_SILVER);
  const copper = afterGold % COPPER_PER_SILVER;

  return {
    gold,
    silver,
    copper
  };
}
