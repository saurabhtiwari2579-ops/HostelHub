import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { admin, anon, getUser, isManagerEmail } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'payment-receipts'
const SITE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

function j(data, status = 200) {
  return NextResponse.json(data, { status })
}

function initials(name) {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

function monthLabel(d = new Date()) {
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

// Ensure a profile row exists for the authenticated user; returns the profile.
async function ensureProfile(user) {
  const db = admin()
  const { data: existing } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (existing) {
    if (isManagerEmail(user.email) && existing.role !== 'manager') {
      await db.from('profiles').update({ role: 'manager' }).eq('id', user.id)
      existing.role = 'manager'
    } else if (!isManagerEmail(user.email) && existing.role === 'manager') {
      await db.from('profiles').update({ role: 'resident' }).eq('id', user.id)
      existing.role = 'resident'
    }
    return existing
  }
  const row = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
    role: isManagerEmail(user.email) ? 'manager' : 'resident',
  }
  const { data } = await db.from('profiles').insert(row).select().single()
  return data
}

/* ============================ GET ============================ */
export async function GET(request, context) {
  try {
    const params = await context.params
    const path = params?.path || []
    const resource = path.join('/')
    const url = new URL(request.url)

    if (resource === 'health') return j({ ok: true })

    // ---- OAuth callback: exchange code -> set session cookies -> redirect ----
    if (resource === 'auth/callback') {
      const code = url.searchParams.get('code')
      const response = NextResponse.redirect(new URL('/', SITE))
      if (!code) return response
      const store = await cookies()
      const sb = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll: () => store.getAll(),
            setAll: (values) => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
          },
        }
      )
      await sb.auth.exchangeCodeForSession(code)
      return response
    }

    const user = await getUser(request)
    if (!user) return j({ error: 'Unauthorized' }, 401)
    const profile = await ensureProfile(user)
    const manager = profile.role === 'manager'

    if (resource === 'me') {
      let room = null, due = null
      if (profile.room_number) {
        const { data: r } = await admin().from('rooms').select('*').eq('room_number', profile.room_number).maybeSingle()
        room = r
        if (r?.monthly_rent != null) due = Number(r.monthly_rent)
      }
      return j({ profile, isManager: manager, room, due, currentMonth: monthLabel() })
    }

    if (resource === 'rooms') {
      const { data: rooms } = await admin().from('rooms').select('*').order('room_number')
      const { data: residents } = await admin().from('profiles')
        .select('id, full_name, course, room_number').not('room_number', 'is', null)
      const byRoom = {}
      ;(residents || []).forEach(r => {
        if (!byRoom[r.room_number]) byRoom[r.room_number] = []
        byRoom[r.room_number].push({ id: r.id, name: r.full_name, initials: initials(r.full_name), course: r.course })
      })
      const out = (rooms || []).map(room => {
        const occupants = byRoom[room.room_number] || []
        const base = {
          room_number: room.room_number, floor: room.floor, wing: room.wing,
          capacity: room.capacity, is_store: room.is_store,
          occupants, occupied: occupants.length,
        }
        if (manager) base.monthly_rent = room.monthly_rent
        return base
      })
      return j({ rooms: out, isManager: manager })
    }

    if (resource === 'payments') {
      const db = admin()
      let query = db.from('rent_payments').select('*').order('created_at', { ascending: false })
      if (!manager) query = query.eq('resident_id', user.id)
      else if (url.searchParams.get('status')) query = query.eq('status', url.searchParams.get('status'))
      const { data } = await query
      return j({ payments: data || [] })
    }

    if (resource === 'bookings') {
      const db = admin()
      let query = db.from('booking_requests').select('*').order('created_at', { ascending: false })
      if (!manager) query = query.eq('resident_id', user.id)
      const { data } = await query
      return j({ bookings: data || [] })
    }

    if (resource === 'payments/receipt') {
      const p = url.searchParams.get('path')
      if (!p) return j({ error: 'Missing path' }, 400)
      if (!manager && !p.startsWith(user.id + '/')) return j({ error: 'Forbidden' }, 403)
      const { data, error } = await admin().storage.from(BUCKET).createSignedUrl(p, 600)
      if (error) return j({ error: error.message }, 400)
      return j({ url: data.signedUrl })
    }

    if (resource === 'manager/stats') {
      if (!manager) return j({ error: 'Forbidden' }, 403)
      const db = admin()
      const { data: rooms } = await db.from('rooms').select('*').eq('is_store', false)
      const { data: residents } = await db.from('profiles').select('room_number').not('room_number', 'is', null)
      const counts = {}
      ;(residents || []).forEach(r => { counts[r.room_number] = (counts[r.room_number] || 0) + 1 })
      let occupied = 0, partial = 0, empty = 0, beds = 0
      ;(rooms || []).forEach(room => {
        const n = counts[room.room_number] || 0
        beds += n
        if (n >= room.capacity && room.capacity > 0) occupied++
        else if (n > 0) partial++
        else empty++
      })
      const totalRooms = (rooms || []).length
      const totalBeds = (rooms || []).reduce((s, r) => s + r.capacity, 0)
      const { count: pendingPayments } = await db.from('rent_payments').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: pendingBookings } = await db.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      return j({ occupied, partial, empty, beds, totalBeds, totalRooms, pendingPayments: pendingPayments || 0, pendingBookings: pendingBookings || 0 })
    }

    if (resource === 'manager/residents') {
      if (!manager) return j({ error: 'Forbidden' }, 403)
      const { data } = await admin().from('profiles').select('*').eq('role', 'resident').order('room_number', { nullsFirst: false })
      const { data: rooms } = await admin().from('rooms').select('room_number, monthly_rent, floor, wing')
      const rmap = {}; (rooms || []).forEach(r => rmap[r.room_number] = r)
      const out = (data || []).map(p => ({ ...p, room: p.room_number ? rmap[p.room_number] : null }))
      return j({ residents: out })
    }

    if (resource === 'manager/export') {
      if (!manager) return j({ error: 'Forbidden' }, 403)
      const db = admin()
      const [{ data: residents }, { data: rooms }, { data: payments }, { data: bookings }] = await Promise.all([
        db.from('profiles').select('*').eq('role', 'resident'),
        db.from('rooms').select('*').order('room_number'),
        db.from('rent_payments').select('*').order('created_at', { ascending: false }),
        db.from('booking_requests').select('*').order('created_at', { ascending: false }),
      ])
      return j({ residents: residents || [], rooms: rooms || [], payments: payments || [], bookings: bookings || [] })
    }

    if (resource === 'manager/pending-rent') {
      if (!manager) return j({ error: 'Forbidden' }, 403)
      const db = admin()
      const { data: residents } = await db.from('profiles').select('*').eq('role', 'resident').not('room_number', 'is', null)
      const month = monthLabel()
      const { data: paid } = await db.from('rent_payments').select('resident_id').eq('month', month).eq('status', 'approved')
      const paidSet = new Set((paid || []).map(p => p.resident_id))
      const { data: rooms } = await db.from('rooms').select('room_number, monthly_rent')
      const rmap = {}; (rooms || []).forEach(r => rmap[r.room_number] = r.monthly_rent)
      const pending = (residents || []).filter(r => !paidSet.has(r.id)).map(r => ({
        id: r.id, full_name: r.full_name, self_mobile: r.self_mobile, parent_mobile: r.parent_mobile,
        email: r.email, room_number: r.room_number, amount: rmap[r.room_number], month,
      }))
      return j({ pending, month })
    }

    return j({ error: 'Not found' }, 404)
  } catch (e) {
    return j({ error: e.message || 'Server error' }, 500)
  }
}

/* ============================ POST ============================ */
export async function POST(request, context) {
  try {
    const params = await context.params
    const path = params?.path || []
    const resource = path.join('/')

    const user = await getUser(request)
    if (!user) return j({ error: 'Unauthorized' }, 401)
    const profile = await ensureProfile(user)
    const manager = profile.role === 'manager'
    const db = admin()

    if (resource === 'bookings') {
      const b = await request.json()
      const details = {
        full_name: b.full_name, aadhaar: b.aadhaar, course: b.course,
        self_mobile: b.self_mobile, parent_mobile: b.parent_mobile,
        permanent_address: b.permanent_address,
      }
      await db.from('profiles').update(details).eq('id', user.id)
      const { data, error } = await db.from('booking_requests').insert({
        resident_id: user.id, room_number: b.room_number ? Number(b.room_number) : null,
        ...details, status: 'pending',
      }).select().single()
      if (error) return j({ error: error.message }, 400)
      return j({ booking: data }, 201)
    }

    if (resource === 'profile') {
      const b = await request.json()
      const allowed = ['full_name', 'aadhaar', 'course', 'permanent_address', 'self_mobile', 'parent_mobile']
      const upd = {}
      allowed.forEach(k => { if (b[k] !== undefined) upd[k] = b[k] })
      const { data, error } = await db.from('profiles').update(upd).eq('id', user.id).select().single()
      if (error) return j({ error: error.message }, 400)
      return j({ profile: data })
    }

    if (resource === 'payments') {
      if (!profile.room_number) return j({ error: 'No room allotted yet' }, 400)
      const { data: room } = await db.from('rooms').select('*').eq('room_number', profile.room_number).maybeSingle()
      if (!room || room.monthly_rent == null) return j({ error: 'Rent not set by manager yet. Please contact the manager.' }, 400)

      const form = await request.formData()
      const transaction_id = String(form.get('transaction_id') || '')
      const month = String(form.get('month') || monthLabel())
      const file = form.get('receipt')
      if (!file || typeof file.arrayBuffer !== 'function') return j({ error: 'Payment screenshot is required' }, 400)
      const okTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/jpg']
      if (!okTypes.includes(file.type)) return j({ error: 'Receipt must be an image (JPG/PNG/WebP) or PDF' }, 400)
      if (file.size > 10 * 1024 * 1024) return j({ error: 'Max file size is 10 MB' }, 413)
      const ext = file.type === 'application/pdf' ? 'pdf' : (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
      const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`
      const up = await db.storage.from(BUCKET).upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
      if (up.error) return j({ error: up.error.message }, 400)

      const { data, error } = await db.from('rent_payments').insert({
        resident_id: user.id, full_name: profile.full_name, room_number: profile.room_number,
        month, amount: Number(room.monthly_rent), transaction_id, receipt_path: storagePath, status: 'pending',
      }).select().single()
      if (error) return j({ error: error.message }, 400)
      return j({ payment: data }, 201)
    }

    if (resource.startsWith('manager/')) {
      if (!manager) return j({ error: 'Forbidden' }, 403)
      const b = await request.json().catch(() => ({}))

      if (resource === 'manager/bookings/approve') {
        const { id, room_number, monthly_rent } = b
        const { data: booking } = await db.from('booking_requests').select('*').eq('id', id).maybeSingle()
        if (!booking) return j({ error: 'Booking not found' }, 404)
        const rn = Number(room_number || booking.room_number)
        const { count } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('room_number', rn)
        const { data: room } = await db.from('rooms').select('*').eq('room_number', rn).maybeSingle()
        if (!room) return j({ error: 'Room not found' }, 404)
        if (room.is_store) return j({ error: 'Store room cannot be allotted' }, 400)
        if ((count || 0) >= room.capacity) return j({ error: 'Room is already full' }, 400)
        if (monthly_rent != null && monthly_rent !== '') await db.from('rooms').update({ monthly_rent: Number(monthly_rent) }).eq('room_number', rn)
        await db.from('profiles').update({
          room_number: rn, allotted_on: new Date().toISOString().slice(0, 10),
          full_name: booking.full_name, aadhaar: booking.aadhaar, course: booking.course,
          self_mobile: booking.self_mobile, parent_mobile: booking.parent_mobile,
          permanent_address: booking.permanent_address,
        }).eq('id', booking.resident_id)
        await db.from('booking_requests').update({ status: 'approved', room_number: rn, reviewed_at: new Date().toISOString() }).eq('id', id)
        return j({ ok: true })
      }

      if (resource === 'manager/bookings/reject') {
        await db.from('booking_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', b.id)
        return j({ ok: true })
      }

      if (resource === 'manager/payments/approve') {
        await db.from('rent_payments').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', b.id)
        return j({ ok: true })
      }

      if (resource === 'manager/payments/reject') {
        await db.from('rent_payments').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', b.id)
        return j({ ok: true })
      }

      if (resource === 'manager/rooms/rent') {
        await db.from('rooms').update({ monthly_rent: Number(b.monthly_rent) }).eq('room_number', Number(b.room_number))
        return j({ ok: true })
      }

      if (resource === 'manager/residents/remove') {
        await db.from('profiles').update({ room_number: null, allotted_on: null }).eq('id', b.id)
        return j({ ok: true })
      }

      return j({ error: 'Not found' }, 404)
    }

    return j({ error: 'Not found' }, 404)
  } catch (e) {
    return j({ error: e.message || 'Server error' }, 500)
  }
}
