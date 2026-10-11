import { EMPTY, type Observable } from "rxjs";
import {
  parseRubAmounts,
  type TextEntity,
} from "../domain/parse-rub-amounts.js";
import { formatReply } from "../domain/format-reply.js";
import type { BotStore } from "./ports.js";
import type { Logger } from "./ports.js";
import type { OrangePrice } from "../domain/orange-price.js";
import type { Outbox } from "./outbox.js";

export interface IncomingMessage {
  chatId: number;
  messageId: number;
  chatType: string;
  date: number;
  threadId?: number;
  isBot: boolean;
  text?: string;
  entities?: readonly TextEntity[];
}
export interface ReplyTarget {
  chatId: number;
  messageId: number;
  threadId?: number;
}
export class MessageHandler {
  constructor(
    private readonly db: BotStore,
    private readonly price: OrangePrice,
    private readonly outbox: Outbox,
    private readonly send: (
      text: string,
      target: ReplyTarget,
    ) => Observable<unknown>,
    private readonly log: Logger,
    private readonly now = () => Date.now(),
  ) {}
  handle(message: IncomingMessage): void {
    if (
      !["group", "supergroup"].includes(message.chatType) ||
      message.isBot ||
      !message.text ||
      message.text.trimStart().startsWith("/") ||
      message.entities?.some(
        (e) => e.type === "bot_command" && e.offset === 0,
      ) ||
      !this.db.enabled(message.chatId) ||
      this.now() - message.date * 1000 > 30000
    )
      return;
    const amounts = parseRubAmounts(message.text, message.entities);
    if (
      !amounts.length ||
      !this.db.claim(message.chatId, message.messageId, this.now())
    )
      return;
    const reply = formatReply(amounts, this.price);
    const target = {
      chatId: message.chatId,
      messageId: message.messageId,
      threadId: message.threadId,
    };
    this.outbox.enqueue(
      message.chatId,
      () => {
        if (!this.db.enabled(message.chatId)) return EMPTY;
        return this.send(reply, target);
      },
      true,
      message.date * 1000,
    );
    this.log("conversion_queued", {
      chat_id: message.chatId,
      message_id: message.messageId,
      count: Math.min(5, amounts.length),
      rub_per_kg: this.price.rubPerKg.toString(),
    });
  }
}
