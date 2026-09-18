import ws from 'ws'
// supabase-js (realtime) needs a global WebSocket; Node 20 lacks it natively.
if (typeof globalThis.WebSocket === 'undefined') { globalThis.WebSocket = ws }

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

export function admin() {
  return createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function anon() {
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function isManagerEmail(email) {
  if (!email) return false
  const allowed = new Set((process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
  return allowed.has(email.trim().toLowerCase())
}

export async function getUser(request) {
  // Prefer Bearer token (sent by the browser client)
  const authz = request.headers.get('authorization') || ''
  const token = authz.replace(/^Bearer\s+/i, '').trim()
  if (token) {
    const { data, error } = await anon().auth.getUser(token)
    if (!error && data?.user) return data.user
  }
  // Fall back to cookie session
  try {
    const store = await cookies()
    const sb = createServerClient(URL, ANON, {
      cookies: { getAll: () => store.getAll(), setAll: () => {} }
    })
    const { data, error } = await sb.auth.getUser()
    if (!error && data?.user) return data.user
  } catch (e) {}
  return null
}
