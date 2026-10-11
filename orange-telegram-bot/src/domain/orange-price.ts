import { Decimal } from "decimal.js";

export interface OrangePrice {
  rubPerKg: Decimal;
}

export function manualPrice(value = "110"): OrangePrice {
  const rubPerKg = new Decimal(value.replace(",", "."));
  if (!rubPerKg.isFinite() || rubPerKg.lte(0))
    throw new Error("ORANGE_PRICE_RUB_PER_KG должен быть положительным числом");
  return { rubPerKg };
}
