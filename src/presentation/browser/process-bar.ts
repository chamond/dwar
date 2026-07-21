export interface ProcessBarElements {
  root: HTMLElement;
  label: HTMLElement;
  timer: HTMLElement;
  rail: HTMLElement;
  fill: HTMLElement;
}

export interface ProcessBarStartOptions {
  label: string;
  durationMs: number;
  accentColor?: string | undefined;
}

export interface ProcessBarController {
  start(options: ProcessBarStartOptions): void;
  complete(): void;
  reset(): void;
}

interface ActiveProcess {
  startedAtMs: number;
  durationMs: number;
}

export function createProcessBar(): ProcessBarElements {
  const root = document.createElement('div');
  root.className = 'dwar-process-bar is-idle';

  const meta = document.createElement('div');
  meta.className = 'dwar-process-bar__meta';

  const label = document.createElement('span');
  label.className = 'dwar-process-bar__label';

  const timer = document.createElement('span');
  timer.className = 'dwar-process-bar__timer';

  const rail = document.createElement('div');
  rail.className = 'dwar-process-bar__rail';
  rail.setAttribute('role', 'progressbar');
  rail.setAttribute('aria-label', 'Текущий процесс');
  rail.setAttribute('aria-valuemin', '0');
  rail.setAttribute('aria-valuemax', '100');

  const fill = document.createElement('div');
  fill.className = 'dwar-process-bar__fill';

  meta.append(label, timer);
  rail.append(fill);
  root.append(meta, rail);

  return {
    root,
    label,
    timer,
    rail,
    fill
  };
}

export function createProcessBarController(elements: ProcessBarElements): ProcessBarController {
  let activeProcess: ActiveProcess | null = null;
  let animationFrameId: number | null = null;

  const stopAnimation = (): void => {
    if (animationFrameId === null) {
      return;
    }

    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  };

  const render = (elapsedMs: number, durationMs: number): void => {
    const progress = durationMs <= 0 ? 1 : Math.min(Math.max(elapsedMs / durationMs, 0), 1);
    const progressPercent = Math.round(progress * 100);

    elements.timer.textContent = `${formatElapsedTime(elapsedMs, durationMs)} / ${formatTotalTime(durationMs)}`;
    elements.fill.style.transform = `scaleX(${progress})`;
    elements.rail.setAttribute('aria-valuenow', String(progressPercent));
  };

  const tick = (): void => {
    if (!activeProcess) {
      return;
    }

    const elapsedMs = Math.min(performance.now() - activeProcess.startedAtMs, activeProcess.durationMs);
    render(elapsedMs, activeProcess.durationMs);

    if (elapsedMs >= activeProcess.durationMs) {
      animationFrameId = null;
      return;
    }

    animationFrameId = requestAnimationFrame(tick);
  };

  const reset = (): void => {
    stopAnimation();
    activeProcess = null;
    elements.root.classList.add('is-idle');
    elements.root.classList.remove('is-active', 'is-complete');
    elements.label.textContent = 'Ожидание';
    elements.timer.textContent = '00:00 / 00:00';
    elements.fill.style.transform = 'scaleX(0)';
    elements.rail.setAttribute('aria-valuenow', '0');
    elements.root.style.removeProperty('--dwar-process-color');
  };

  reset();

  return {
    start(options: ProcessBarStartOptions): void {
      const durationMs = Math.max(0, Math.round(options.durationMs));
      stopAnimation();
      activeProcess = {
        startedAtMs: performance.now(),
        durationMs
      };

      elements.root.classList.remove('is-idle', 'is-complete');
      elements.root.classList.add('is-active');
      elements.label.textContent = options.label;

      if (options.accentColor) {
        elements.root.style.setProperty('--dwar-process-color', options.accentColor);
      } else {
        elements.root.style.removeProperty('--dwar-process-color');
      }

      render(0, durationMs);
      tick();
    },

    complete(): void {
      if (!activeProcess) {
        return;
      }

      render(activeProcess.durationMs, activeProcess.durationMs);
      stopAnimation();
      activeProcess = null;
      elements.root.classList.remove('is-idle', 'is-active');
      elements.root.classList.add('is-complete');
    },

    reset
  };
}

function formatElapsedTime(elapsedMs: number, durationMs: number): string {
  const elapsedSeconds = Math.min(Math.floor(elapsedMs / 1000), Math.ceil(durationMs / 1000));

  return formatClockTime(elapsedSeconds);
}

function formatTotalTime(durationMs: number): string {
  return formatClockTime(Math.ceil(durationMs / 1000));
}

function formatClockTime(totalSeconds: number): string {
  const normalizedSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(normalizedSeconds / 60);
  const seconds = normalizedSeconds % 60;

  return `${padTimeUnit(minutes)}:${padTimeUnit(seconds)}`;
}

function padTimeUnit(value: number): string {
  return value.toString().padStart(2, '0');
}
