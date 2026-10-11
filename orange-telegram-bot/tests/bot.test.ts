import type { AbortSignal } from "abort-controller";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firstValueFrom, of, tap, throwError } from "rxjs";
import type { Update } from "grammy/types";
import { Database } from "../src/infrastructure/database.js";
import type { OrangePrice } from "../src/domain/orange-price.js";
import { Outbox } from "../src/application/outbox.js";
import { MessageHandler } from "../src/application/message-handler.js";
import { createBot } from "../src/presentation/bot.js";
import { config } from "../src/config.js";

let db: Database;
let outbox: Outbox;
let price: OrangePrice;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-11T00:00:00Z"));
  db = new Database(":memory:");
  price = config({ BOT_TOKEN: "123:test" }).price;
  outbox = new Outbox(() => {});
});
afterEach(() => {
  outbox.close();
  db.close();
  vi.useRealTimers();
});
const incoming = (text = "100 ₽ и 250 руб.") => ({
  chatId: -1,
  messageId: 10,
  chatType: "supergroup",
  date: Math.floor(Date.now() / 1000),
  threadId: 7,
  isBot: false,
  text,
});
describe("message use case", () => {
  it("replies once for duplicate delivery and all amounts, preserving forum context", () => {
    const send = vi.fn(() => of(undefined));
    const handler = new MessageHandler(db, price, outbox, send, () => {});
    handler.handle(incoming());
    handler.handle(incoming());
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]).toEqual([
      "🍊 100 ₽ -> 0,909 кг апельсинов\n🍊 250 ₽ -> 2,27 кг апельсинов",
      { chatId: -1, messageId: 10, threadId: 7 },
    ]);
  });
  it.each(["none", "disabled", "bot", "private", "channel", "command", "old"])(
    "ignores %s",
    (kind) => {
      const msg = incoming();
      const send = vi.fn(() => of(undefined));
      if (kind === "none") msg.text = "500";
      if (kind === "disabled") db.setEnabled(-1, false);
      if (kind === "bot") msg.isBot = true;
      if (kind === "private" || kind === "channel") msg.chatType = kind;
      if (kind === "command") msg.text = "/test 500 ₽";
      if (kind === "old") msg.date -= 40;
      new MessageHandler(db, price, outbox, send, () => {}).handle(msg);
      vi.advanceTimersByTime(1);
      expect(send).not.toHaveBeenCalled();
    },
  );
  it("honors off while an automatic reply waits in the queue", () => {
    const send = vi.fn(() => of(undefined));
    const handler = new MessageHandler(db, price, outbox, send, () => {});
    handler.handle(incoming());
    handler.handle({ ...incoming(), messageId: 11 });
    vi.advanceTimersByTime(1);
    db.setEnabled(-1, false);
    vi.advanceTimersByTime(2000);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
describe("outgoing queues", () => {
  it("limits each group to 15 automatic sends/minute and discards expired backlog", () => {
    const send = vi.fn(() => of(undefined));
    for (let i = 0; i < 30; i++) outbox.enqueue(-1, send);
    vi.advanceTimersByTime(60000);
    expect(send).toHaveBeenCalledTimes(15);
  });
  it("serializes per-chat replies, permits independent chats and bounds queues", () => {
    const send = vi.fn(() => of(undefined));
    outbox.enqueue(-1, send);
    outbox.enqueue(-1, send);
    outbox.enqueue(-2, send);
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(999);
    expect(send).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 40; i++) outbox.enqueue(-3, send);
    expect(outbox.enqueue(-3, send)).toBe(false);
  });
  it("retries definite 429 rejections then succeeds", () => {
    const send = vi
      .fn()
      .mockReturnValueOnce(
        throwError(() => ({ error_code: 429, parameters: { retry_after: 2 } })),
      )
      .mockReturnValue(of(undefined));
    outbox.enqueue(-1, send);
    vi.advanceTimersByTime(4000);
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("does not resend after ambiguous network failure or a deleted original", () => {
    const send = vi.fn(() => throwError(() => new Error("lost reply")));
    outbox.enqueue(-1, send);
    vi.advanceTimersByTime(30000);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("cancels waits on shutdown", () => {
    const send = vi.fn(() => of(undefined));
    outbox.enqueue(-1, send);
    outbox.close();
    vi.advanceTimersByTime(60000);
    expect(send).not.toHaveBeenCalled();
  });
});
describe("grammY integration", () => {
  function setup(admin = false) {
    const app = createBot(
      config({ BOT_TOKEN: "123:test" }),
      db,
      price,
      outbox,
      () => {},
    );
    app.bot.botInfo = {
      id: 123,
      is_bot: true,
      first_name: "Orange",
      username: "orange_test_bot",
      can_join_groups: true,
      can_read_all_group_messages: true,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
      has_topics_enabled: false,
      allows_users_to_create_topics: false,
      can_manage_bots: false,
      supports_join_request_queries: false,
    };
    const sent: Record<string, unknown>[] = [];
    app.bot.api.config.use((_prev, method, payload) => {
      if (method === "getChatMember")
        return firstValueFrom(
          of({
            ok: true,
            result: {
              status: admin ? "administrator" : "member",
              user: { id: 42, is_bot: false, first_name: "A" },
            },
          }),
        ) as never;
      if (method === "sendMessage") {
        sent.push(payload as unknown as Record<string, unknown>);
        return firstValueFrom(
          of({
            ok: true,
            result: {
              message_id: 99,
              date: 0,
              chat: { id: -1, type: "supergroup" },
            },
          }),
        ) as never;
      }
      return firstValueFrom(of({ ok: true, result: true })) as never;
    });
    const update = (text: string, id = 20): Update => ({
      update_id: id,
      message: {
        message_id: id,
        date: Math.floor(Date.now() / 1000),
        message_thread_id: 7,
        chat: { id: -1, type: "supergroup", title: "Test" },
        from: { id: 42, is_bot: false, first_name: "A" },
        text,
        entities: text.startsWith("/")
          ? [
              {
                type: "bot_command",
                offset: 0,
                length: text.split(" ")[0]!.length,
              },
            ]
          : [],
      },
    });
    return { app, sent, update };
  }
  it("uses reply_parameters and thread ID in Telegram request", () => {
    const { app, sent, update } = setup();
    return firstValueFrom(
      fromUpdate(app.bot.handleUpdate(update("100 ₽"))).pipe(
        tap(() => {
          vi.advanceTimersByTime(1);
          expect(sent).toHaveLength(1);
          expect(sent[0]).toMatchObject({
            chat_id: -1,
            reply_parameters: {
              message_id: 20,
              allow_sending_without_reply: false,
            },
            message_thread_id: 7,
          });
          app.close();
        }),
      ),
    );
  });
  it.each(["/rate", "/refresh", "/status", "/help"])(
    "reports the manual price for %s without refreshing a source",
    (command) => {
      const { app, sent, update } = setup();
      return firstValueFrom(
        fromUpdate(app.bot.handleUpdate(update(command))).pipe(
          tap(() => {
            vi.advanceTimersByTime(1);
            expect(sent).toHaveLength(1);
            const text = String(sent[0]?.text);
            expect(text).not.toContain("Росстат");
            expect(text).toContain("вручную");
            if (command !== "/help") expect(text).toContain("110");
            app.close();
          }),
        ),
      );
    },
  );
  it.each([false, true])("checks admin via getChatMember (%s)", (admin) => {
    const { app, sent, update } = setup(admin);
    return firstValueFrom(
      fromUpdate(app.bot.handleUpdate(update("/off"))).pipe(
        tap(() => {
          vi.advanceTimersByTime(1);
          expect(db.enabled(-1)).toBe(!admin);
          expect(sent).toHaveLength(1);
          app.close();
        }),
      ),
    );
  });
});
import { from } from "rxjs";
const fromUpdate = (promise: Promise<void>) => from(promise);

import { apiRequest } from "../src/presentation/api-request.js";
it("aborts a Telegram request when its owning subscription is cancelled", () => {
  let signal: AbortSignal | undefined;
  const owned = apiRequest((current) => {
    signal = current;
    return firstValueFrom(of("sent"));
  }).subscribe();
  owned.unsubscribe();
  expect(signal?.aborted).toBe(true);
});
it("keeps retries within the per-group minute budget", () => {
  const send = vi
    .fn()
    .mockReturnValueOnce(
      throwError(() => ({ error_code: 429, parameters: { retry_after: 1 } })),
    )
    .mockReturnValue(of(undefined));
  for (let i = 0; i < 20; i++) outbox.enqueue(-1, send);
  vi.advanceTimersByTime(30000);
  expect(send).toHaveBeenCalledTimes(15);
});
