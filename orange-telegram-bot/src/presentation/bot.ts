import { apiRequest } from "./api-request.js";
import { Bot, type Context } from "grammy";
import {
  catchError,
  defer,
  firstValueFrom,
  Subject,
  takeUntil,
  defaultIfEmpty,
  map,
  of,
  take,
  tap,
} from "rxjs";
import type { Config } from "../config.js";
import type { BotStore } from "../application/ports.js";
import type { Logger } from "../infrastructure/logger.js";
import { MessageHandler } from "../application/message-handler.js";
import type { OrangePrice } from "../domain/orange-price.js";
import type { Outbox } from "../application/outbox.js";
import { formatDecimal } from "../domain/format-reply.js";

const help =
  "🍊 Перевожу рублёвые суммы в кг апельсинов по заданной вручную цене за килограмм.\nФорматы: ₽300, 300₽, 300 рублей, 300рубасов, 300 деревянных, 300 рэ, 70к, 70тысячрублей, сто тысяч, 1,5 миллиона, 2млрд, сотка, косарь, пару косарей, 1 лям. Между числом и обозначением пробелы необязательны.\n/start /help /rate /status\nАдминистраторам: /on /off.\nДобавьте бота в группу и отключите Group Privacy у @BotFather (/setprivacy → Disable), либо сделайте бота администратором. После смены privacy при необходимости добавьте его заново. Разрешите отправлять сообщения.";
export function createBot(
  settings: Config,
  db: BotStore,
  price: OrangePrice,
  outbox: Outbox,
  log: Logger,
) {
  const bot = new Bot(settings.token, { client: { timeoutSeconds: 15 } });
  const destroyed = new Subject<void>();
  bot.use((ctx, next) => {
    if (ctx.from?.is_bot) return;
    if (
      ctx.message?.entities?.some(
        (entity) => entity.type === "bot_command" && entity.offset === 0,
      ) &&
      !db.claim(ctx.chat!.id, ctx.message.message_id, Date.now())
    )
      return;
    return next();
  });
  const reply = (ctx: Context, text: string) => {
    if (!ctx.chat || !ctx.msg) return;
    outbox.enqueue(
      ctx.chat.id,
      () =>
        apiRequest((signal) =>
          ctx.reply(
            text,
            {
              reply_parameters: {
                message_id: ctx.msg!.message_id,
                allow_sending_without_reply: false,
              },
              ...(ctx.msg?.message_thread_id
                ? { message_thread_id: ctx.msg.message_thread_id }
                : {}),
              link_preview_options: { is_disabled: true },
            },
            signal,
          ),
        ),
      false,
    );
  };
  const permissions = (ctx: Context) =>
    defer(() => {
      if (!ctx.chat || !ctx.from) return of(false);
      if (!["group", "supergroup"].includes(ctx.chat.type)) return of(false);
      return apiRequest((signal) =>
        ctx.api.getChatMember(ctx.chat!.id, ctx.from!.id, signal),
      ).pipe(
        map((member) => ["creator", "administrator"].includes(member.status)),
        catchError(() => of(false)),
        take(1),
      );
    }).pipe(takeUntil(destroyed), defaultIfEmpty(false));
  bot.command(["start", "help"], (ctx) => reply(ctx, help));
  bot.command(["rate", "refresh"], (ctx) =>
    reply(
      ctx,
      `1 кг апельсинов = ${formatDecimal(price.rubPerKg)} ₽\nЦена задана вручную.`,
    ),
  );
  bot.command("status", (ctx) =>
    reply(
      ctx,
      `Автоответы в этом чате: ${db.enabled(ctx.chat.id) ? "включены" : "выключены"}.\nЦена: ${formatDecimal(price.rubPerKg)} ₽/кг, задана вручную.`,
    ),
  );
  for (const command of ["on", "off"] as const) {
    // grammY requires a Promise at its boundary; application operations remain Observable-based.
    bot.command(command, (ctx) =>
      firstValueFrom(
        permissions(ctx).pipe(
          tap((allowed) => {
            if (!allowed) {
              reply(ctx, "Команда доступна только администраторам группы.");
              return;
            }
            db.setEnabled(ctx.chat.id, command === "on");
            reply(
              ctx,
              command === "on"
                ? "Автоответы включены."
                : "Автоответы выключены.",
            );
          }),
          take(1),
        ),
      ),
    );
  }
  const messages = new MessageHandler(
    db,
    price,
    outbox,
    (text, target) =>
      apiRequest((signal) =>
        bot.api.sendMessage(
          target.chatId,
          text,
          {
            reply_parameters: {
              message_id: target.messageId,
              allow_sending_without_reply: false,
            },
            ...(target.threadId ? { message_thread_id: target.threadId } : {}),
          },
          signal,
        ),
      ),
    log,
  );
  bot.on("message", (ctx) => {
    const msg = ctx.message;
    messages.handle({
      chatId: ctx.chat.id,
      chatType: ctx.chat.type,
      messageId: msg.message_id,
      date: msg.date,
      threadId: msg.message_thread_id,
      isBot: msg.from?.is_bot ?? true,
      text: msg.text ?? msg.caption,
      entities: msg.text ? msg.entities : msg.caption_entities,
    });
  });
  bot.catch(() =>
    log("telegram_error", { reason: "Ошибка обработки Telegram update" }),
  );
  return {
    bot,
    close: () => {
      destroyed.next();
      destroyed.complete();
    },
  };
}
