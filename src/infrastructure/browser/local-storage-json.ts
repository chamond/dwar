export function loadJsonFromLocalStorage<T>(
  key: string,
  validate: (value: unknown) => value is T
): T | null {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(key);

    if (!rawValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!validate(parsedValue)) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

export function saveJsonToLocalStorage(key: string, value: unknown): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // The page can block localStorage. The widget stays usable without persistence.
  }
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
