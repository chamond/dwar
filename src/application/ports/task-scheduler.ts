import type { Observable } from 'rxjs';

export type ObservableTask<Result> = () => Observable<Result>;

export interface TaskScheduler {
  schedule<Result>(task: ObservableTask<Result>): Observable<Result>;
}
