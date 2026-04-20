import Redis from "ioredis";
import { env, hasRedis } from "./env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis | null {
  if (!hasRedis) return null;
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    globalForRedis.redis.on("error", (err) => {
      console.warn("[redis] error:", err.message);
    });
  }
  return globalForRedis.redis;
}
