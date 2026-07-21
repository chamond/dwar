const HUNT_RESOURCE_FARM_SIGNATURE = 'c39a9e1fe4604f3d8852766675c285ad';

export const HUNT_RESOURCE_FARM_REQUEST = {
  method: 'POST',
  url: 'https://w1.dwar.ru/hunt_conf.php?mode=farm&action=chek&xy=0'
} as const;

export function buildHuntResourceFarmUrl(resourceServerNumber: string): string {
  return `${HUNT_RESOURCE_FARM_REQUEST.url}&sig=${HUNT_RESOURCE_FARM_SIGNATURE}&num=${encodeURIComponent(resourceServerNumber)}&t=1`;
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
