import { AbortController, type AbortSignal } from "abort-controller";
import { defer, finalize, from, take, type Observable } from "rxjs";

// grammY's Promise API is adapted only at the presentation boundary.
export function apiRequest<T>(
  request: (signal: AbortSignal) => Promise<T>,
): Observable<T> {
  return defer(() => {
    const controller = new AbortController();
    return from(request(controller.signal)).pipe(
      take(1),
      finalize(() => controller.abort()),
    );
  });
}
