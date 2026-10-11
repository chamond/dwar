import { Decimal } from "decimal.js";
import type { OrangePrice } from "./orange-price.js";
import type { RubAmount } from "./parse-rub-amounts.js";

export function formatDecimal(value: Decimal): string {
  const [whole, fraction] = value.toFixed().split(".");
  return (
    whole!.replace(/\B(?=(\d{3})+(?!\d))/g, " ") +
    (fraction ? "," + fraction : "")
  );
}
export function orangeKg(rubles: Decimal, price: Decimal): Decimal {
  return rubles.div(price);
}
export function formatKg(value: Decimal): string {
  const rounded = value.abs().gte(1)
    ? value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    : value.toSignificantDigits(3, Decimal.ROUND_HALF_UP);
  return formatDecimal(rounded);
}
export function formatReply(
  amounts: readonly RubAmount[],
  price: OrangePrice,
): string {
  return amounts
    .slice(0, 5)
    .map(
      (a) =>
        `🍊 ${formatDecimal(a.rubles)} ₽ -> ${formatKg(orangeKg(a.rubles, price.rubPerKg))} кг апельсинов`,
    )
    .join("\n");
}
