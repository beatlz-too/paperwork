/**
 * Generates the three secrets required for a self-hosted Supabase instance:
 *   JWT_SECRET   — random 32-byte secret used to sign all JWTs
 *   ANON_KEY     — JWT with role "anon"         (safe to expose to browsers)
 *   SERVICE_ROLE_KEY — JWT with role "service_role" (server-side only, bypasses RLS)
 *
 * Usage:
 *   bun run scripts/generate-keys.ts
 *
 * Paste the output into supabase/docker/.env before running docker compose.
 */

const secret = crypto.getRandomValues(new Uint8Array(32))
const JWT_SECRET = Buffer.from(secret).toString('base64url')

const iat = Math.floor(Date.now() / 1000)
const exp = iat + 10 * 365 * 24 * 60 * 60 // 10 years

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const unsigned = `${encode(header)}.${encode(payload)}`

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(unsigned)
  )

  return `${unsigned}.${Buffer.from(sig).toString('base64url')}`
}

const ANON_KEY = await signJwt({ role: 'anon', iss: 'supabase', iat, exp })
const SERVICE_ROLE_KEY = await signJwt({ role: 'service_role', iss: 'supabase', iat, exp })

console.log('# Paste these values into supabase/docker/.env\n')
console.log(`JWT_SECRET=${JWT_SECRET}`)
console.log(`ANON_KEY=${ANON_KEY}`)
console.log(`SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}`)
