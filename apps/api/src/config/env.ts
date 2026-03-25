import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Interswitch
  INTERSWITCH_CLIENT_ID: z.string().min(1),
  INTERSWITCH_CLIENT_SECRET: z.string().min(1),
  INTERSWITCH_BASE_URL: z.string().url().default('https://sandbox.interswitchng.com'),
  INTERSWITCH_MERCHANT_CODE: z.string().min(1),
  INTERSWITCH_PAY_ITEM_ID: z.string().min(1),
  INTERSWITCH_WEBHOOK_SECRET: z.string().min(1),

  // SMTP
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),

  // Twilio
  TWILIO_SID: z.string().min(1),
  TWILIO_TOKEN: z.string().min(1),
  TWILIO_FROM: z.string().min(1),

  // Server
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(formatted, null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
