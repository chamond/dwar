const counts = [
  { value: "1", forms: ["один", "одна", "одно", "одного", "одну"] },
  { value: "2", forms: ["два", "две", "двух", "пара", "пару", "пары"] },
  { value: "3", forms: ["три", "трёх", "трех"] },
  { value: "4", forms: ["четыре", "четырёх", "четырех"] },
  { value: "5", forms: ["пять", "пяти"] },
  { value: "6", forms: ["шесть", "шести"] },
  { value: "7", forms: ["семь", "семи"] },
  { value: "8", forms: ["восемь", "восьми"] },
  { value: "9", forms: ["девять", "девяти"] },
  { value: "10", forms: ["десять", "десяти"] },
  { value: "11", forms: ["одиннадцать", "одиннадцати"] },
  { value: "12", forms: ["двенадцать", "двенадцати"] },
  { value: "13", forms: ["тринадцать", "тринадцати"] },
  { value: "14", forms: ["четырнадцать", "четырнадцати"] },
  { value: "15", forms: ["пятнадцать", "пятнадцати"] },
  { value: "16", forms: ["шестнадцать", "шестнадцати"] },
  { value: "17", forms: ["семнадцать", "семнадцати"] },
  { value: "18", forms: ["восемнадцать", "восемнадцати"] },
  { value: "19", forms: ["девятнадцать", "девятнадцати"] },
  { value: "20", forms: ["двадцать", "двадцати"] },
  { value: "30", forms: ["тридцать", "тридцати"] },
  { value: "40", forms: ["сорок", "сорока"] },
  { value: "50", forms: ["пятьдесят", "пятидесяти"] },
  { value: "60", forms: ["шестьдесят", "шестидесяти"] },
  { value: "70", forms: ["семьдесят", "семидесяти"] },
  { value: "80", forms: ["восемьдесят", "восьмидесяти"] },
  { value: "90", forms: ["девяносто", "девяноста"] },
  { value: "100", forms: ["сто", "ста"] },
  { value: "200", forms: ["двести", "двухсот"] },
  { value: "300", forms: ["триста", "трёхсот", "трехсот"] },
  { value: "400", forms: ["четыреста", "четырёхсот", "четырехсот"] },
  { value: "500", forms: ["пятьсот", "пятисот"] },
  { value: "600", forms: ["шестьсот", "шестисот"] },
  { value: "700", forms: ["семьсот", "семисот"] },
  { value: "800", forms: ["восемьсот", "восьмисот"] },
  { value: "900", forms: ["девятьсот", "девятисот"] },
  { value: "1.5", forms: ["полтора", "полторы"] },
  { value: "0.5", forms: ["половина", "половину"] },
];
const values = new Map(
  counts.flatMap((count) =>
    count.forms.map((form) => [form, count.value] as const),
  ),
);
const atom = [...values.keys()].sort((a, b) => b.length - a.length).join("|");
export const rubWordAmountPattern = `(?:${atom})(?:[ \\u00a0\\u202f]+(?:${atom})){0,2}`;
export function rubWordAmount(word: string): string | undefined {
  const parts = word
    .toLowerCase()
    .split(/[ \u00a0\u202f]+/)
    .map((part) => values.get(part));
  if (parts.some((part) => part === undefined)) return undefined;
  if (parts.length === 1) return parts[0];
  // Compound integers follow hundreds -> tens/teens -> units, never arbitrary sums.
  const numbers = parts.map(Number);
  const hundred = (n: number) => n >= 100 && n <= 900 && n % 100 === 0;
  const ten = (n: number) => n >= 20 && n <= 90 && n % 10 === 0;
  const unit = (n: number) => n >= 1 && n <= 9 && Number.isInteger(n);
  const low = (n: number) => unit(n) || (n >= 10 && n <= 19) || ten(n);
  const valid =
    numbers.length === 2
      ? (hundred(numbers[0]!) && low(numbers[1]!)) ||
        (ten(numbers[0]!) && unit(numbers[1]!))
      : hundred(numbers[0]!) && ten(numbers[1]!) && unit(numbers[2]!);
  return valid ? String(numbers.reduce((total, n) => total + n, 0)) : undefined;
}
