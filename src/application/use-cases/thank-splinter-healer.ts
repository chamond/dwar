import {
  concat,
  defer,
  map,
  of,
  switchMap,
  take,
  type Observable
} from 'rxjs';
import type { SplinterHealerThanksEvent } from '../events/splinter-healer-thanks-event';
import type { Delay } from '../ports/delay';
import type { GetAreaId } from '../ports/get-area-id';
import type { PrivateMessageSender } from '../ports/private-message-sender';
import type { SplinterHealerReader } from '../ports/splinter-healer-reader';

const DEFAULT_MINIMUM_THANK_DELAY_MS = 5_000;
const DEFAULT_MAXIMUM_THANK_DELAY_MS = 10_000;
const THANK_MESSAGES = ['спасибо!', ':drink:', ':mol:'] as const;

export interface SplinterHealerThanksConfig {
  minimumDelayMs: number;
  maximumDelayMs: number;
  random: () => number;
}

export class ThankSplinterHealerUseCase {
  private readonly config: SplinterHealerThanksConfig;

  constructor(
    private readonly splinterHealerReader: SplinterHealerReader,
    private readonly delay: Delay,
    private readonly getAreaId: GetAreaId,
    private readonly privateMessageSender: PrivateMessageSender,
    config: Partial<SplinterHealerThanksConfig> = {}
  ) {
    this.config = {
      minimumDelayMs: config.minimumDelayMs ?? DEFAULT_MINIMUM_THANK_DELAY_MS,
      maximumDelayMs: config.maximumDelayMs ?? DEFAULT_MAXIMUM_THANK_DELAY_MS,
      random: config.random ?? Math.random
    };

    if (
      !Number.isSafeInteger(this.config.minimumDelayMs)
      || this.config.minimumDelayMs < 0
      || !Number.isSafeInteger(this.config.maximumDelayMs)
      || this.config.maximumDelayMs < this.config.minimumDelayMs
    ) {
      throw new Error('Splinter healer thanks delay range is invalid.');
    }
  }

  execute(): Observable<SplinterHealerThanksEvent> {
    return defer(() => this.splinterHealerReader.observe().pipe(
      take(1),
      switchMap((healerNick) => {
        const delayMs = this.createDelayMs();
        const message = this.selectMessage();
        const healerDetectedEvent: SplinterHealerThanksEvent = {
          type: 'healer-detected',
          healerNick,
          delayMs,
          message
        };

        return concat(
          of(healerDetectedEvent),
          this.delay.wait(delayMs).pipe(
            take(1),
            switchMap(() => defer(() => this.getAreaId()).pipe(take(1))),
            switchMap((areaId) => this.privateMessageSender.send({
              recipientNicks: [healerNick],
              message,
              areaId
            }).pipe(take(1))),
            map((): SplinterHealerThanksEvent => ({
              type: 'thanks-sent',
              healerNick,
              message
            }))
          )
        );
      })
    ));
  }

  private createDelayMs(): number {
    const durationCount = this.config.maximumDelayMs - this.config.minimumDelayMs + 1;

    return this.config.minimumDelayMs + Math.floor(this.config.random() * durationCount);
  }

  private selectMessage(): string {
    const index = Math.floor(this.config.random() * THANK_MESSAGES.length);
    const message = THANK_MESSAGES[index];

    if (message === undefined) {
      throw new Error('Splinter healer thanks message selection is invalid.');
    }

    return message;
  }
}
