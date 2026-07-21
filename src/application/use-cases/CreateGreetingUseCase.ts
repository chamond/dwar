import { Greeting } from '../../domain/entities/Greeting';
import type { Clock } from '../ports/Clock';

export interface CreateGreetingInput {
  recipient?: string;
}

export interface CreateGreetingOutput {
  recipient: string;
  message: string;
  createdAt: string;
}

export class CreateGreetingUseCase {
  constructor(private readonly clock: Clock) {}

  execute(input: CreateGreetingInput = {}): CreateGreetingOutput {
    const greeting = Greeting.create({
      recipient: input.recipient ?? 'World',
      createdAt: this.clock.now()
    });

    return greeting.toSnapshot();
  }
}

