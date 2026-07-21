export const HUNT_RESOURCE_FARM_REQUEST = {
  method: 'POST',
  url: 'https://w1.dwar.ru/hunt_conf.php?mode=farm&action=chek&xy=0'
} as const;

export function buildHuntResourceFarmUrl(resourceServerNumber: string): string {
  return `${HUNT_RESOURCE_FARM_REQUEST.url}&sig=${createFarmSignature()}&num=${encodeURIComponent(resourceServerNumber)}&t=1`;
}

export function buildHuntResourceFarmBody(resourceServerNumber: string): URLSearchParams {
  return new URLSearchParams({
    m: createFarmTelemetryPayload(resourceServerNumber)
  });
}

function createFarmTelemetryPayload(resourceServerNumber: string): string {
  const payload = {
    points: [],
    kb: [],
    ms: [],
    info: {
      from: 'hunt',
      fromData: null,
      length: {
        sum: 0,
        count: 0,
        min: 0,
        max: 0
      },
      width: window.innerWidth,
      height: window.innerHeight,
      ai: {
        rtype: 'farm',
        rid: resourceServerNumber,
        et: 2
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

function createFarmSignature(): string {
  const bytes = new Uint8Array(16);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
