import type { BotStore } from "../application/ports.js";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class Database implements BotStore {
  private readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY, enabled INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS messages (chat_id INTEGER NOT NULL, message_id INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(chat_id,message_id));`);
  }
  enabled(chat: number): boolean {
    return (
      this.db.prepare("SELECT enabled FROM chats WHERE id=?").get(chat)
        ?.enabled !== 0
    );
  }
  setEnabled(chat: number, enabled: boolean): void {
    this.db
      .prepare(
        "INSERT INTO chats VALUES (?,?) ON CONFLICT(id) DO UPDATE SET enabled=excluded.enabled",
      )
      .run(chat, Number(enabled));
  }
  claim(chat: number, message: number, now: number): boolean {
    this.db
      .prepare("DELETE FROM messages WHERE created_at < ?")
      .run(now - 7 * 86400000);
    return (
      this.db
        .prepare("INSERT OR IGNORE INTO messages VALUES (?,?,?)")
        .run(chat, message, now).changes === 1
    );
  }
  close(): void {
    this.db.close();
  }
}
