import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 2
});

export const withRedis = async <T>(fn: (client: Redis) => Promise<T>, fallback: () => Promise<T>): Promise<T> => {
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    return await fn(redis);
  } catch {
    return fallback();
  }
};

export const getJsonCache = async <T>(key: string): Promise<T | null> => {
  return withRedis(
    async (client) => {
      const value = await client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    },
    async () => null
  );
};

export const setJsonCache = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  await withRedis(
    async (client) => {
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    },
    async () => undefined
  );
};

export const deleteByPattern = async (pattern: string): Promise<void> => {
  await withRedis(
    async (client) => {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    },
    async () => undefined
  );
};
