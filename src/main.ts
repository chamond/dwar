import { CreateGreetingUseCase } from './application/use-cases/CreateGreetingUseCase';
import { SystemClock } from './infrastructure/system/SystemClock';
import { runCli } from './presentation/cli/runCli';

const clock = new SystemClock();
const createGreeting = new CreateGreetingUseCase(clock);

runCli(process.argv.slice(2), createGreeting);

