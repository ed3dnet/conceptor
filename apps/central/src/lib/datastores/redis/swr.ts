import type { Redis } from "ioredis";
import ms from "ms";
import type { Logger } from "pino";
import {
  type StaleWhileRevalidate,
  createStaleWhileRevalidateCache,
} from "stale-while-revalidate-cache";

const MAX_TIME_TO_LIVE = ms("24h");

export function buildRedisSWRCache(
  logger: Logger,
  logSwrEvents: boolean,
  redis: Redis,
): StaleWhileRevalidate {
  const getItem = logSwrEvents
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cacheKey: string): Promise<any> => {
        const ret = await redis.get(cacheKey);

        if (ret) {
          logger.debug({ cacheKey }, "getItem (hit)");
        } else {
          logger.debug({ cacheKey }, "getItem (miss)");
        }

        return ret;
      }
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cacheKey: string): Promise<any> => {
        return redis.get(cacheKey);
      };

  const setItem = logSwrEvents
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cacheKey: string, cacheValue: any) => {
        if (cacheValue) {
          logger.debug({ cacheKey }, "setItem");
          // Use px or ex depending on whether you use milliseconds or seconds for your ttl
          // It is recommended to set ttl to your maxTimeToLive (it has to be more than it)
          await redis.set(cacheKey, cacheValue, "PX", MAX_TIME_TO_LIVE);
        } else {
          logger.debug({ cacheKey }, "setItem (null item, skipping)");
        }
      }
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (cacheKey: string, cacheValue: any) => {
        if (cacheValue) {
          // Use px or ex depending on whether you use milliseconds or seconds for your ttl
          // It is recommended to set ttl to your maxTimeToLive (it has to be more than it)
          await redis.set(cacheKey, cacheValue, "PX", MAX_TIME_TO_LIVE);
        }
      };

  const removeItem = logSwrEvents
    ? async (cacheKey: string) => {
        const ret = await redis.del(cacheKey);

        if (ret > 0) {
          logger.debug({ cacheKey }, "removeItem (hit)");
        } else {
          logger.debug({ cacheKey }, "removeItem (miss)");
        }

        return ret;
      }
    : (cacheKey: string) => redis.del(cacheKey);

  const storage = {
    getItem,
    setItem,
    removeItem,
  };

  const swr = createStaleWhileRevalidateCache({
    storage,
    maxTimeToLive: MAX_TIME_TO_LIVE,
    retry: 3,
    retryDelay: (i) => 250 * 2 ** i,
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  });

  return swr;
}
