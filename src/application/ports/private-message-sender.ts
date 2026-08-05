import type { Observable } from 'rxjs';

export interface PrivateMessageSendInput {
  recipientNicks: readonly string[];
  message: string;
  areaId: number;
}

export interface PrivateMessageSender {
  send(input: PrivateMessageSendInput): Observable<void>;
}
