import {
  Subscription,
  catchError,
  concatMap,
  defer,
  finalize,
  from,
  fromEvent,
  of,
  take,
} from "rxjs";
import { config } from "./config.js";
import { Database } from "./infrastructure/database.js";
import { logger } from "./infrastructure/logger.js";
import { Outbox } from "./application/outbox.js";
import { createBot } from "./presentation/bot.js";

const settings = config();
const log = logger(settings.logLevel);
const db = new Database(settings.databasePath);
const outbox = new Outbox(log);
const app = createBot(settings, db, settings.price, outbox, log);
const owned = new Subscription();
log("price_configured", { rub_per_kg: settings.price.rubPerKg.toString() });
let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  owned.unsubscribe();
  app.close();
  outbox.close();
  const stop = app.bot.isRunning()
    ? defer(() => from(app.bot.stop()))
    : of(undefined);
  stop
    .pipe(
      catchError(() => of(undefined)),
      finalize(() => {
        db.close();
        log("stopped");
      }),
      take(1),
    )
    .subscribe({
      error: () => {
        process.exitCode = 1;
      },
    });
};
owned.add(fromEvent(process, "SIGINT").pipe(take(1)).subscribe(shutdown));
owned.add(fromEvent(process, "SIGTERM").pipe(take(1)).subscribe(shutdown));
owned.add(
  defer(() => from(app.bot.init()))
    .pipe(
      concatMap(() =>
        defer(() =>
          from(
            app.bot.start({
              allowed_updates: ["message"],
              onStart: () => log("polling_started"),
            }),
          ),
        ),
      ),
    )
    .subscribe({
      error: () => {
        log("polling_error", {
          reason:
            "Не удалось запустить polling. Проверьте токен, сеть и отсутствие второго экземпляра.",
        });
        process.exitCode = 1;
        shutdown();
      },
    }),
);
