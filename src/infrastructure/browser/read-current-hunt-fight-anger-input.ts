import {
  defer,
  filter,
  map,
  throwError,
  timeout,
  timer,
  take,
  type Observable
} from 'rxjs';
import {
  readDwarHuntFightAngerInput,
  readDwarHuntFightId
} from './dwar-hunt-fight-anger-input';
import { selectDwarHuntFightAngerTarget } from './dwar-hunt-fight-anger-target-selector';
import type { HuntMobAngerRequestInput } from './hunt-mob-anger-request';
import { findInAccessibleWindowTree } from './accessible-window-tree';

const FIGHT_FRAME_SEARCH_INTERVAL_MS = 100;
const FIGHT_FRAME_READY_TIMEOUT_MS = 15_000;

export function readCurrentHuntFightAngerInput(
  expectedFightId: string | null
): Observable<HuntMobAngerRequestInput> {
  return defer(() => timer(0, FIGHT_FRAME_SEARCH_INTERVAL_MS).pipe(
    map(() => findInAccessibleWindowTree(
      window,
      (candidate) => readFightAngerInput(candidate, expectedFightId)
    )),
    filter((input): input is HuntMobAngerRequestInput => input !== null),
    take(1),
    timeout({
      first: FIGHT_FRAME_READY_TIMEOUT_MS,
      with: () => throwError(() => new Error(
        'Боевой frame не загрузил идентификаторы текущего моба за 15 секунд.'
      ))
    })
  ));
}

function readFightAngerInput(
  candidate: Window,
  expectedFightId: string | null
): HuntMobAngerRequestInput | null {
  try {
    const canvas = (candidate as unknown as Record<string, unknown>).canvas;

    if (expectedFightId && readDwarHuntFightId(canvas) !== expectedFightId) {
      return null;
    }

    const targetId = selectDwarHuntFightAngerTarget(canvas);

    if (!targetId) {
      return null;
    }

    return readDwarHuntFightAngerInput(canvas, {
      expectedFightId,
      expectedBotArtikulId: targetId
    });
  } catch {
    return null;
  }
}
