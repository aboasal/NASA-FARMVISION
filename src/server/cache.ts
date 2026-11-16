/**
 * Tiny in-memory TTL cache + in-flight de-duplication for server-side
 * NASA API calls. NASA POWER climatology never changes and daily data
 * updates once a day, so caching keeps us fast and polite to NASA.
 */
interface Entry<T> {
  expires: number;
  value: T;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 500;

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > Date.now()) return hit.value;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const p = loader()
    .then((value) => {
      if (store.size >= MAX_ENTRIES) {
        const oldest = store.keys().next().value;
        if (oldest) store.delete(oldest);
      }
      store.set(key, { expires: Date.now() + ttlMs, value });
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
