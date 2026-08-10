import { Observable, defer, finalize, type Subscription } from 'rxjs';
import type {
  ObservableTask,
  TaskScheduler
} from '../../application/ports/task-scheduler';

interface ScheduledTask {
  isStarted: boolean;
  isCancelled: boolean;
  start(): void;
  cancel(): void;
}

export class FifoTaskScheduler implements TaskScheduler {
  private readonly pendingTasks = new Set<ScheduledTask>();
  private activeTask: ScheduledTask | null = null;

  schedule<Result>(task: ObservableTask<Result>): Observable<Result> {
    return new Observable<Result>((subscriber) => {
      let taskSubscription: Subscription | null = null;
      const scheduledTask: ScheduledTask = {
        isStarted: false,
        isCancelled: false,
        start: (): void => {
          scheduledTask.isStarted = true;
          const subscription = defer(task).pipe(
            finalize(() => {
              taskSubscription = null;
              this.complete(scheduledTask);
            })
          ).subscribe(subscriber);

          taskSubscription = subscription.closed ? null : subscription;
        },
        cancel: (): void => {
          scheduledTask.isCancelled = true;

          if (scheduledTask.isStarted) {
            taskSubscription?.unsubscribe();
            return;
          }

          this.pendingTasks.delete(scheduledTask);
        }
      };

      this.pendingTasks.add(scheduledTask);
      this.startNext();

      return () => {
        scheduledTask.cancel();
      };
    });
  }

  private complete(task: ScheduledTask): void {
    if (this.activeTask !== task) {
      return;
    }

    this.activeTask = null;
    this.startNext();
  }

  private startNext(): void {
    if (this.activeTask) {
      return;
    }

    let nextTask = this.takeNextPendingTask();

    while (nextTask?.isCancelled) {
      nextTask = this.takeNextPendingTask();
    }

    if (!nextTask) {
      return;
    }

    this.activeTask = nextTask;
    nextTask.start();
  }

  private takeNextPendingTask(): ScheduledTask | null {
    const nextTask = this.pendingTasks.values().next().value;

    if (!nextTask) {
      return null;
    }

    this.pendingTasks.delete(nextTask);
    return nextTask;
  }
}
