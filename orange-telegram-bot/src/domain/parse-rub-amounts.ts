import { rubWordAmount, rubWordAmountPattern } from "./rub-word-amounts.js";
import {
  rubCurrencyMultiplier,
  rubCurrencyPattern,
  rubStandalonePattern,
  rubScalePattern,
  rubScaleMultiplier,
  rubStandaloneMultiplier,
} from "./rub-currency-aliases.js";
import { Decimal } from "decimal.js";

export interface TextEntity {
  type: string;
  offset: number;
  length: number;
}
export interface RubAmount {
  original: string;
  rubles: Decimal;
  offset: number;
}
const space = /[\s\u00a0\u202f]/g;
const numberPattern = "-?\\d(?:[\\d., \\u00a0\\u202f]{0,80}\\d)?";

const pattern = new RegExp(
  `₽[ \\u00a0\\u202f]*(?<prefixedNumber>${numberPattern})(?![\\p{L}\\p{N}_]|[.,]\\d)|(?:(?<number>${numberPattern})[ \\u00a0\\u202f]*|(?<word>${rubWordAmountPattern})[ \\u00a0\\u202f]+)(?:(?<scale>${rubScalePattern})[ \\u00a0\\u202f]*(?<scaledCurrency>${rubCurrencyPattern})?|(?<currency>${rubCurrencyPattern}))(?![\\p{L}\\p{N}_])|(?<standalone>${rubStandalonePattern})(?![\\p{L}\\p{N}_])`,
  "giu",
);

function numberValue(raw: string): string | undefined {
  const value = raw.replace(/[\u00a0\u202f]/g, " ");
  const unsigned = value.replace(/^-/, "");
  // Grouping must be complete. A single dot followed by three digits means thousands.
  if (/^\d{1,3}(?: +\d{3})+(?:[,.]\d{1,6})?$/.test(unsigned))
    return value.replace(space, "").replace(",", ".");
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,6})?$/.test(unsigned))
    return value.replace(/\./g, "").replace(",", ".");
  if (/^\d+(?:[,.]\d{1,6})?$/.test(unsigned)) return value.replace(",", ".");
  return undefined;
}

export function parseRubAmounts(
  text: string,
  entities: readonly TextEntity[] = [],
): RubAmount[] {
  if (text.length > 16384) return [];
  const excluded = entities
    .filter((e) =>
      ["code", "pre", "url", "text_link", "phone_number"].includes(e.type),
    )
    .map((e) => [e.offset, e.offset + e.length]);
  for (const match of text.matchAll(/(?:https?:\/\/|www\.)\S+/gi))
    excluded.push([match.index, match.index + match[0].length]);
  const result: RubAmount[] = [];
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    const end = start + match[0].length;
    if (excluded.some(([a, b]) => start < b! && end > a!)) continue;
    const {
      prefixedNumber,
      word,
      scale,
      currency,
      scaledCurrency,
      standalone,
    } = match.groups!;
    const number = prefixedNumber ?? match.groups!.number;
    const leftBoundary =
      number === undefined ? /[\p{L}\p{N}_+\-]/u : /[\p{L}\p{N}_.,+\-–—]/u;
    if (start > 0 && leftBoundary.test(text[start - 1]!)) continue;
    // Do not extract the trailing portion of a phone number or range.
    if (
      /(?:\d[–—-]|\+\d[\d ()-]*)\s*$/.test(
        text.slice(Math.max(0, start - 30), start),
      )
    )
      continue;
    const parsed =
      number !== undefined
        ? numberValue(number)
        : word !== undefined
          ? rubWordAmount(word)
          : "1";
    if (parsed === undefined) continue;
    const rubles = new Decimal(parsed)
      .mul(scale ? rubScaleMultiplier(scale) : 1)
      .mul(
        standalone
          ? rubStandaloneMultiplier(standalone)
          : currency || scaledCurrency
            ? rubCurrencyMultiplier(currency ?? scaledCurrency!)
            : 1,
      );
    if (rubles.isFinite() && rubles.abs().lte("1000000000000"))
      result.push({ original: match[0], rubles, offset: start });
    if (result.length === 6) break; // Five displayed values and a truncation marker.
  }
  return result;
}
