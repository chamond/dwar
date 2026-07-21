export interface GreetingProps {
  recipient: string;
  createdAt: Date;
}

export interface GreetingSnapshot {
  recipient: string;
  message: string;
  createdAt: string;
}

export class Greeting {
  private constructor(
    private readonly recipient: string,
    private readonly createdAt: Date
  ) {}

  static create(props: GreetingProps): Greeting {
    const recipient = props.recipient.trim();

    if (recipient.length === 0) {
      throw new Error('Recipient is required.');
    }

    return new Greeting(recipient, new Date(props.createdAt));
  }

  toSnapshot(): GreetingSnapshot {
    return {
      recipient: this.recipient,
      message: `Hello, ${this.recipient}!`,
      createdAt: this.createdAt.toISOString()
    };
  }
}

