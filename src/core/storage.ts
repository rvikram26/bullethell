const PREFIX = 'lanterntide.';
const memory = new Map<string, string>();

function backend(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = PREFIX + 'probe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null; // private mode, storage disabled, or running under Node
  }
}

/** JSON key-value storage that falls back to memory when localStorage is unavailable. */
export const store = {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = backend()?.getItem(PREFIX + key) ?? memory.get(PREFIX + key) ?? null;
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  write(key: string, value: unknown): void {
    const raw = JSON.stringify(value);
    memory.set(PREFIX + key, raw);
    try {
      backend()?.setItem(PREFIX + key, raw);
    } catch {
      /* quota exceeded or blocked: the in-memory copy still serves this session */
    }
  },

  remove(key: string): void {
    memory.delete(PREFIX + key);
    try {
      backend()?.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};
