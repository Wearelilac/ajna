import { z } from 'zod';

const envSchema = z.object({
  AJNA_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  AJNA_PORT: z.coerce.number().default(3000),
  AJNA_KEK_BASE64: z.string().min(1, 'AJNA_KEK_BASE64 is required'),
  AJNA_JWT_SECRET: z.string().min(1, 'AJNA_JWT_SECRET is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  AJNA_SCORING_URL: z.string().url('AJNA_SCORING_URL must be a valid URL'),
  AJNA_SCORING_TOKEN: z.string().min(1, 'AJNA_SCORING_TOKEN is required'),
});

export type AppConfig = z.infer<typeof envSchema>;

export function validateConfig(): AppConfig {
  try {
    return envSchema.parse(process.env);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const missing = err.errors
        .map((e) => e.path.join('.'))
        .join(', ');
      console.error(`Missing or invalid environment variables: ${missing}`);
      process.exit(1);
    }
    throw err;
  }
}

export function getConfig(): AppConfig {
  return validateConfig();
}
