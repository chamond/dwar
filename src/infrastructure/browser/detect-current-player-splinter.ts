import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { CURRENT_PLAYER_NICKNAME } from '../../domain/current-player';

const SPLINTER_ARTICLE_ID = 2299;
const INJURY_INFO_URL = 'https://w1.dwar.ru/injury_info.php';

export function detectCurrentPlayerSplinter(): Observable<boolean> {
  return fromFetch(buildCurrentPlayerInjuryInfoUrl(), {
    cache: 'no-store',
    credentials: 'same-origin',
    method: 'GET'
  }).pipe(
    switchMap((response) => {
      if (!response.ok) {
        throw new UnexpectedServerResponseError(
          `Injury info request failed with HTTP ${response.status}.`
        );
      }

      return response.text();
    }),
    map(hasSplinter),
    take(1)
  );
}

function buildCurrentPlayerInjuryInfoUrl(): string {
  return `${INJURY_INFO_URL}?nick=${encodeURIComponent(CURRENT_PLAYER_NICKNAME)}`;
}

function hasSplinter(htmlText: string): boolean {
  const document = new DOMParser().parseFromString(htmlText, 'text/html');
  const artifactLinks = document.querySelectorAll<HTMLAnchorElement>('a[href]');

  return Array.from(artifactLinks).some((link) => {
    const url = new URL(link.href, INJURY_INFO_URL);

    return url.searchParams.get('artikul_id') === String(SPLINTER_ARTICLE_ID);
  });
}
