// Only structured, explicitly selected fields. Never pass Telegram payloads or raw errors.
import type { Logger } from "../application/ports.js";
export type { Logger } from "../application/ports.js";
export function logger(level: "info" | "error"): Logger {
  return (event, fields = {}) => {
    if (level === "error" && !event.includes("error")) return;
    console.log(
      JSON.stringify({ time: new Date().toISOString(), event, ...fields }),
    );
  };
}
