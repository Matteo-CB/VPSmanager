import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  SECRETS_MASTER_KEY: z.string().regex(/^[0-9a-f]{64}$/i, "must be 64 hex chars (32 bytes)").optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.warn("[env] validation failed:", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : schema.parse({});

export const hasDb = !!env.DATABASE_URL;
export const hasRedis = !!env.REDIS_URL;
export const hasSecretsKey = !!env.SECRETS_MASTER_KEY;
export const hasStripe = !!env.STRIPE_SECRET_KEY;
