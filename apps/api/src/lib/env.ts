import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | undefined

export function env(): Env {
  if (!_env) {
    const parsed = envSchema.safeParse(process.env)
    if (!parsed.success) {
      throw new Error(`Invalid environment variables: ${parsed.error.message}`)
    }
    _env = parsed.data
  }
  return _env
}
