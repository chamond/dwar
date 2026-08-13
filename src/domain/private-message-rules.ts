const PRIVATE_MESSAGE_EXCLUDED_CLAN_IDS: readonly number[] = [32, 2156];

export function isPrivateMessageClanExcluded(clanId: number): boolean {
  return PRIVATE_MESSAGE_EXCLUDED_CLAN_IDS.includes(clanId);
}
