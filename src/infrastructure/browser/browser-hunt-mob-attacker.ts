import {
  Observable,
  defer,
  map,
  of,
  switchMap,
  take
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import type {
  HuntMobAttackResult,
  HuntMobAttacker
} from '../../application/ports/hunt-mob-attacker';
import type { HuntMob } from '../../domain/entities/hunt-mob';
import { findAccessibleWindow } from './accessible-window-tree';
import { buildHuntCheckUrl, HUNT_CHECK_REQUEST } from './hunt-check-request';

const HUNT_CHECK_RESPONSE_KEY = 'fight|HuntCheck';
const ATTACK_END_TYPE = 2;

type DwarEventHandler = (event: unknown) => void;

interface DwarEventManager {
  addEventListener(
    eventName: string,
    target: object,
    handler: DwarEventHandler,
    scope: object
  ): void;
  removeEventListener(
    eventName: string,
    target: object,
    handler: DwarEventHandler,
    scope: object
  ): void;
}

interface DwarUrlRequest {
  load(): void;
  abort?(): void;
}

interface DwarAbController {
  makeRequest(url: string, actionInfo: Record<string, unknown>): DwarUrlRequest;
}

interface DwarHuntRuntime {
  needsConfirmation: boolean;
  eventManager: DwarEventManager;
  abController: DwarAbController;
  attackTelemetryUrl: string;
  requestCompleteEvent: string;
  requestErrorEvent: string;
  huntAttack(mobId: string): void;
  showBotConfirmDialog: ((confirmation: string) => void) | null;
}

export class BrowserHuntMobAttacker implements HuntMobAttacker {
  attack(mob: HuntMob): Observable<HuntMobAttackResult> {
    return defer(() => {
      const runtime = readDwarHuntRuntime();

      if (!runtime.needsConfirmation) {
        return sendAttack(runtime, mob.getId());
      }

      return requestHuntCheck(mob.getId()).pipe(
        switchMap((confirmation): Observable<HuntMobAttackResult> => {
          if (confirmation === null) {
            return sendAttack(runtime, mob.getId());
          }

          if (!runtime.showBotConfirmDialog) {
            throw new Error(
              'The live hunt frame cannot open the required attack confirmation.'
            );
          }

          runtime.showBotConfirmDialog(confirmation);

          return of({
            type: 'confirmation-opened'
          });
        }),
        take(1)
      );
    });
  }
}

function requestHuntCheck(mobId: string): Observable<string | null> {
  return fromFetch(buildHuntCheckUrl(mobId), {
    method: HUNT_CHECK_REQUEST.method,
    credentials: 'same-origin'
  }).pipe(
    switchMap((response) => {
      if (!response.ok) {
        throw new UnexpectedServerResponseError(
          `Hunt check failed with HTTP ${response.status}.`
        );
      }

      return response.text();
    }),
    map(parseHuntCheckResponse),
    take(1)
  );
}

function parseHuntCheckResponse(responseText: string): string | null {
  let response: unknown;

  try {
    response = JSON.parse(responseText);
  } catch {
    throw new UnexpectedServerResponseError('Hunt check response is not valid JSON.');
  }

  if (!isRecord(response) || !isRecord(response[HUNT_CHECK_RESPONSE_KEY])) {
    throw new UnexpectedServerResponseError('Hunt check response does not contain a fight result.');
  }

  const confirmation = response[HUNT_CHECK_RESPONSE_KEY].confirm;

  if (!confirmation) {
    return null;
  }

  if (typeof confirmation !== 'string' && typeof confirmation !== 'number') {
    throw new UnexpectedServerResponseError('Hunt check confirmation has an unexpected format.');
  }

  return String(confirmation);
}

function sendAttack(runtime: DwarHuntRuntime, mobId: string): Observable<HuntMobAttackResult> {
  return new Observable<HuntMobAttackResult>((subscriber) => {
    const listenerScope = {};
    const attackUrl = `${runtime.attackTelemetryUrl}&bot_id=${encodeURIComponent(mobId)}`;
    const request = runtime.abController.makeRequest(attackUrl, {
      rtype: 'bot',
      rid: mobId,
      et: ATTACK_END_TYPE
    });
    let completeListenerAttached = false;
    let errorListenerAttached = false;
    let settled = false;

    const cleanup = (): void => {
      if (completeListenerAttached) {
        completeListenerAttached = false;
        runtime.eventManager.removeEventListener(
          runtime.requestCompleteEvent,
          request,
          finish,
          listenerScope
        );
      }

      if (errorListenerAttached) {
        errorListenerAttached = false;
        runtime.eventManager.removeEventListener(
          runtime.requestErrorEvent,
          request,
          finish,
          listenerScope
        );
      }
    };
    const finish = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      try {
        runtime.huntAttack(mobId);
        subscriber.next({ type: 'fight-opened' });
        subscriber.complete();
      } catch (error: unknown) {
        subscriber.error(error);
      }
    };

    try {
      runtime.eventManager.addEventListener(
        runtime.requestCompleteEvent,
        request,
        finish,
        listenerScope
      );
      completeListenerAttached = true;
      runtime.eventManager.addEventListener(
        runtime.requestErrorEvent,
        request,
        finish,
        listenerScope
      );
      errorListenerAttached = true;
      request.load();
    } catch (error: unknown) {
      settled = true;
      cleanup();
      subscriber.error(error);
    }

    return () => {
      cleanup();

      if (!settled) {
        settled = true;

        try {
          request.abort?.();
        } catch {
          // The live hunt frame may already be navigating to the battle UI.
        }
      }
    };
  }).pipe(take(1));
}

function readDwarHuntRuntime(): DwarHuntRuntime {
  const runtimeWindow = findAccessibleWindow(window, hasDwarHuntRuntime);

  if (!runtimeWindow) {
    throw new Error(
      'The live hunt frame with the official battle opener is unavailable.'
    );
  }

  const windowRecord = runtimeWindow as unknown as Record<string, unknown>;
  const canvas = asRecord(windowRecord.canvas);
  const utils = asRecord(canvas?.utils);
  const app = asRecord(canvas?.app);
  const hunt = asRecord(app?.hunt);
  const huntModel = asRecord(hunt?.model);
  const eventManager = canvas?.EventManager as DwarEventManager;
  const abController = utils?.ABController as DwarAbController;
  const abcAbout = asRecord(utils?.ABCAbout);
  const requestEvents = asRecord(utils?.URLRequestEvent);
  const huntAttack = windowRecord.huntAttack as (mobId: string) => void;
  const showBotConfirmDialog = typeof windowRecord.showBotConfirmDialog === 'function'
    ? windowRecord.showBotConfirmDialog as (confirmation: string) => void
    : null;

  return {
    needsConfirmation: Boolean(huntModel?.needConfirm),
    eventManager,
    abController,
    attackTelemetryUrl: String(abcAbout?.REQUEST_URL_DWAR),
    requestCompleteEvent: String(requestEvents?.EVENT_COMPLETE),
    requestErrorEvent: String(requestEvents?.EVENT_ERROR),
    huntAttack: (mobId) => {
      huntAttack.call(runtimeWindow, mobId);
    },
    showBotConfirmDialog: showBotConfirmDialog
      ? (confirmation) => {
          showBotConfirmDialog.call(runtimeWindow, confirmation);
        }
      : null
  };
}

function hasDwarHuntRuntime(candidate: Window): boolean {
  const windowRecord = candidate as unknown as Record<string, unknown>;
  const canvas = asRecord(windowRecord.canvas);
  const utils = asRecord(canvas?.utils);
  const app = asRecord(canvas?.app);
  const hunt = asRecord(app?.hunt);
  const eventManager = asRecord(canvas?.EventManager);
  const abController = asRecord(utils?.ABController);
  const abcAbout = asRecord(utils?.ABCAbout);
  const requestEvents = asRecord(utils?.URLRequestEvent);

  return typeof windowRecord.huntAttack === 'function'
    && isRecord(hunt?.model)
    && typeof eventManager?.addEventListener === 'function'
    && typeof eventManager.removeEventListener === 'function'
    && typeof abController?.makeRequest === 'function'
    && typeof abcAbout?.REQUEST_URL_DWAR === 'string'
    && typeof requestEvents?.EVENT_COMPLETE === 'string'
    && typeof requestEvents.EVENT_ERROR === 'string';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
