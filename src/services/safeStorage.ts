
export type StorageArea = "local" | "session";

const memory = new Map<string, string>();

const memoryOnly = new Set<string>();

function getArea(area: StorageArea): Storage | null {
  try {
    return area === "local" ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function memoryKey(area: StorageArea, key: string): string {
  return `${area}:${key}`;
}

export function readJson(area: StorageArea, key: string): unknown {
  const id = memoryKey(area, key);
  let text: string | null = null;

  const storage = getArea(area);
  if (storage && !memoryOnly.has(id)) {
    try {
      text = storage.getItem(key);
    } catch {
      text = memory.get(id) ?? null;
    }
  } else {
    text = memory.get(id) ?? null;
  }
  if (text === null) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function writeJson(area: StorageArea, key: string, value: unknown): void {
  const id = memoryKey(area, key);
  const text = JSON.stringify(value);
  memory.set(id, text);
  try {
    const storage = getArea(area);
    if (!storage) throw new Error("storage unavailable");
    storage.setItem(key, text);
    memoryOnly.delete(id);
  } catch {
    // Quota exceeded or storage blocked: keep working from memory.
    memoryOnly.add(id);
  }
}
