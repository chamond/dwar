import {
  EMPTY,
  Subject,
  Subscription,
  catchError,
  concatMap,
  defer,
  finalize,
  mergeMap,
  throwError,
  retry,
  take,
  timer,
  type Observable,
} from "rxjs";
import type { Logger } from "./ports.js";

interface Task {
  send: () => Observable<unknown>;
  createdAt: number;
  automatic: boolean;
}
interface ChatQueue {
  input: Subject<Task>;
  subscription: Subscription;
  pending: number;
  lastSent: number;
  automaticSent: number[];
}
export function retryAfter(error: unknown): number | undefined {
  if (
    typeof error !== "object" ||
    error === null ||
    !("error_code" in error) ||
    error.error_code !== 429 ||
    !("parameters" in error)
  )
    return undefined;
  const value = (error.parameters as { retry_after?: number }).retry_after;
  return typeof value === "number" && value >= 0 ? value : undefined;
}
export class Outbox {
  private readonly queues = new Map<number, ChatQueue>();
  private readonly cleanup: Subscription;
  private stopped = false;
  constructor(
    private readonly log: Logger,
    private readonly now = () => Date.now(),
  ) {
    this.cleanup = timer(60000, 60000).subscribe(() => {
      for (const [chat, queue] of this.queues) {
        if (!queue.pending && this.now() - queue.lastSent >= 60000) {
          queue.subscription.unsubscribe();
          queue.input.complete();
          this.queues.delete(chat);
        }
      }
    });
  }
  enqueue(
    chat: number,
    send: () => Observable<unknown>,
    automatic = true,
    createdAt = this.now(),
  ): boolean {
    if (this.stopped || this.now() - createdAt > 30000) return false;
    let queue = this.queues.get(chat);
    if (!queue) {
      if (this.queues.size >= 1000) return false;
      const input = new Subject<Task>();
      queue = {
        input,
        subscription: new Subscription(),
        pending: 0,
        lastSent: 0,
        automaticSent: [],
      };
      const state = queue;
      state.subscription = input
        .pipe(
          concatMap((task) =>
            this.deliver(chat, state, task).pipe(
              finalize(() => state.pending--),
            ),
          ),
        )
        .subscribe();
      this.queues.set(chat, state);
    }
    if (queue.pending >= 30) return false;
    queue.pending++;
    queue.input.next({ send, automatic, createdAt });
    return true;
  }
  private deliver(
    chat: number,
    queue: ChatQueue,
    task: Task,
  ): Observable<unknown> {
    return defer(() => {
      const now = this.now();
      queue.automaticSent = queue.automaticSent.filter(
        (time) => now - time < 60000,
      );
      const wait = Math.max(
        0,
        queue.lastSent + 1000 - now,
        task.automatic && queue.automaticSent.length >= 15
          ? queue.automaticSent[0]! + 60000 - now
          : 0,
      );
      if (now + wait - task.createdAt > 30000) return EMPTY;
      return timer(wait).pipe(
        mergeMap(() =>
          defer(() => {
            if (this.now() - task.createdAt > 30000) return EMPTY;
            queue.lastSent = this.now();
            if (task.automatic) queue.automaticSent.push(queue.lastSent);
            return task.send().pipe(take(1));
          }),
        ),
      );
    }).pipe(
      retry({
        count: 2,
        delay: (error) => {
          const seconds = retryAfter(error);
          // Only retry a definite Telegram rejection. A lost response may already have sent the reply.
          if (
            seconds === undefined ||
            this.now() + seconds * 1000 + 1000 - task.createdAt > 30000
          )
            return throwError(() => error);
          return timer(seconds * 1000 + 1000);
        },
      }),
      catchError((error) => {
        this.log("send_error", {
          chat_id: chat,
          reason:
            retryAfter(error) === undefined
              ? "Ответ не отправлен или результат отправки неизвестен"
              : "Лимит Telegram",
        });
        return EMPTY;
      }),
    );
  }

  close(): void {
    this.stopped = true;
    this.cleanup.unsubscribe();
    for (const queue of this.queues.values()) {
      queue.subscription.unsubscribe();
      queue.input.complete();
    }
    this.queues.clear();
  }
}
