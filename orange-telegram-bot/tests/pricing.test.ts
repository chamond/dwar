import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { config } from "../src/config.js";
import { formatReply } from "../src/domain/format-reply.js";
import { parseRubAmounts } from "../src/domain/parse-rub-amounts.js";
import { Database } from "../src/infrastructure/database.js";

describe("manual orange price", () => {
  it("uses 110 RUB/kg immediately without a price cache", () => {
    const settings = config({ BOT_TOKEN: "test" });
    expect(settings.price.rubPerKg.toString()).toBe("110");
    expect(
      formatReply(parseRubAmounts("110 рублей, 300 рублей"), settings.price),
    ).toBe("🍊 110 ₽ -> 1 кг апельсинов\n🍊 300 ₽ -> 2,73 кг апельсинов");
  });
  it.each(["90", "72.5", "72,5", "0.001"])(
    "accepts a manually configured price %s",
    (value) => {
      const settings = config({
        BOT_TOKEN: "test",
        ORANGE_PRICE_RUB_PER_KG: value,
      });
      expect(settings.price.rubPerKg.toString()).toBe(value.replace(",", "."));
    },
  );
  it.each(["0", "-1", "NaN", "Infinity", "-Infinity", "", "abc"])(
    "rejects invalid price %s",
    (value) => {
      expect(() =>
        config({ BOT_TOKEN: "test", ORANGE_PRICE_RUB_PER_KG: value }),
      ).toThrow();
    },
  );
  it("ignores retired source settings", () => {
    const settings = config({
      BOT_TOKEN: "test",
      PRICE_UPDATE_INTERVAL_HOURS: "NaN",
      MAX_PRICE_AGE_DAYS: "0",
      MIN_PRICE_RUB_PER_KG: "100",
      MAX_PRICE_RUB_PER_KG: "1",
    });
    expect(settings.price.rubPerKg.toString()).toBe("110");
  });
  it("requires the Telegram token and validates the log level", () => {
    expect(() => config({})).toThrow();
    expect(() => config({ BOT_TOKEN: "test", LOG_LEVEL: "debug" })).toThrow();
  });
});

describe("persistent chat state", () => {
  it("preserves settings and idempotency in a volume containing a retired price cache", () => {
    const directory = mkdtempSync(join(tmpdir(), "orange-bot-"));
    const path = join(directory, "bot.sqlite");
    try {
      const legacy = new DatabaseSync(path);
      legacy.exec(`CREATE TABLE prices (id INTEGER PRIMARY KEY, payload TEXT NOT NULL);
        INSERT INTO prices VALUES (1, '{"rubPerKg":"154.67"}');`);
      legacy.close();
      const first = new Database(path);
      try {
        first.setEnabled(-1, false);
        expect(first.claim(-1, 42, Date.now())).toBe(true);
      } finally {
        first.close();
      }
      const second = new Database(path);
      try {
        expect(second.enabled(-1)).toBe(false);
        expect(second.enabled(-2)).toBe(true);
        expect(second.claim(-1, 42, Date.now())).toBe(false);
        expect(
          config({
            BOT_TOKEN: "test",
            DATABASE_PATH: path,
          }).price.rubPerKg.toString(),
        ).toBe("110");
      } finally {
        second.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
