import { map, take, type Observable } from 'rxjs';
import { CURRENT_PLAYER_NICKNAME } from '../../domain/current-player';
import type { LocationPlayerSnapshot } from '../../domain/entities/location-player';
import { PRIVATE_MESSAGE_EXCLUDED_CLAN_ID } from '../../domain/private-message-rules';
import type { CurrentLocationPlayerReader } from '../ports/current-location-player-reader';

export class ListCurrentLocationPlayersUseCase {
  constructor(private readonly playerReader: CurrentLocationPlayerReader) {}

  execute(): Observable<readonly LocationPlayerSnapshot[]> {
    return this.playerReader.read().pipe(
      map((players) => players
        .filter((player) => (
          !isCurrentPlayer(player.getNick())
          && player.getClanId() !== PRIVATE_MESSAGE_EXCLUDED_CLAN_ID
        ))
        .map((player) => player.toSnapshot())),
      take(1)
    );
  }
}

function isCurrentPlayer(nick: string): boolean {
  return nick.localeCompare(CURRENT_PLAYER_NICKNAME, 'ru-RU', {
    sensitivity: 'accent'
  }) === 0;
}
