import type { Observable } from 'rxjs';

export type CurrentPlayerAliveDetector = () => Observable<boolean>;
