export const CHAT_USERS_REQUEST = {
  method: 'POST',
  url: 'https://w1.dwar.ru/cht_data.php'
} as const;

export function buildChatUsersRequestBody(): URLSearchParams {
  return new URLSearchParams({
    user_type: 'area'
  });
}
