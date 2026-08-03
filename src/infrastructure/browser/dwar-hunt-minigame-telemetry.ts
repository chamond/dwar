const MIN_MOVEMENT_COUNT = 200;
const MAX_MOVEMENT_COUNT = 300;
const MIN_STEP_SIZE = 1;
const MAX_STEP_SIZE = 14;

interface DwarPointerTelemetryPoint {
  readonly s: 1;
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

interface DwarPointerTelemetryLength {
  readonly sum: number;
  readonly count: number;
  readonly min: number;
  readonly max: number;
}

interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

export function createDwarHuntMinigameTelemetry(): string {
  const width = normalizeViewportDimension(window.innerWidth);
  const height = normalizeViewportDimension(window.innerHeight);
  const movementCount = randomInteger(MIN_MOVEMENT_COUNT, MAX_MOVEMENT_COUNT);
  const points = createSimulatedPointerMovements(width, height, movementCount);
  const payload = {
    points,
    kb: [],
    ms: [],
    info: {
      from: 'hunt',
      fromData: null,
      length: calculatePointerPathLength(points),
      width,
      height,
      ai: {
        rtype: 'captcha'
      },
      cap: navigator.userAgent,
      tst: {
        js: 0,
        cl: -1
      },
      st: 0,
      fps: 30,
      v: 1
    }
  };

  return window.btoa(JSON.stringify(payload));
}

function createSimulatedPointerMovements(
  width: number,
  height: number,
  movementCount: number
): DwarPointerTelemetryPoint[] {
  const points: DwarPointerTelemetryPoint[] = [];
  let position: PointerPosition = {
    x: randomInteger(0, width - 1),
    y: randomInteger(0, height - 1)
  };
  let velocity = createInitialVelocity();

  points.push(createTelemetryPoint(position, 0));

  for (let index = 0; index < movementCount; index += 1) {
    velocity = adjustVelocity(velocity);
    const movement = movePointer(position, velocity, width, height);
    position = movement.position;
    velocity = movement.velocity;
    points.push(createTelemetryPoint(position, createMovementDelay()));
  }

  return points;
}

function createInitialVelocity(): PointerPosition {
  const angle = Math.random() * Math.PI * 2;
  const speed = randomNumber(4, 10);

  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  };
}

function adjustVelocity(velocity: PointerPosition): PointerPosition {
  const adjusted = {
    x: clamp(velocity.x + randomNumber(-1.5, 1.5), -MAX_STEP_SIZE, MAX_STEP_SIZE),
    y: clamp(velocity.y + randomNumber(-1.5, 1.5), -MAX_STEP_SIZE, MAX_STEP_SIZE)
  };
  const speed = Math.hypot(adjusted.x, adjusted.y);

  if (speed >= MIN_STEP_SIZE) {
    return adjusted;
  }

  const angle = Math.random() * Math.PI * 2;

  return {
    x: Math.cos(angle) * MIN_STEP_SIZE,
    y: Math.sin(angle) * MIN_STEP_SIZE
  };
}

function movePointer(
  position: PointerPosition,
  velocity: PointerPosition,
  width: number,
  height: number
): { readonly position: PointerPosition; readonly velocity: PointerPosition } {
  const maxX = width - 1;
  const maxY = height - 1;
  const rawX = position.x + velocity.x;
  const rawY = position.y + velocity.y;
  const hitHorizontalBoundary = rawX < 0 || rawX > maxX;
  const hitVerticalBoundary = rawY < 0 || rawY > maxY;

  return {
    position: {
      x: Math.round(clamp(rawX, 0, maxX)),
      y: Math.round(clamp(rawY, 0, maxY))
    },
    velocity: {
      x: hitHorizontalBoundary ? -velocity.x : velocity.x,
      y: hitVerticalBoundary ? -velocity.y : velocity.y
    }
  };
}

function createTelemetryPoint(
  position: PointerPosition,
  delay: number
): DwarPointerTelemetryPoint {
  return {
    s: 1,
    x: position.x,
    y: position.y,
    t: delay
  };
}

function createMovementDelay(): number {
  return Math.random() < 0.04
    ? randomInteger(20, 200)
    : randomInteger(6, 12);
}

function calculatePointerPathLength(
  points: readonly DwarPointerTelemetryPoint[]
): DwarPointerTelemetryLength {
  const distances: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const currentPoint = points[index];

    if (!previousPoint || !currentPoint) {
      continue;
    }

    distances.push(Math.hypot(
      currentPoint.x - previousPoint.x,
      currentPoint.y - previousPoint.y
    ));
  }

  return {
    sum: distances.reduce((sum, distance) => sum + distance, 0),
    count: distances.length,
    min: distances.length > 0 ? Math.min(...distances) : 0,
    max: distances.length > 0 ? Math.max(...distances) : 0
  };
}

function normalizeViewportDimension(value: number): number {
  return Math.max(1, Math.floor(value));
}

function randomInteger(min: number, max: number): number {
  return Math.floor(randomNumber(min, max + 1));
}

function randomNumber(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
