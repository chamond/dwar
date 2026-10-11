import { expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { formatKg, formatReply, orangeKg } from "../src/domain/format-reply.js";
import { parseRubAmounts } from "../src/domain/parse-rub-amounts.js";
import { fixturePrice } from "./test-helpers.js";
it.each([
  ["1000", "5"],
  ["150", "0,75"],
  ["1", "0,005"],
  ["0.000001", "0,000000005"],
  ["-150", "-0,75"],
])("converts %s", (amount, expected) =>
  expect(formatKg(orangeKg(new Decimal(amount), new Decimal(200)))).toBe(
    expected,
  ),
);
it("uses Decimal without intermediate floating point", () =>
  expect(orangeKg(new Decimal("0.3"), new Decimal("0.1")).toString()).toBe(
    "3",
  ));
it("formats a single reply for multiple amounts and truncates", () => {
  const text = formatReply(
    parseRubAmounts("1000 ₽ 150 ₽ 1 ₽ 2 ₽ 3 ₽ 4 ₽"),
    fixturePrice(),
  );
  expect(text).toBe(
    [
      "🍊 1 000 ₽ -> 5 кг апельсинов",
      "🍊 150 ₽ -> 0,75 кг апельсинов",
      "🍊 1 ₽ -> 0,005 кг апельсинов",
      "🍊 2 ₽ -> 0,01 кг апельсинов",
      "🍊 3 ₽ -> 0,015 кг апельсинов",
    ].join("\n"),
  );
});
it("formats a single amount without any extra text", () => {
  expect(formatReply(parseRubAmounts("300 рублей"), fixturePrice())).toBe(
    "🍊 300 ₽ -> 1,5 кг апельсинов",
  );
});

it("formats short and standalone amounts as one compact reply", () => {
  expect(
    formatReply(parseRubAmounts("сотка, 10к, косарь"), fixturePrice()),
  ).toBe(
    [
      "🍊 100 ₽ -> 0,5 кг апельсинов",
      "🍊 10 000 ₽ -> 50 кг апельсинов",
      "🍊 1 000 ₽ -> 5 кг апельсинов",
    ].join("\n"),
  );
});

it("formats ordinary scales without extra text or duplicate conversions", () => {
  expect(
    formatReply(
      parseRubAmounts("70 тысяч рублей, 1,5 миллиона, миллиард"),
      fixturePrice(),
    ),
  ).toBe(
    [
      "🍊 70 000 ₽ -> 350 кг апельсинов",
      "🍊 1 500 000 ₽ -> 7 500 кг апельсинов",
      "🍊 1 000 000 000 ₽ -> 5 000 000 кг апельсинов",
    ].join("\n"),
  );
});
