import { type Static, Type } from "@sinclair/typebox";
import ms from "ms";
import type { Logger } from "pino";
import {
  type StaleWhileRevalidate,
  createStaleWhileRevalidateCache,
} from "stale-while-revalidate-cache";

export const MemorySWRConfig = Type.Object({
  maxAge: Type.String(),
  logSwrEvents: Type.Boolean(),
});
export type MemorySWRConfig = Static<typeof MemorySWRConfig>;

class InMemoryStorage {
  private storage: Map<string, string>;

  constructor() {
    this.storage = new Map();
  }

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.storage.delete(key) ? 1 : 0;
  }
}

export function buildMemorySwrCache(
  config: MemorySWRConfig,
  logger: Logger,
): StaleWhileRevalidate {
  const { logSwrEvents, maxAge } = config;
  const memoryStorage = new InMemoryStorage();

  const getItem = logSwrEvents
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cacheKey: string): Promise<any> => {
        const ret = await memoryStorage.get(cacheKey);

        if (ret) {
          logger.debug({ cacheKey }, "getItem (hit)");
        } else {
          logger.debug({ cacheKey }, "getItem (miss)");
        }

        return ret;
      }
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cacheKey: string): Promise<any> => {
        return memoryStorage.get(cacheKey);
      };

  const setItem = logSwrEvents
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cacheKey: string, cacheValue: any) => {
        if (cacheValue) {
          logger.debug({ cacheKey }, "setItem");
          await memoryStorage.set(cacheKey, cacheValue);
        } else {
          logger.debug({ cacheKey }, "setItem (null item, skipping)");
        }
      }
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cacheKey: string, cacheValue: any) => {
        if (cacheValue) {
          await memoryStorage.set(cacheKey, cacheValue);
        }
      };

  const removeItem = logSwrEvents
    ? async (cacheKey: string) => {
        const ret = await memoryStorage.del(cacheKey);

        if (ret > 0) {
          logger.debug({ cacheKey }, "removeItem (hit)");
        } else {
          logger.debug({ cacheKey }, "removeItem (miss)");
        }

        return ret;
      }
    : (cacheKey: string) => memoryStorage.del(cacheKey);

  const storage = {
    getItem,
    setItem,
    removeItem,
  };

  const swr = createStaleWhileRevalidateCache({
    storage,
    maxTimeToLive: maxAge ? ms(maxAge) : Infinity,
    retry: 3,
    retryDelay: (i) => 250 * 2 ** i,
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  });

  return swr;
}
