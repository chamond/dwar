import { EMPTY, catchError, finalize, tap, type Subscription } from 'rxjs';
import type { AttackHuntMobUseCase } from '../../application/use-cases/attack-hunt-mob';
import type { AddBotLog } from './bot-log-appender';
import { presentHuntAttackEvent } from './hunt-attack-event-presenter';
import type { HuntingControlsElements } from './hunting-controls';
import type { ProcessErrorReporter } from './process-error-reporter';

export interface HuntingController {
  attack(): void;
  destroy(): void;
}

export interface HuntingControllerOptions {
  controls: HuntingControlsElements;
  attackHuntMob: AttackHuntMobUseCase;
  addLog: AddBotLog;
  reportError: ProcessErrorReporter;
}

export function createHuntingController(
  options: HuntingControllerOptions
): HuntingController {
  let executionSubscription: Subscription | null = null;

  const setBusy = (isBusy: boolean): void => {
    options.controls.attackButton.disabled = isBusy
      || options.controls.getSelectedTargetId() === null;
    options.controls.targetSelect.disabled = isBusy;
    options.controls.preferCrowdedTargetCheckbox.disabled = isBusy;
    options.controls.attackButton.classList.toggle('is-busy', isBusy);

    if (isBusy) {
      options.controls.attackButton.setAttribute('aria-busy', 'true');
      options.controls.attackButton.textContent = 'Поиск…';
      return;
    }

    options.controls.attackButton.removeAttribute('aria-busy');
    options.controls.attackButton.textContent = 'Напасть';
  };

  const attack = (): void => {
    if (executionSubscription && !executionSubscription.closed) {
      return;
    }

    const targetId = options.controls.getSelectedTargetId();

    if (!targetId) {
      options.addLog('Не выбран целевой моб.', {
        tone: 'failure'
      });
      return;
    }

    setBusy(true);

    const subscription = options.attackHuntMob.execute({
      targetId,
      preferCrowdedTarget: options.controls.preferCrowdedTargetCheckbox.checked
    }).pipe(
      tap((event) => {
        presentHuntAttackEvent(event, options.addLog);
      }),
      catchError((error: unknown) => {
        options.reportError(error);
        return EMPTY;
      }),
      finalize(() => {
        executionSubscription = null;
        setBusy(false);
      })
    ).subscribe();

    executionSubscription = subscription.closed ? null : subscription;
  };

  return {
    attack,
    destroy(): void {
      executionSubscription?.unsubscribe();
      executionSubscription = null;
      setBusy(false);
    }
  };
}
