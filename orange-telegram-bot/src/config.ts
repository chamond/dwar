import { manualPrice, type OrangePrice } from "./domain/orange-price.js";

export interface Config {
  token: string;
  databasePath: string;
  price: OrangePrice;
  logLevel: "info" | "error";
}
export function config(env = process.env): Config {
  if (!env.BOT_TOKEN) throw new Error("Задайте BOT_TOKEN в .env");
  if (env.LOG_LEVEL && !["info", "error"].includes(env.LOG_LEVEL))
    throw new Error("LOG_LEVEL: info или error");
  return {
    token: env.BOT_TOKEN,
    databasePath: env.DATABASE_PATH ?? "./data/orange-bot.sqlite",
    price: manualPrice(env.ORANGE_PRICE_RUB_PER_KG),
    logLevel: env.LOG_LEVEL === "error" ? "error" : "info",
  };
}
