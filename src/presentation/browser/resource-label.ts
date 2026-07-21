export interface ResourceLabel {
  name: string;
  level: number;
}

export function formatResourceLabel(resource: ResourceLabel): string {
  return `${resource.name} [${resource.level}]`;
}
