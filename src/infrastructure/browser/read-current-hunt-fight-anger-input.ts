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
import { readDwarHuntFightAngerInput } from './dwar-hunt-fight-anger-input';
import type { HuntMobAngerRequestInput } from './hunt-mob-anger-request';
import { findInAccessibleWindowTree } from './accessible-window-tree';

const FIGHT_FRAME_SEARCH_INTERVAL_MS = 100;
const FIGHT_FRAME_READY_TIMEOUT_MS = 15_000;

export function readCurrentHuntFightAngerInput(): Observable<HuntMobAngerRequestInput> {
  return defer(() => timer(0, FIGHT_FRAME_SEARCH_INTERVAL_MS).pipe(
    map(() => findInAccessibleWindowTree(window, readFightAngerInput)),
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

function readFightAngerInput(candidate: Window): HuntMobAngerRequestInput | null {
  try {
    return readDwarHuntFightAngerInput(
      (candidate as unknown as Record<string, unknown>).canvas
    );
  } catch {
    return null;
  }
}
