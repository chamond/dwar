import type { CreateGreetingUseCase } from '../../application/use-cases/CreateGreetingUseCase';

export function runCli(args: string[], createGreeting: CreateGreetingUseCase): void {
  const [recipient] = args;
  const output = createGreeting.execute(recipient === undefined ? {} : { recipient });

  console.log(JSON.stringify(output, null, 2));
}
