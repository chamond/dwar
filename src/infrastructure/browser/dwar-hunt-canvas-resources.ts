export function readDwarHuntCanvasResourceServerNumbers(
  canvasValue: unknown
): ReadonlySet<string> | null {
  if (!isRecord(canvasValue)) {
    return null;
  }

  const app = canvasValue.app;

  if (!isRecord(app) || !isRecord(app.hunt)) {
    return null;
  }

  const model = app.hunt.model;

  if (!isRecord(model) || !isRecord(model.Objects)) {
    return null;
  }

  const serverNumbers = new Set<string>();

  for (const [objectKey, objectValue] of Object.entries(model.Objects)) {
    if (
      !objectKey.startsWith('f')
      || objectKey.length === 1
      || !isRecord(objectValue)
      || objectValue.type !== 'farm'
      || !isRecord(objectValue.mc)
      || objectValue.mc.visible === false
    ) {
      continue;
    }

    serverNumbers.add(objectKey.slice(1));
  }

  return serverNumbers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
