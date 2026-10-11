// Complete money words; only explicit denominations can imply an omitted count of one.
interface CurrencyGroup {
  multiplier: number;
  forms: readonly string[];
}
const groups: readonly CurrencyGroup[] = [
  {
    multiplier: 1,
    forms: [
      "₽",
      "руб",
      "руб.",
      "р",
      "р.",
      "рубль",
      "рубля",
      "рублей",
      "рубли",
      "rub",
      "rur",
      "ruble",
      "rubles",
      "rouble",
      "roubles",
      "рублик",
      "рублика",
      "рублики",
      "рубликов",
      "рублишко",
      "рублишка",
      "рублишки",
      "рублишек",
      "рублёк",
      "рублек",
      "рублёчек",
      "рублечек",
      "рублёчка",
      "рублечка",
      "рублёчки",
      "рублечки",
      "рублёчков",
      "рублечков",
      "рубас",
      "рубаса",
      "рубасы",
      "рубасов",
      "рубос",
      "рубоса",
      "рубосы",
      "рубосов",
      "рэ",
      "ре",
      "рэшка",
      "рэшки",
      "рэшек",
      "деревянный",
      "деревянного",
      "деревянные",
      "деревянных",
      "тугрик",
      "тугрика",
      "тугрики",
      "тугриков",
      "целковый",
      "целкового",
      "целковые",
      "целковых",
      "рупь",
      "рупля",
      "руплей",
      "рупчик",
      "рупчика",
      "рупчики",
      "рупчиков",
    ],
  },
  { multiplier: 5, forms: ["пятак", "пятака", "пятаки", "пятаков"] },
  { multiplier: 10, forms: ["червонец", "червонца", "червонцы", "червонцев"] },
  {
    multiplier: 50,
    forms: [
      "полтинник",
      "полтинника",
      "полтинники",
      "полтинников",
      "полтос",
      "полтоса",
      "полтосов",
      "полсотни",
    ],
  },
  {
    multiplier: 100,
    forms: [
      "стольник",
      "стольника",
      "стольники",
      "стольников",
      "сотка",
      "сотки",
      "сотку",
      "соток",
      "сотня",
      "сотни",
      "сотню",
      "сотен",
      "соточка",
      "соточки",
      "соточку",
      "соточек",
    ],
  },
  {
    multiplier: 200,
    forms: ["двухсотка", "двухсотки", "двухсотку", "двухсоток"],
  },
  {
    multiplier: 300,
    forms: [
      "трёхсотка",
      "трёхсотки",
      "трёхсотку",
      "трёхсоток",
      "трехсотка",
      "трехсотки",
      "трехсотку",
      "трехсоток",
    ],
  },
  {
    multiplier: 500,
    forms: [
      "пятихатка",
      "пятихатки",
      "пятихатку",
      "пятихаток",
      "пятисотка",
      "пятисотки",
      "пятисотку",
      "пятисоток",
      "полкосаря",
      "полкосарика",
    ],
  },
  {
    multiplier: 1000,
    forms: [
      "косарь",
      "косаря",
      "косари",
      "косарей",
      "косарик",
      "косарика",
      "косарики",
      "косариков",
    ],
  },
  {
    multiplier: 1000000,
    forms: [
      "лям",
      "ляма",
      "лямы",
      "лямов",
      "лямчик",
      "лямчика",
      "лямчики",
      "лямчиков",
    ],
  },
  { multiplier: 500000, forms: ["полляма", "поллямчика"] },
];
// A scale can follow a count alone or precede a currency. It is applied only once.
const scaleGroups = [
  {
    multiplier: 1000,
    suffixes: ["к", "k", "тыс", "тыс."],
    words: [
      "тысяча",
      "тысячи",
      "тысяч",
      "тысячу",
      "тысяче",
      "тысячам",
      "тысячами",
      "тысячах",
      "тыща",
      "тыщи",
      "тыщу",
      "тыщ",
    ],
  },
  {
    multiplier: 1000000,
    suffixes: ["кк", "kk", "млн", "млн.", "мил", "мил."],
    words: [
      "миллион",
      "миллиона",
      "миллионов",
      "миллионы",
      "миллиону",
      "миллионом",
      "миллионам",
      "миллионами",
      "миллионах",
    ],
  },
  {
    multiplier: 1000000000,
    suffixes: ["ккк", "kkk", "млрд", "млрд."],
    words: [
      "миллиард",
      "миллиарда",
      "миллиардов",
      "миллиарды",
      "миллиарду",
      "миллиардом",
      "миллиардам",
      "миллиардами",
      "миллиардах",
      "ярд",
      "ярда",
      "ярды",
      "ярдов",
    ],
  },
  {
    multiplier: 1000000000000,
    suffixes: ["кккк", "kkkk", "трлн", "трлн."],
    words: [
      "триллион",
      "триллиона",
      "триллионов",
      "триллионы",
      "триллиону",
      "триллионом",
      "триллионам",
      "триллионами",
      "триллионах",
    ],
  },
];
const scales = new Map(
  scaleGroups.flatMap((group) =>
    [...group.suffixes, ...group.words].map(
      (form) => [form, group.multiplier] as const,
    ),
  ),
);
const multipliers = new Map(
  groups.flatMap((group) =>
    group.forms.map((form) => [form, group.multiplier] as const),
  ),
);
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function pattern(forms: readonly string[]): string {
  return [...forms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
}
export const rubCurrencyPattern = pattern([...multipliers.keys()]);
export const rubScalePattern = pattern([...scales.keys()]);
export const rubStandalonePattern = pattern([
  ...groups
    .filter((group) => group.multiplier > 1)
    .flatMap((group) => group.forms),
  ...scaleGroups.flatMap((group) => group.words),
]);
export function rubCurrencyMultiplier(alias: string): number {
  return multipliers.get(alias.toLowerCase())!;
}
export function rubScaleMultiplier(alias: string): number {
  return scales.get(alias.toLowerCase())!;
}
export function rubStandaloneMultiplier(alias: string): number {
  return (
    multipliers.get(alias.toLowerCase()) ?? scales.get(alias.toLowerCase())!
  );
}
