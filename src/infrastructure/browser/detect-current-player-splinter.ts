import { map, switchMap, take, type Observable } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { CURRENT_PLAYER_NICKNAME } from '../../domain/current-player';

const SPLINTER_ARTICLE_ID = 2299;
const SPLINTER_NAME = 'Заноза';
const EFFECT_INFO_URL = 'https://w1.dwar.ru/effect_info.php';

export function detectCurrentPlayerSplinter(): Observable<boolean> {
  return fromFetch(buildCurrentPlayerEffectInfoUrl(), {
    cache: 'no-store',
    credentials: 'same-origin',
    method: 'GET'
  }).pipe(
    switchMap((response) => {
      if (!response.ok) {
        throw new UnexpectedServerResponseError(
          `Effect info request failed with HTTP ${response.status}.`
        );
      }

      return response.text();
    }),
    map(hasSplinter),
    take(1)
  );
}

function buildCurrentPlayerEffectInfoUrl(): string {
  return `${EFFECT_INFO_URL}?nick=${encodeURIComponent(CURRENT_PLAYER_NICKNAME)}`;
}

function hasSplinter(htmlText: string): boolean {
  const document = new DOMParser().parseFromString(htmlText, 'text/html');
  const artifactLinks = document.querySelectorAll<HTMLAnchorElement>('a');

  return Array.from(artifactLinks).some((link) => {
    const href = link.getAttribute('href');

    if (href) {
      const url = new URL(href, EFFECT_INFO_URL);

      if (url.searchParams.get('artikul_id') === String(SPLINTER_ARTICLE_ID)) {
        return true;
      }
    }

    const onClick = link.getAttribute('onclick');

    if (onClick && containsSplinterArticleId(onClick)) {
      return true;
    }

    return link.textContent?.trim() === SPLINTER_NAME;
  });
}

function containsSplinterArticleId(onClick: string): boolean {
  const match = onClick.match(/showArtifactInfo\s*\(\s*[^,]*,\s*['"]?(\d+)['"]?/i);

  return match?.[1] === String(SPLINTER_ARTICLE_ID);
}
