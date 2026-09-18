'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import * as XLSX from 'xlsx'
import { getBrowserSupabase } from '@/lib/supabaseBrowser'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import {
  Home, BedDouble, User, CreditCard, Search, Bell, LogOut, Loader2, Copy, Check,
  ShieldAlert, Phone, MessageCircle, Calendar, Users, FileSpreadsheet, ClipboardList,
  BadgeCheck, X, Upload, Eye, ChevronDown, Building2, LayoutDashboard, Send, Pencil,
} from 'lucide-react'

/* ----------------------------- constants ----------------------------- */
const HOSTEL_NAME = 'Shri Baijnath Hostel'
const HOSTEL_ADDR = 'Near TS Mishra University, Anora Amausi, Lucknow'
const UPI_ID = 'vyapar.175693159521@hdfcbank'
const SUPPORT_PHONE = '8853187460'
const OWNER_PHONE = '9936869261'
const HERO_IMG = 'https://images.pexels.com/photos/4907220/pexels-photo-4907220.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'
const FLOORS = ['Ground', '1st', '2nd', '3rd']

const upiString = (amount) =>
  `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(HOSTEL_NAME)}&cu=INR${amount ? `&am=${amount}` : ''}`
const waLink = (phone, text) => `https://wa.me/91${phone}?text=${encodeURIComponent(text || '')}`
const fmt = (n) => (n == null || n === '' ? '—' : '\u20B9' + Number(n).toLocaleString('en-IN'))
const dt = (s) => (s ? new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
const d = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

/* ============================ ROOT ============================ */
export default function App() {
  const supabase = useMemo(() => getBrowserSupabase(), [])
  const [session, setSession] = useState(null)
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)

  const api = useCallback(async (path, opts = {}) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const headers = { ...(opts.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (opts.json) { headers['Content-Type'] = 'application/json'; opts = { ...opts, body: JSON.stringify(opts.json) } }
    const res = await fetch(`/api/${path}`, { ...opts, headers })
    const out = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(out.error || 'Request failed')
    return out
  }, [supabase])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setMe(null); setLoading(false) }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [supabase])

  const loadMe = useCallback(() => {
    api('me').then(setMe).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }, [api])

  useEffect(() => { if (session) { setLoading(true); loadMe() } }, [session, loadMe])

  const login = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) toast.error(error.message)
  }
  const logout = async () => { await supabase.auth.signOut(); setSession(null); setMe(null) }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toaster position="top-center" richColors />
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
        </div>
      ) : !session ? (
        <LoginScreen login={login} />
      ) : me?.isManager ? (
        <ManagerConsole api={api} me={me} logout={logout} />
      ) : (
        <ResidentApp api={api} me={me} reloadMe={loadMe} logout={logout} />
      )}
    </div>
  )
}

/* ============================ LOGIN ============================ */
function LoginScreen({ login }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden">
        <img src={HERO_IMG} alt="hostel" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/90 via-teal-800/80 to-slate-900/85" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Home className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xl font-bold leading-tight">{HOSTEL_NAME}</p>
            <p className="text-sm text-teal-100">{HOSTEL_ADDR}</p>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold leading-tight">Hostel for a<br />Brighter Tomorrow</h1>
          <p className="mt-3 text-teal-100 text-lg">Safe Stay. Better Learning. Book your room, manage rent and stay connected — all in one place.</p>
        </div>
        <div className="relative z-10 text-teal-100 text-sm">For Girls & Boys · 30 rooms</div>
      </div>

      {/* Login panel */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center"><Home className="w-6 h-6" /></div>
            <div>
              <p className="text-lg font-bold">{HOSTEL_NAME}</p>
              <p className="text-xs text-slate-500">{HOSTEL_ADDR}</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-slate-500">Sign in with Google to access your hostel account.</p>

          <button onClick={login} className="mt-8 w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-3.5 font-medium hover:bg-slate-50 transition shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" /><path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.47 14.97.5 12 .5 7.7.5 3.99 2.97 2.18 6.55L5.84 9.4C6.71 6.8 9.14 4.75 12 4.75z" /></svg>
            Continue with Google
          </button>

          <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-center gap-2 text-red-700 font-semibold"><ShieldAlert className="w-5 h-5" /> Emergency & Support</div>
            <p className="text-sm text-red-700/80 mt-1">Health issue or urgent help? Contact us anytime.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center justify-center gap-2 bg-white border border-red-200 rounded-lg py-2 text-sm font-medium text-red-700 hover:bg-red-100"><Phone className="w-4 h-4" /> Call Manager</a>
              <a href={waLink(SUPPORT_PHONE, 'Hello, I need urgent help at Shri Baijnath Hostel.')} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-white border border-red-200 rounded-lg py-2 text-sm font-medium text-green-700 hover:bg-green-50"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
            </div>
            <p className="mt-3 text-xs text-slate-500">Support: {SUPPORT_PHONE} · Owner: {OWNER_PHONE}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================ EMERGENCY BUTTON ============================ */
function EmergencyButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} title="Emergency help"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 flex items-center justify-center hover:bg-red-700 animate-pulse">
        <ShieldAlert className="w-7 h-7" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2 text-red-700"><ShieldAlert className="w-5 h-5" /> Emergency Help</h3>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mt-1">Facing a health issue or emergency? Reach the manager instantly.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border p-4">
                <p className="font-semibold">Hostel Manager</p>
                <p className="text-sm text-slate-500">{SUPPORT_PHONE}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center justify-center gap-2 bg-teal-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-800"><Phone className="w-4 h-4" /> Call Now</a>
                  <a href={waLink(SUPPORT_PHONE, 'EMERGENCY: I need urgent help at Shri Baijnath Hostel.')} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <p className="font-semibold">Owner</p>
                <p className="text-sm text-slate-500">{OWNER_PHONE}</p>
                <a href={`tel:${OWNER_PHONE}`} className="mt-3 flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-2 text-sm font-medium hover:bg-slate-50"><Phone className="w-4 h-4" /> Call Owner</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ============================ RESIDENT APP ============================ */
function ResidentApp({ api, me, reloadMe, logout }) {
  const [tab, setTab] = useState('rooms')
  const nav = [
    { id: 'rooms', label: 'Rooms', icon: BedDouble },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ]
  return (
    <div>
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center"><Home className="w-5 h-5" /></div>
            <div className="hidden sm:block leading-tight">
              <p className="font-bold text-sm">{HOSTEL_NAME}</p>
              <p className="text-[11px] text-slate-500">{HOSTEL_ADDR}</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 ml-2">
            {nav.map((n) => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${tab === n.id ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                <n.icon className="w-4 h-4" /> <span className="hidden sm:inline">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-sm font-semibold">{(me.profile.full_name || 'U').slice(0, 2).toUpperCase()}</div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold">{me.profile.full_name}</p>
              <p className="text-[11px] text-slate-500">Resident</p>
            </div>
            <button onClick={logout} title="Logout" className="text-slate-400 hover:text-slate-700"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'rooms' && <RoomsCatalog api={api} me={me} reloadMe={reloadMe} />}
        {tab === 'profile' && <ProfileView api={api} me={me} reloadMe={reloadMe} />}
        {tab === 'payments' && <PaymentsView api={api} me={me} />}
      </main>
      <EmergencyButton />
    </div>
  )
}

function occBadge(o, cap, isStore) {
  if (isStore) return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">Store Room</span>
  if (o >= cap) return <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">{o}/{cap} occupied</span>
  if (o > 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{o}/{cap} occupied</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Vacant</span>
}

function RoomsCatalog({ api, me, reloadMe }) {
  const [rooms, setRooms] = useState([])
  const [floor, setFloor] = useState('Ground')
  const [q, setQ] = useState('')
  const [booking, setBooking] = useState(false)

  const load = useCallback(() => { api('rooms').then((r) => setRooms(r.rooms)).catch((e) => toast.error(e.message)) }, [api])
  useEffect(() => { load() }, [load])

  const filtered = rooms.filter((r) => {
    if (q) {
      const s = q.toLowerCase()
      return String(r.room_number).includes(s) || (r.occupants || []).some((o) => (o.name || '').toLowerCase().includes(s))
    }
    return r.floor === floor
  })
  const wings = [...new Set(filtered.map((r) => r.wing))]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-white border rounded-xl p-1">
          {FLOORS.map((f) => (
            <button key={f} onClick={() => { setFloor(f); setQ('') }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${floor === f && !q ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{f} Floor</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search room number or resident name..."
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div className="text-xs bg-teal-50 text-teal-700 px-3 py-2 rounded-lg font-medium">30 rooms · 1-2 residents per room</div>
        <button onClick={() => setBooking(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">Book a Room</button>
      </div>

      {wings.map((wing) => {
        const list = filtered.filter((r) => r.wing === wing)
        return (
          <div key={wing}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800">{q ? 'Search results' : `${floor} Floor — ${wing === 'Store' ? 'Store' : wing + ' Wing'}`}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((r) => <RoomCard key={r.room_number} r={r} />)}
            </div>
          </div>
        )
      })}

      {booking && <BookingDialog api={api} me={me} rooms={rooms} onClose={() => setBooking(false)} onDone={() => { setBooking(false); load(); reloadMe() }} />}
    </div>
  )
}

function RoomCard({ r }) {
  const vac = r.is_store ? 0 : r.capacity - r.occupied
  return (
    <div className={`rounded-xl border p-4 ${r.is_store ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <BedDouble className="w-4 h-4 text-slate-400" /> Room {String(r.room_number).padStart(2, '0')}
        </div>
        {occBadge(r.occupied, r.capacity, r.is_store)}
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {r.is_store ? (
          <p className="text-sm text-slate-400">Not allotted for residence</p>
        ) : r.occupied === 0 ? (
          <p className="text-sm text-slate-400">No occupants yet</p>
        ) : (
          r.occupants.map((o) => (
            <div key={o.id} className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold flex items-center justify-center">{o.initials}</div>
              <span className="text-sm text-slate-700">{o.name}</span>
            </div>
          ))
        )}
        {!r.is_store && vac > 0 && (
          <span className="text-xs text-emerald-600 font-medium ml-auto">{vac} vacancy</span>
        )}
      </div>
    </div>
  )
}

const COURSES = ['B.Tech (CSE)', 'B.Tech (ME)', 'B.Tech (EE)', 'B.Sc', 'B.Com', 'BBA', 'BCA', 'M.Tech', 'M.Sc', 'MBA', 'Pharmacy', 'Other']

function BookingDialog({ api, me, rooms, onClose, onDone }) {
  const p = me.profile
  const [f, setF] = useState({
    full_name: p.full_name || '', aadhaar: p.aadhaar || '', course: p.course || 'B.Tech (CSE)',
    self_mobile: p.self_mobile || '', parent_mobile: p.parent_mobile || '', permanent_address: p.permanent_address || '',
    room_number: '',
  })
  const [busy, setBusy] = useState(false)
  const vacant = rooms.filter((r) => !r.is_store && r.occupied < r.capacity)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async () => {
    if (!f.full_name || !f.self_mobile || !f.room_number) return toast.error('Please fill name, mobile and select a room')
    setBusy(true)
    try {
      await api('bookings', { method: 'POST', json: f })
      toast.success('Booking request submitted! The manager will review and allot your room.')
      onDone()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold">Room Booking Request</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Fill your details. The manager will review, decide the rent, and allot your room.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full Name" value={f.full_name} onChange={set('full_name')} />
          <Field label="Aadhaar Number" value={f.aadhaar} onChange={set('aadhaar')} />
          <div>
            <label className="text-xs font-medium text-slate-600">Course</label>
            <select value={f.course} onChange={set('course')} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
              {COURSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Your Mobile Number" value={f.self_mobile} onChange={set('self_mobile')} />
          <Field label="Parent's Mobile Number" value={f.parent_mobile} onChange={set('parent_mobile')} />
          <div>
            <label className="text-xs font-medium text-slate-600">Preferred Room</label>
            <select value={f.room_number} onChange={set('room_number')} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select an available room</option>
              {vacant.map((r) => <option key={r.room_number} value={r.room_number}>Room {String(r.room_number).padStart(2, '0')} — {r.floor} Floor, {r.wing} Wing ({r.capacity - r.occupied} slot left)</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">Permanent Address</label>
            <textarea value={f.permanent_address} onChange={set('permanent_address')} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={submit} disabled={busy} className="mt-5 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit Booking Request
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', disabled }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input type={type} value={value ?? ''} onChange={onChange} disabled={disabled}
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
    </div>
  )
}

function ProfileView({ api, me, reloadMe }) {
  const p = me.profile
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState(p)
  const [bookings, setBookings] = useState([])
  const [busy, setBusy] = useState(false)
  useEffect(() => { setF(p) }, [p])
  useEffect(() => { api('bookings').then((r) => setBookings(r.bookings)).catch(() => {}) }, [api])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    setBusy(true)
    try { await api('profile', { method: 'POST', json: f }); toast.success('Profile updated'); setEdit(false); reloadMe() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-2xl font-bold">{(p.full_name || 'U').slice(0, 2).toUpperCase()}</div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{p.full_name}</h2>
          <p className="text-slate-500">{p.room_number ? `Room ${String(p.room_number).padStart(2, '0')} · ${me.room?.floor} Floor, ${me.room?.wing} Wing` : 'No room allotted yet'}</p>
          <p className="text-sm text-slate-500">{p.course || '—'} · {HOSTEL_NAME}</p>
        </div>
        {!edit && <button onClick={() => setEdit(true)} className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50"><Pencil className="w-4 h-4" /> Edit Profile</button>}
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-center gap-2 mb-1"><User className="w-5 h-5 text-teal-700" /><h3 className="font-bold">Personal Details</h3></div>
        <p className="text-sm text-slate-500 mb-4">Your information is private and visible only to you and the manager.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Aadhaar Number" value={f.aadhaar} onChange={set('aadhaar')} disabled={!edit} />
          <div>
            <label className="text-xs font-medium text-slate-600">Course</label>
            <select value={f.course || ''} onChange={set('course')} disabled={!edit} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500">
              {COURSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Your Mobile Number" value={f.self_mobile} onChange={set('self_mobile')} disabled={!edit} />
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">Permanent Address</label>
            <textarea value={f.permanent_address || ''} onChange={set('permanent_address')} disabled={!edit} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500" />
          </div>
          <Field label="Parent's Mobile Number" value={f.parent_mobile} onChange={set('parent_mobile')} disabled={!edit} />
        </div>
        {edit && (
          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={busy} className="bg-teal-700 hover:bg-teal-800 text-white rounded-lg px-5 py-2 text-sm font-medium flex items-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes</button>
            <button onClick={() => { setEdit(false); setF(p) }} className="border rounded-lg px-5 py-2 text-sm font-medium">Cancel</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><BedDouble className="w-5 h-5 text-teal-700" /><h3 className="font-bold">Room Status</h3></div>
          {p.room_number
            ? <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium flex items-center gap-1"><BadgeCheck className="w-4 h-4" /> Allotted</span>
            : <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">Not allotted</span>}
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-5 flex items-center justify-between">
          {p.room_number ? (
            <>
              <div><p className="text-xl font-bold">Room {String(p.room_number).padStart(2, '0')}</p><p className="text-sm text-slate-500">{me.room?.floor} Floor, {me.room?.wing} Wing</p></div>
              <div className="flex items-center gap-2 text-slate-600"><Calendar className="w-5 h-5" /><div><p className="text-xs text-slate-400">Allotted on</p><p className="font-medium">{d(p.allotted_on)}</p></div></div>
            </>
          ) : <p className="text-slate-500">Submit a booking request from the <b>Rooms</b> tab. The manager will review and allot your room.</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-center gap-2 mb-4"><ClipboardList className="w-5 h-5 text-teal-700" /><h3 className="font-bold">Booking History</h3></div>
        {bookings.length === 0 ? <p className="text-sm text-slate-400">No booking requests yet.</p> : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : b.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                  {b.status === 'approved' ? <Check className="w-4 h-4" /> : b.status === 'rejected' ? <X className="w-4 h-4" /> : <Loader2 className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Requested Room {String(b.room_number).padStart(2, '0')} — <span className={b.status === 'approved' ? 'text-emerald-700' : b.status === 'rejected' ? 'text-red-600' : 'text-amber-700'}>{b.status}</span></p>
                  <p className="text-xs text-slate-500">Requested on {dt(b.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function statusPill(s) {
  const map = { approved: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', rejected: 'bg-red-100 text-red-600' }
  const label = { approved: 'Approved', pending: 'Pending Review', rejected: 'Rejected' }
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[s] || 'bg-slate-100 text-slate-600'}`}>{label[s] || s}</span>
}

function PaymentsView({ api, me }) {
  const [payments, setPayments] = useState([])
  const [txn, setTxn] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const load = useCallback(() => { api('payments').then((r) => setPayments(r.payments)).catch(() => {}) }, [api])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!file) return toast.error('Please attach a payment screenshot')
    if (!me.profile.room_number) return toast.error('No room allotted yet')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('transaction_id', txn)
      fd.append('month', me.currentMonth)
      fd.append('receipt', file)
      await api('payments', { method: 'POST', body: fd })
      toast.success('Payment submitted! Waiting for manager approval.')
      setTxn(''); setFile(null); load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const viewReceipt = async (path) => {
    try { const { url } = await api(`payments/receipt?path=${encodeURIComponent(path)}`); window.open(url, '_blank') }
    catch (e) { toast.error(e.message) }
  }
  const copy = () => { navigator.clipboard.writeText(UPI_ID); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-500 text-sm">Current Due · {me.currentMonth}</p>
          <h2 className="text-3xl font-bold mt-1">{me.due != null ? `Rent Due: ${fmt(me.due)}` : 'Rent not set yet'}</h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            Pay via UPI: <span className="font-medium">{UPI_ID}</span>
            <button onClick={copy} className="text-teal-700">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="bg-white border rounded-xl p-3">
              <QRCodeCanvas value={upiString(me.due)} size={128} />
            </div>
            <div className="text-sm text-slate-500">
              <p className="font-medium text-slate-700">Scan & pay with any UPI app</p>
              <p>HDFC Bank (UPI)</p>
              <p className="mt-2">After payment, upload the screenshot for verification →</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-bold">Attach Payment Screenshot</h3>
          <p className="text-sm text-slate-500">Upload a clear screenshot of your UPI payment confirmation.</p>
          <label className="text-xs font-medium text-slate-600 mt-4 block">Transaction ID (optional)</label>
          <input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="e.g. 429187656123" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          <label className="text-xs font-medium text-slate-600 mt-4 block">Payment Screenshot</label>
          <label className="mt-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-center">
            <Upload className="w-6 h-6 text-slate-400" />
            <span className="text-sm text-slate-600 mt-2">{file ? file.name : 'Click to upload receipt'}</span>
            <span className="text-xs text-slate-400">JPG, PNG or PDF (Max 10 MB)</span>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button onClick={submit} disabled={busy} className="mt-4 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit for Verification</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h3 className="font-bold text-lg">My Payment History</h3>
        <p className="text-sm text-slate-500 mb-4">All your rent payments and their status.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 border-b">
              <th className="py-2 pr-4">Month</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Submitted</th><th className="py-2 pr-4">Txn ID</th><th className="py-2 pr-4">Receipt</th><th className="py-2 pr-4">Status</th>
            </tr></thead>
            <tbody>
              {payments.length === 0 ? <tr><td colSpan={6} className="py-6 text-center text-slate-400">No payments yet.</td></tr> :
                payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{p.month}</td>
                    <td className="py-3 pr-4">{fmt(p.amount)}</td>
                    <td className="py-3 pr-4 text-slate-500">{dt(p.created_at)}</td>
                    <td className="py-3 pr-4 text-slate-500">{p.transaction_id || '—'}</td>
                    <td className="py-3 pr-4">{p.receipt_path ? <button onClick={() => viewReceipt(p.receipt_path)} className="text-teal-700 flex items-center gap-1"><Eye className="w-4 h-4" /> View</button> : '—'}</td>
                    <td className="py-3 pr-4">{statusPill(p.status)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-slate-500">Payment not approved within 24 hours? Contact the hostel manager.</p>
          <div className="flex gap-3">
            <a href={waLink(SUPPORT_PHONE, 'Hello, regarding my hostel rent payment...')} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-green-700 font-medium"><MessageCircle className="w-4 h-4" /> WhatsApp Manager</a>
            <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-2 text-sm text-teal-700 font-medium"><Phone className="w-4 h-4" /> Call Manager</a>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================ MANAGER CONSOLE ============================ */
function ManagerConsole({ api, me, logout }) {
  const [view, setView] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const loadStats = useCallback(() => { api('manager/stats').then(setStats).catch((e) => toast.error(e.message)) }, [api])
  useEffect(() => { loadStats() }, [loadStats])

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bookings', label: 'Booking Requests', icon: Calendar },
    { id: 'payments', label: 'Payment Approvals', icon: CreditCard },
    { id: 'residents', label: 'Residents', icon: Users },
    { id: 'reminders', label: 'Rent Reminders', icon: Send },
    { id: 'export', label: 'Export to Excel', icon: FileSpreadsheet },
  ]

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r flex flex-col fixed h-screen">
        <div className="p-5 flex items-center gap-2.5 border-b">
          <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center"><Home className="w-5 h-5" /></div>
          <div className="leading-tight"><p className="font-bold text-sm">{HOSTEL_NAME}</p><p className="text-[11px] text-slate-500">Manager Console</p></div>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${view === n.id ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              <n.icon className="w-5 h-5" /> {n.label}
              {n.id === 'payments' && stats?.pendingPayments > 0 && <span className="ml-auto bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{stats.pendingPayments}</span>}
              {n.id === 'bookings' && stats?.pendingBookings > 0 && <span className="ml-auto bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{stats.pendingBookings}</span>}
            </button>
          ))}
        </nav>
        <div className="p-5 border-t">
          <p className="font-semibold text-sm">Hostel for a Brighter Tomorrow</p>
          <p className="text-xs text-slate-500">Safe Stay. Better Learning.</p>
        </div>
      </aside>

      <div className="flex-1 ml-64">
        <header className="bg-white border-b h-16 flex items-center px-6 sticky top-0 z-20">
          <h1 className="font-bold text-lg">Baijnath Hostel Manager</h1>
          <div className="flex-1" />
          <button onClick={() => setView('payments')} className="relative mr-5 text-slate-500 hover:text-slate-800">
            <Bell className="w-6 h-6" />
            {stats?.pendingPayments > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{stats.pendingPayments}</span>}
          </button>
          <div className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm font-semibold">{(me.profile.full_name || 'M').slice(0, 2).toUpperCase()}</div>
          <div className="ml-2 leading-tight hidden sm:block"><p className="text-sm font-semibold">{me.profile.full_name}</p><p className="text-[11px] text-slate-500">Manager</p></div>
          <button onClick={logout} title="Logout" className="ml-4 text-slate-400 hover:text-slate-700"><LogOut className="w-5 h-5" /></button>
        </header>

        <main className="p-6">
          {view === 'dashboard' && <ManagerDashboard api={api} me={me} stats={stats} reloadStats={loadStats} goto={setView} />}
          {view === 'bookings' && <ManagerBookings api={api} reloadStats={loadStats} />}
          {view === 'payments' && <ManagerPayments api={api} reloadStats={loadStats} />}
          {view === 'residents' && <ManagerResidents api={api} />}
          {view === 'reminders' && <ManagerReminders api={api} />}
          {view === 'export' && <ManagerExport api={api} />}
        </main>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, tint, title, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border p-5 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${tint}`}><Icon className="w-7 h-7" /></div>
      <div><p className="text-lg font-bold">{title}: {value}</p><p className="text-sm text-slate-500">{sub}</p></div>
    </div>
  )
}

function ManagerDashboard({ api, me, stats, reloadStats, goto }) {
  const [payments, setPayments] = useState([])
  const [bookings, setBookings] = useState([])
  const load = useCallback(() => {
    api('payments?status=pending').then((r) => setPayments(r.payments)).catch(() => {})
    api('bookings').then((r) => setBookings(r.bookings.filter((b) => b.status === 'pending'))).catch(() => {})
  }, [api])
  useEffect(() => { load() }, [load])
  const pct = (n) => stats?.totalRooms ? Math.round((n / stats.totalRooms) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome back, {(me.profile.full_name || '').split(' ')[0]}!</h2>
        <p className="text-slate-500">Here&apos;s what&apos;s happening at {HOSTEL_NAME} today.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard icon={Users} tint="bg-teal-100 text-teal-700" title="Occupied" value={`${stats?.occupied ?? 0} rooms`} sub={`${stats?.beds ?? 0} of ${stats?.totalBeds ?? 0} beds filled`} />
        <StatCard icon={BedDouble} tint="bg-amber-100 text-amber-700" title="Partially filled" value={`${stats?.partial ?? 0} rooms`} sub={`${pct(stats?.partial ?? 0)}% with 1 resident`} />
        <StatCard icon={Home} tint="bg-slate-100 text-slate-600" title="Empty" value={`${stats?.empty ?? 0} rooms`} sub={`${pct(stats?.empty ?? 0)}% available`} />
      </div>

      <Panel title="Pending Payment Approvals" count={payments.length} action={{ label: 'View All Payments', onClick: () => goto('payments') }}>
        <PaymentTable api={api} payments={payments} onChange={() => { load(); reloadStats() }} />
      </Panel>

      <Panel title="New Booking Requests" count={bookings.length} action={{ label: 'View All Requests', onClick: () => goto('bookings') }}>
        <BookingTable api={api} bookings={bookings} onChange={() => { load(); reloadStats() }} />
      </Panel>
    </div>
  )
}

function Panel({ title, count, action, children }) {
  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">{title} {count > 0 && <span className="bg-orange-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">{count}</span>}</h3>
        {action && <button onClick={action.onClick} className="text-sm text-teal-700 font-medium">{action.label} →</button>}
      </div>
      {children}
    </div>
  )
}

function PaymentTable({ api, payments, onChange }) {
  const [busy, setBusy] = useState(null)
  const act = async (id, kind) => {
    setBusy(id + kind)
    try { await api(`manager/payments/${kind}`, { method: 'POST', json: { id } }); toast.success(`Payment ${kind}d`); onChange() }
    catch (e) { toast.error(e.message) } finally { setBusy(null) }
  }
  const viewReceipt = async (path) => { try { const { url } = await api(`payments/receipt?path=${encodeURIComponent(path)}`); window.open(url, '_blank') } catch (e) { toast.error(e.message) } }
  if (!payments.length) return <p className="text-sm text-slate-400 py-4">No pending payments.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500 border-b"><th className="py-2 pr-4">Resident</th><th className="py-2 pr-4">Room</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Month</th><th className="py-2 pr-4">Submitted</th><th className="py-2 pr-4">Receipt</th><th className="py-2 pr-4">Actions</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-3 pr-4 font-medium">{p.full_name}</td>
              <td className="py-3 pr-4">Room {String(p.room_number).padStart(2, '0')}</td>
              <td className="py-3 pr-4">{fmt(p.amount)}</td>
              <td className="py-3 pr-4 text-slate-500">{p.month}</td>
              <td className="py-3 pr-4 text-slate-500">{dt(p.created_at)}</td>
              <td className="py-3 pr-4">{p.receipt_path ? <button onClick={() => viewReceipt(p.receipt_path)} className="text-teal-700 flex items-center gap-1"><Eye className="w-4 h-4" /> View</button> : '—'}</td>
              <td className="py-3 pr-4">
                {p.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button onClick={() => act(p.id, 'approve')} disabled={busy} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Approve</button>
                    <button onClick={() => act(p.id, 'reject')} disabled={busy} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Reject</button>
                  </div>
                ) : statusPill(p.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BookingTable({ api, bookings, onChange }) {
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(null)
  const reject = async (id) => { setBusy(id); try { await api('manager/bookings/reject', { method: 'POST', json: { id } }); toast.success('Booking rejected'); onChange() } catch (e) { toast.error(e.message) } finally { setBusy(null) } }
  if (!bookings.length) return <p className="text-sm text-slate-400 py-4">No new booking requests.</p>
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-2 pr-4">Resident</th><th className="py-2 pr-4">Room</th><th className="py-2 pr-4">Course</th><th className="py-2 pr-4">Contact</th><th className="py-2 pr-4">Requested</th><th className="py-2 pr-4">Actions</th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium">{b.full_name}</td>
                <td className="py-3 pr-4">Room {String(b.room_number).padStart(2, '0')}</td>
                <td className="py-3 pr-4">{b.course}</td>
                <td className="py-3 pr-4 text-slate-500">{b.self_mobile}</td>
                <td className="py-3 pr-4 text-slate-500">{dt(b.created_at)}</td>
                <td className="py-3 pr-4">
                  <div className="flex gap-2">
                    <button onClick={() => setReview(b)} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Review & Allot</button>
                    <button onClick={() => reject(b.id)} disabled={busy} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {review && <ReviewDialog api={api} booking={review} onClose={() => setReview(null)} onDone={() => { setReview(null); onChange() }} />}
    </>
  )
}

function ReviewDialog({ api, booking, onClose, onDone }) {
  const [room, setRoom] = useState(booking.room_number || '')
  const [rent, setRent] = useState('')
  const [busy, setBusy] = useState(false)
  const approve = async () => {
    if (!room) return toast.error('Select a room to allot')
    if (!rent) return toast.error('Enter the monthly rent for this room')
    setBusy(true)
    try {
      await api('manager/bookings/approve', { method: 'POST', json: { id: booking.id, room_number: Number(room), monthly_rent: Number(rent) } })
      toast.success('Room allotted & rent set')
      onDone()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-bold">Review Booking</h3><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        <div className="space-y-2 text-sm bg-slate-50 rounded-xl p-4">
          <Row k="Name" v={booking.full_name} /><Row k="Aadhaar" v={booking.aadhaar} /><Row k="Course" v={booking.course} />
          <Row k="Mobile" v={booking.self_mobile} /><Row k="Parent Mobile" v={booking.parent_mobile} /><Row k="Address" v={booking.permanent_address} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Allot Room No.</label>
            <input value={room} onChange={(e) => setRoom(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 14" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Monthly Rent (₹) — confidential</label>
            <input value={rent} onChange={(e) => setRent(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 6500" />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={approve} disabled={busy} className="flex-1 bg-teal-700 hover:bg-teal-800 text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />} Approve & Allot</button>
          <button onClick={onClose} className="border rounded-xl px-5 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  )
}
function Row({ k, v }) { return <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">{k}:</span><span className="font-medium text-slate-700">{v || '—'}</span></div> }

function ManagerBookings({ api, reloadStats }) {
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('pending')
  const load = useCallback(() => { api('bookings').then((r) => setBookings(r.bookings)).catch(() => {}) }, [api])
  useEffect(() => { load() }, [load])
  const list = bookings.filter((b) => filter === 'all' ? true : b.status === filter)
  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Booking Requests</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option>
        </select>
      </div>
      <BookingTable api={api} bookings={list} onChange={() => { load(); reloadStats() }} />
    </div>
  )
}

function ManagerPayments({ api, reloadStats }) {
  const [payments, setPayments] = useState([])
  const [filter, setFilter] = useState('pending')
  const load = useCallback(() => { const qs = filter === 'all' ? '' : `?status=${filter}`; api(`payments${qs}`).then((r) => setPayments(r.payments)).catch(() => {}) }, [api, filter])
  useEffect(() => { load() }, [load])
  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Payment Approvals</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option>
        </select>
      </div>
      <PaymentTable api={api} payments={payments} onChange={() => { load(); reloadStats() }} />
    </div>
  )
}

function ManagerResidents({ api }) {
  const [residents, setResidents] = useState([])
  const [busy, setBusy] = useState(null)
  const load = useCallback(() => { api('manager/residents').then((r) => setResidents(r.residents)).catch(() => {}) }, [api])
  useEffect(() => { load() }, [load])
  const remove = async (id) => { if (!confirm('Vacate this resident from their room?')) return; setBusy(id); try { await api('manager/residents/remove', { method: 'POST', json: { id } }); toast.success('Resident vacated'); load() } catch (e) { toast.error(e.message) } finally { setBusy(null) } }
  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="font-bold text-lg mb-1">Residents</h3>
      <p className="text-sm text-slate-500 mb-4">All resident details and confidential rent (visible to managers only).</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b"><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Room</th><th className="py-2 pr-4">Course</th><th className="py-2 pr-4">Mobile</th><th className="py-2 pr-4">Parent</th><th className="py-2 pr-4">Rent</th><th className="py-2 pr-4">Actions</th></tr></thead>
          <tbody>
            {residents.length === 0 ? <tr><td colSpan={7} className="py-6 text-center text-slate-400">No residents yet.</td></tr> :
              residents.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{r.full_name}</td>
                  <td className="py-3 pr-4">{r.room_number ? `Room ${String(r.room_number).padStart(2, '0')}` : <span className="text-slate-400">—</span>}</td>
                  <td className="py-3 pr-4">{r.course || '—'}</td>
                  <td className="py-3 pr-4 text-slate-500">{r.self_mobile || '—'}</td>
                  <td className="py-3 pr-4 text-slate-500">{r.parent_mobile || '—'}</td>
                  <td className="py-3 pr-4 font-medium">{r.room?.monthly_rent != null ? fmt(r.room.monthly_rent) : '—'}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      {r.self_mobile && <a href={waLink(r.self_mobile, `Hello ${r.full_name}, this is Shri Baijnath Hostel manager.`)} target="_blank" rel="noreferrer" className="text-green-700" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>}
                      {r.room_number && <button onClick={() => remove(r.id)} disabled={busy} className="text-red-500 text-xs font-medium">Vacate</button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ManagerReminders({ api }) {
  const [data, setData] = useState({ pending: [], month: '' })
  useEffect(() => { api('manager/pending-rent').then(setData).catch((e) => toast.error(e.message)) }, [api])
  return (
    <div className="bg-white rounded-2xl border p-6">
      <h3 className="font-bold text-lg mb-1">Rent Reminders — {data.month}</h3>
      <p className="text-sm text-slate-500 mb-4">Residents who haven&apos;t got an approved payment for this month. Send a WhatsApp reminder in one tap.</p>
      {data.pending.length === 0 ? <p className="text-sm text-slate-400">Everyone is up to date. 🎉</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 border-b"><th className="py-2 pr-4">Resident</th><th className="py-2 pr-4">Room</th><th className="py-2 pr-4">Amount Due</th><th className="py-2 pr-4">Mobile</th><th className="py-2 pr-4">Remind</th></tr></thead>
            <tbody>
              {data.pending.map((r) => {
                const msg = `Dear ${r.full_name}, your hostel rent of ${fmt(r.amount)} for ${r.month} at ${HOSTEL_NAME} is pending. Kindly pay via UPI ${UPI_ID} and upload the receipt in the app. Thank you.`
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{r.full_name}</td>
                    <td className="py-3 pr-4">Room {String(r.room_number).padStart(2, '0')}</td>
                    <td className="py-3 pr-4">{fmt(r.amount)}</td>
                    <td className="py-3 pr-4 text-slate-500">{r.self_mobile || '—'}</td>
                    <td className="py-3 pr-4">
                      {r.self_mobile ? <a href={waLink(r.self_mobile, msg)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"><MessageCircle className="w-4 h-4" /> WhatsApp</a> : <span className="text-slate-400 text-xs">No mobile</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ManagerExport({ api }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      const dta = await api('manager/export')
      const wb = XLSX.utils.book_new()
      const sheet = (rows, name) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), name)
      sheet((dta.residents || []).map((r) => ({ Name: r.full_name, Email: r.email, Room: r.room_number, Course: r.course, Aadhaar: r.aadhaar, Mobile: r.self_mobile, Parent_Mobile: r.parent_mobile, Address: r.permanent_address, Allotted_On: r.allotted_on })), 'Residents')
      sheet((dta.rooms || []).map((r) => ({ Room: r.room_number, Floor: r.floor, Wing: r.wing, Capacity: r.capacity, Store_Room: r.is_store, Monthly_Rent: r.monthly_rent })), 'Rooms')
      sheet((dta.payments || []).map((p) => ({ Resident: p.full_name, Room: p.room_number, Month: p.month, Amount: p.amount, Txn_ID: p.transaction_id, Status: p.status, Submitted: p.created_at })), 'Payments')
      sheet((dta.bookings || []).map((b) => ({ Resident: b.full_name, Room: b.room_number, Course: b.course, Mobile: b.self_mobile, Status: b.status, Requested: b.created_at })), 'Bookings')
      XLSX.writeFile(wb, `Shri_Baijnath_Hostel_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Excel exported')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="bg-white rounded-2xl border p-8 max-w-xl">
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4"><FileSpreadsheet className="w-7 h-7" /></div>
      <h3 className="font-bold text-lg">Export All Data to Excel</h3>
      <p className="text-sm text-slate-500 mt-1">Download a single Excel file with sheets for Residents, Rooms, Payments and Booking Requests — including confidential rent data.</p>
      <button onClick={run} disabled={busy} className="mt-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-3 font-semibold flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Download Excel (.xlsx)</button>
    </div>
  )
}
