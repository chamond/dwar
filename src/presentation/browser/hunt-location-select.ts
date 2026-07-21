import type { HuntLocationId, HuntLocationSnapshot } from '../../domain/entities/hunt-location';

export interface HuntLocationSelectElements {
  root: HTMLElement;
  select: HTMLSelectElement;
  getSelectedLocation(): HuntLocationSnapshot | null;
}

export interface HuntLocationSelectOptions {
  selectedLocationId?: HuntLocationId | null | undefined;
  onLocationChange?: ((location: HuntLocationSnapshot) => void) | undefined;
}

export function createHuntLocationSelect(
  locations: readonly HuntLocationSnapshot[],
  options: HuntLocationSelectOptions = {}
): HuntLocationSelectElements {
  const root = document.createElement('label');
  root.className = 'dwar-location-select';

  const select = document.createElement('select');
  select.className = 'dwar-location-select__control';
  select.setAttribute('aria-label', 'Локация добычи');

  const selectedLocationId = getInitialSelectedLocationId(locations, options.selectedLocationId);
  locations.forEach((location) => {
    select.append(createLocationOption(location, location.id === selectedLocationId));
  });

  const getSelectedLocation = (): HuntLocationSnapshot | null => {
    return locations.find((location) => location.id === select.value) ?? null;
  };

  select.addEventListener('change', () => {
    const selectedLocation = getSelectedLocation();

    if (selectedLocation) {
      options.onLocationChange?.(selectedLocation);
    }
  });

  root.append(select);

  return {
    root,
    select,
    getSelectedLocation
  };
}

function getInitialSelectedLocationId(
  locations: readonly HuntLocationSnapshot[],
  selectedLocationId: HuntLocationId | null | undefined
): HuntLocationId | null {
  const hasSelectedLocation = locations.some((location) => location.id === selectedLocationId);

  if (hasSelectedLocation) {
    return selectedLocationId ?? null;
  }

  return locations[0]?.id ?? null;
}

function createLocationOption(location: HuntLocationSnapshot, isSelected: boolean): HTMLOptionElement {
  const option = document.createElement('option');
  option.value = location.id;
  option.textContent = location.name;
  option.selected = isSelected;

  return option;
}
