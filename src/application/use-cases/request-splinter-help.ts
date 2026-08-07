import {
  concat,
  defer,
  ignoreElements,
  of,
  switchMap,
  take,
  tap,
  type Observable
} from 'rxjs';
import type { SplinterHelpEvent } from '../events/splinter-help-event';
import type { CurrentPlayerSplinterDetector } from '../ports/current-player-splinter-detector';
import type { Delay } from '../ports/delay';
import type { GetAreaId } from '../ports/get-area-id';
import type { PrivateMessageSender } from '../ports/private-message-sender';
import { SplinterHelpSession } from '../../domain/services/splinter-help-session';
import type { ListCurrentLocationPlayersUseCase } from './list-current-location-players';

const DEFAULT_HELP_DELAY_MS = 60_000;

export interface SplinterHelpConfig {
  helpDelayMs: number;
}

export class RequestSplinterHelpUseCase {
  private readonly config: SplinterHelpConfig;
  private session: SplinterHelpSession | null = null;

  constructor(
    private readonly listCurrentLocationPlayers: ListCurrentLocationPlayersUseCase,
    private readonly privateMessageSender: PrivateMessageSender,
    private readonly detectCurrentPlayerSplinter: CurrentPlayerSplinterDetector,
    private readonly getAreaId: GetAreaId,
    private readonly delay: Delay,
    config: Partial<SplinterHelpConfig> = {}
  ) {
    this.config = {
      helpDelayMs: config.helpDelayMs ?? DEFAULT_HELP_DELAY_MS
    };

    if (!Number.isFinite(this.config.helpDelayMs) || this.config.helpDelayMs <= 0) {
      throw new Error('Splinter help delay must be greater than zero.');
    }
  }

  confirmSplinter(): void {
    this.session ??= new SplinterHelpSession();
  }

  execute(): Observable<SplinterHelpEvent> {
    return defer(() => {
      const session = this.session;

      if (!session) {
        throw new Error('Splinter must be confirmed before requesting help.');
      }

      return this.detectCurrentPlayerSplinter().pipe(
        take(1),
        switchMap((hasSplinter) => hasSplinter
          ? this.runRound(session)
          : this.finishSession(session))
      );
    });
  }

  private runRound(session: SplinterHelpSession): Observable<SplinterHelpEvent> {
    return defer(() => this.listCurrentLocationPlayers.execute()).pipe(
      take(1),
      switchMap((players) => {
        const recipients = session.selectRecipients(players);

        if (recipients.length === 0) {
          const noEligiblePlayersEvent: SplinterHelpEvent = {
            type: 'no-eligible-players',
            retryDelayMs: this.config.helpDelayMs
          };

          return concat(
            of(noEligiblePlayersEvent),
            this.delay.wait(this.config.helpDelayMs).pipe(
              take(1),
              ignoreElements()
            ),
            this.checkSplinterAfterWait(session)
          );
        }

        const onlyRecipient = recipients.length === 1 ? recipients[0] : undefined;
        const message = session.takeNextMessage(onlyRecipient?.nick);

        const recipientsSelectedEvent: SplinterHelpEvent = {
          type: 'recipients-selected',
          recipients,
          message
        };
        const messageSentEvent: SplinterHelpEvent = {
          type: 'message-sent',
          recipients
        };
        const waitingEvent: SplinterHelpEvent = {
          type: 'waiting-for-help',
          delayMs: this.config.helpDelayMs
        };

        return concat(
          of(recipientsSelectedEvent),
          defer(() => this.getAreaId()).pipe(
            take(1),
            switchMap((areaId) => this.privateMessageSender.send({
              recipientNicks: recipients.map(({ nick }) => nick),
              message,
              areaId
            }).pipe(
              tap(() => {
                session.markContacted(recipients);
              })
            )),
            take(1),
            ignoreElements()
          ),
          of(messageSentEvent, waitingEvent),
          this.delay.wait(this.config.helpDelayMs).pipe(
            take(1),
            ignoreElements()
          ),
          this.checkSplinterAfterWait(session)
        );
      })
    );
  }

  private checkSplinterAfterWait(
    session: SplinterHelpSession
  ): Observable<SplinterHelpEvent> {
    return defer(() => this.detectCurrentPlayerSplinter()).pipe(
      take(1),
      switchMap((hasSplinter) => {
        if (!hasSplinter) {
          return this.finishSession(session);
        }

        return concat(
          of<SplinterHelpEvent>({
            type: 'splinter-still-present'
          }),
          defer(() => this.runRound(session))
        );
      })
    );
  }

  private finishSession(session: SplinterHelpSession): Observable<SplinterHelpEvent> {
    if (this.session === session) {
      this.session = null;
    }

    return of({
      type: 'splinter-removed'
    });
  }
}
