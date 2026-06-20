import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MapPin, Navigation, ChevronUp, Star, Users, Zap,
  Phone, ArrowRight, X, CheckCircle, Loader2,
  Shield, Clock, Wallet, Menu, Bell, Search,
  ChevronDown, Car, User,
} from 'lucide-react'
import axios from 'axios'

// ─── Config ────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─── Design Tokens (from Figma: light theme, green primary) ───────────────
const COLORS = {
  primary:     '#00B14F',
  primaryDark: '#008F3F',
  primaryLight:'#E6F7EE',
  surface:     '#FFFFFF',
  background:  '#F4F6F9',
  border:      '#E2E8F0',
  textPrimary: '#1A202C',
  textSecond:  '#718096',
  textMuted:   '#A0AEC0',
  danger:      '#E53E3E',
  shadow:      '0 4px 24px rgba(0,0,0,0.10)',
  shadowLg:    '0 -8px 40px rgba(0,0,0,0.12)',
}

// ─── Vehicle Tiers ─────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'Standard',
    name: 'Standard Pragia',
    subtitle: 'Affordable everyday rides',
    emoji: '🛺',
    eta: '3 min',
    price: '₵8 – ₵15',
    badge: 'POPULAR',
    badgeColor: '#00B14F',
    borderColor: '#00B14F',
  },
  {
    id: 'Shared',
    name: 'Shared Ride',
    subtitle: 'Split cost, share the journey',
    emoji: '🚐',
    eta: '6 min',
    price: '₵4 – ₵8',
    badge: 'ECO',
    badgeColor: '#F6AD55',
    borderColor: '#F6AD55',
  },
  {
    id: 'Premium',
    name: 'Premium Pragia',
    subtitle: 'Top comfort for special trips',
    emoji: '⭐',
    eta: '8 min',
    price: '₵18 – ₵35',
    badge: 'VIP',
    badgeColor: '#9F7AEA',
    borderColor: '#9F7AEA',
  },
]

const MOCK_DRIVERS = [
  { id: 1, x: '20%', y: '35%' },
  { id: 2, x: '57%', y: '48%' },
  { id: 3, x: '72%', y: '25%' },
  { id: 4, x: '36%', y: '62%' },
  { id: 5, x: '82%', y: '55%' },
]

// ─── OTP Input ─────────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputs = useRef([])
  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, i) + value.slice(i + 1)
      onChange(next)
      if (i > 0) inputs.current[i - 1]?.focus()
    }
  }
  const handleInput = (i, e) => {
    const ch = e.target.value.replace(/\D/g, '').slice(-1)
    if (!ch) return
    const arr = value.padEnd(6, '').split('')
    arr[i] = ch
    onChange(arr.join('').trimEnd())
    if (i < 5) inputs.current[i + 1]?.focus()
  }
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          id={`otp-${i}`}
          type="number"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleInput(i, e)}
          onKeyDown={e => handleKey(i, e)}
          style={{
            width: 44, height: 52, borderRadius: 12, textAlign: 'center',
            fontSize: 22, fontWeight: 700, border: `2px solid`,
            borderColor: value[i] ? COLORS.primary : COLORS.border,
            outline: 'none', background: value[i] ? COLORS.primaryLight : '#fff',
            color: COLORS.textPrimary, transition: 'all 0.15s',
            MozAppearance: 'textfield',
          }}
        />
      ))}
    </div>
  )
}

// ─── Splash / Login Screen ─────────────────────────────────────────────────
function LoginScreen({ onSuccess }) {
  const [step, setStep]       = useState('splash') // 'splash' | 'phone' | 'otp'
  const [phone, setPhone]     = useState('')
  const [otp, setOtp]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const sendOtp = async () => {
    if (phone.length < 9) { setError('Enter a valid 9–10 digit number'); return }
    setLoading(true); setError('')
    try { await axios.post(`${API}/api/v1/auth/request-otp`, { phone: `+233${phone}` }) }
    catch { /* demo mode */ }
    finally { setLoading(false); setStep('otp') }
  }

  const verifyOtp = async () => {
    if (otp.length < 6) { setError('Enter all 6 digits'); return }
    setLoading(true); setError('')
    try { await axios.post(`${API}/api/v1/auth/verify-otp`, { phone: `+233${phone}`, otp }) }
    catch { /* demo mode */ }
    finally { setLoading(false); onSuccess(`+233${phone}`) }
  }

  // ── Splash ──
  if (step === 'splash') return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(160deg, #004D2C 0%, #00B14F 60%, #00D966 100%)',
      padding: '60px 32px 48px',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280,
        borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', top: 40, right: -40, width: 160, height: 160,
        borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'absolute', bottom: 160, left: -60, width: 200, height: 200,
        borderRadius: '50%', background: 'rgba(0,0,0,0.08)' }} />

      {/* Top branding */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 20px', fontSize: 40,
          border: '2px solid rgba(255,255,255,0.25)',
        }}>🛺</div>
        <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 800,
          letterSpacing: '-0.5px', margin: 0 }}>PragiaGo</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15,
          marginTop: 8, fontWeight: 400 }}>Ghana's smartest ride network</p>
      </div>

      {/* Illustration area */}
      <div style={{ zIndex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 100, lineHeight: 1 }}>🛺</div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 12 }}>
          Fast · Safe · Affordable
        </p>
      </div>

      {/* CTA */}
      <div style={{ width: '100%', zIndex: 1 }}>
        <button
          id="get-started-btn"
          onClick={() => setStep('phone')}
          style={{
            width: '100%', padding: '16px', borderRadius: 16,
            background: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 700, color: COLORS.primary,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          Get Started →
        </button>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12,
          textAlign: 'center', marginTop: 14 }}>
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  )

  // ── Phone entry ──
  if (step === 'phone') return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.background,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Green header strip */}
      <div style={{
        background: 'linear-gradient(135deg, #004D2C, #00B14F)',
        padding: '56px 24px 40px', borderRadius: '0 0 32px 32px',
      }}>
        <button onClick={() => setStep('splash')} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12,
          padding: '8px 12px', cursor: 'pointer', color: '#fff', fontSize: 14,
          marginBottom: 16,
        }}>← Back</button>
        <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800,
          margin: '0 0 6px' }}>Enter your number</h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>
          We'll send you a verification code
        </p>
      </div>

      {/* Card */}
      <div style={{
        margin: '24px 20px', background: '#fff', borderRadius: 24,
        padding: 28, boxShadow: COLORS.shadow,
      }}>
        <p style={{ color: COLORS.textSecond, fontSize: 13, marginBottom: 12,
          fontWeight: 500 }}>Phone Number</p>

        {/* Phone input row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          border: `1.5px solid ${error ? COLORS.danger : COLORS.border}`,
          borderRadius: 14, padding: '14px 16px',
          background: COLORS.background, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
            paddingRight: 12, borderRight: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 22 }}>🇬🇭</span>
            <span style={{ fontWeight: 700, color: COLORS.textPrimary,
              fontSize: 15 }}>+233</span>
          </div>
          <input
            id="phone-input"
            type="tel"
            inputMode="numeric"
            placeholder="24 123 4567"
            value={phone}
            onChange={e => { setPhone(e.target.value.replace(/\D/g,'').slice(0,10)); setError('') }}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 16, fontWeight: 600, color: COLORS.textPrimary,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          {phone.length >= 9 && <CheckCircle size={18} color={COLORS.primary} />}
        </div>

        {error && (
          <p style={{ color: COLORS.danger, fontSize: 12, marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={12} /> {error}
          </p>
        )}

        <button
          id="send-otp-btn"
          onClick={sendOtp}
          disabled={loading || phone.length < 9}
          style={{
            width: '100%', padding: '15px', borderRadius: 14,
            background: phone.length >= 9 ? COLORS.primary : COLORS.border,
            border: 'none', cursor: phone.length >= 9 ? 'pointer' : 'not-allowed',
            color: '#fff', fontWeight: 700, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
            boxShadow: phone.length >= 9 ? '0 4px 16px rgba(0,177,79,0.35)' : 'none',
          }}
        >
          {loading
            ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            : <><span>Send Code</span><ArrowRight size={16} /></>
          }
        </button>

        {/* Trust row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28,
          marginTop: 24, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
          {[['🔒','Secure'],['⭐','Trusted'],['💳','MoMo']].map(([icon, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 11,
                fontWeight: 500, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── OTP Verification ──
  return (
    <div style={{
      position: 'absolute', inset: 0, background: COLORS.background,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #004D2C, #00B14F)',
        padding: '56px 24px 40px', borderRadius: '0 0 32px 32px',
      }}>
        <button onClick={() => { setStep('phone'); setOtp(''); setError('') }} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12,
          padding: '8px 12px', cursor: 'pointer', color: '#fff', fontSize: 14,
          marginBottom: 16,
        }}>← Back</button>
        <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>
          Verification Code
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>
          Sent to <strong>+233 {phone}</strong>
        </p>
      </div>

      <div style={{
        margin: '24px 20px', background: '#fff', borderRadius: 24,
        padding: 28, boxShadow: COLORS.shadow,
      }}>
        <p style={{ color: COLORS.textSecond, fontSize: 13, fontWeight: 500,
          textAlign: 'center', marginBottom: 24 }}>Enter the 6-digit code</p>

        <OtpInput value={otp} onChange={setOtp} />

        {error && (
          <p style={{ color: COLORS.danger, fontSize: 12, textAlign: 'center',
            marginTop: 12 }}>{error}</p>
        )}

        <button
          id="verify-otp-btn"
          onClick={verifyOtp}
          disabled={loading || otp.length < 6}
          style={{
            width: '100%', marginTop: 24, padding: '15px', borderRadius: 14,
            background: otp.length >= 6 ? COLORS.primary : COLORS.border,
            border: 'none', cursor: otp.length >= 6 ? 'pointer' : 'not-allowed',
            color: '#fff', fontWeight: 700, fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: otp.length >= 6 ? '0 4px 16px rgba(0,177,79,0.35)' : 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {loading
            ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            : 'Verify & Continue'
          }
        </button>
        <button
          onClick={sendOtp}
          style={{ width: '100%', marginTop: 12, padding: '10px', border: 'none',
            background: 'transparent', cursor: 'pointer', color: COLORS.textSecond,
            fontSize: 13, fontFamily: 'Inter, sans-serif' }}
        >
          Didn't receive it? <span style={{ color: COLORS.primary, fontWeight: 600 }}>Resend</span>
        </button>
      </div>
    </div>
  )
}

// ─── Light Map Shell ───────────────────────────────────────────────────────
function MapShell() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
      background: '#E8EDE4' }}>
      {/* Light mode map SVG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <pattern id="lgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D4D9CE" strokeWidth="0.5"/>
          </pattern>
        </defs>
        {/* Land */}
        <rect width="100%" height="100%" fill="#E8EDE4"/>
        {/* Grid */}
        <rect width="100%" height="100%" fill="url(#lgrid)" opacity="0.6"/>
        {/* Water bodies */}
        <ellipse cx="75%" cy="20%" rx="20%" ry="15%" fill="#C5DFF0" opacity="0.7"/>
        <rect x="0" y="70%" width="100%" height="30%" fill="#C9E8F5" opacity="0.4"/>
        {/* Major roads */}
        <g stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round">
          <path d="M 0,180 Q 200,160 420,200 T 900,185"/>
          <path d="M 130,0 Q 150,180 125,420"/>
          <path d="M 0,320 L 900,345"/>
          <path d="M 320,0 Q 340,280 290,600"/>
        </g>
        {/* Road outlines */}
        <g stroke="#D4D9CE" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.6">
          <path d="M 0,180 Q 200,160 420,200 T 900,185"/>
          <path d="M 130,0 Q 150,180 125,420"/>
        </g>
        {/* Secondary roads */}
        <g stroke="#FFFFFF" strokeWidth="2.5" fill="none" opacity="0.8">
          <path d="M 60,100 L 260,115 L 400,85"/>
          <path d="M 500,140 L 660,190 L 710,310"/>
          <path d="M 0,430 L 370,400 L 620,440 L 900,425"/>
          <path d="M 210,0 L 225,290"/>
          <path d="M 610,90 L 590,390"/>
        </g>
        {/* Block fills (buildings) */}
        <g fill="#D8DDD4" opacity="0.5">
          <rect x="70" y="120" width="35" height="28" rx="3"/>
          <rect x="115" y="108" width="28" height="32" rx="3"/>
          <rect x="420" y="250" width="42" height="30" rx="3"/>
          <rect x="470" y="240" width="25" height="44" rx="3"/>
          <rect x="640" y="100" width="38" height="26" rx="3"/>
          <rect x="200" y="370" width="45" height="32" rx="3"/>
        </g>
      </svg>

      {/* Driver dots */}
      {MOCK_DRIVERS.map(d => (
        <div key={d.id} style={{
          position: 'absolute', left: d.x, top: d.y,
          transform: 'translate(-50%,-50%)',
        }}>
          <div style={{ position: 'relative', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${COLORS.primary}`, opacity: 0.4,
              animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
            }}/>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#fff', border: `2px solid ${COLORS.primary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, boxShadow: '0 2px 8px rgba(0,177,79,0.3)',
            }}>🛺</div>
          </div>
        </div>
      ))}

      {/* Passenger location */}
      <div style={{
        position: 'absolute', left: '50%', top: '46%',
        transform: 'translate(-50%,-50%)',
      }}>
        <div style={{ position: 'relative', display: 'flex',
          alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', width: 48, height: 48, borderRadius: '50%',
            background: `${COLORS.primary}20`,
            animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }}/>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            background: COLORS.primary, border: '3px solid #fff',
            boxShadow: `0 0 0 3px ${COLORS.primary}40`,
          }}/>
        </div>
      </div>

      {/* District labels */}
      {[
        { n: 'ACCRA CENTRAL', x: '12%', y: '22%' },
        { n: 'OSU',           x: '60%', y: '16%' },
        { n: 'LABADI',        x: '70%', y: '50%' },
        { n: 'MADINA',        x: '35%', y: '10%' },
      ].map(d => (
        <span key={d.n} style={{
          position: 'absolute', left: d.x, top: d.y,
          fontSize: 9, color: '#9AA5A0', fontWeight: 600, letterSpacing: 1.2,
        }}>{d.n}</span>
      ))}
    </div>
  )
}

// ─── Top Navigation Bar ────────────────────────────────────────────────────
function TopBar({ phone }) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
      padding: '48px 16px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <button id="menu-btn" style={{
        background: '#fff', border: 'none', borderRadius: 14, width: 42, height: 42,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: COLORS.shadow, cursor: 'pointer',
      }}>
        <Menu size={18} color={COLORS.textPrimary} />
      </button>

      <div style={{
        background: '#fff', borderRadius: 20, padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 8, boxShadow: COLORS.shadow,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%',
          background: COLORS.primary }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>
          Accra, Ghana
        </span>
        <ChevronDown size={14} color={COLORS.textSecond} />
      </div>

      <button id="profile-btn" style={{
        background: '#fff', border: 'none', borderRadius: 14, width: 42, height: 42,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: COLORS.shadow, cursor: 'pointer',
      }}>
        <Bell size={18} color={COLORS.textPrimary} />
      </button>
    </div>
  )
}

// ─── Bottom Sheet ──────────────────────────────────────────────────────────
function BottomSheet({ phone, onLogout }) {
  const [selectedTier, setSelectedTier] = useState('Standard')
  const [pickup,       setPickup]       = useState('')
  const [dropoff,      setDropoff]      = useState('')
  const [booking,      setBooking]      = useState(false)
  const [booked,       setBooked]       = useState(false)
  const [error,        setError]        = useState('')
  const [expanded,     setExpanded]     = useState(false)

  const sheetRef   = useRef(null)
  const dragStart  = useRef(null)
  const baseH      = useRef(null)
  const COLL       = 360
  const EXP        = Math.min(window.innerHeight * 0.85, 680)

  const onMouseDown = e => {
    dragStart.current = e.clientY
    baseH.current = sheetRef.current?.offsetHeight || COLL
    document.body.style.userSelect = 'none'
  }
  const onTouchStart = e => {
    dragStart.current = e.touches[0].clientY
    baseH.current = sheetRef.current?.offsetHeight || COLL
  }

  const onMove = useCallback(clientY => {
    if (dragStart.current === null) return
    const delta = dragStart.current - clientY
    const newH  = Math.min(EXP, Math.max(COLL, baseH.current + delta))
    if (sheetRef.current) sheetRef.current.style.height = `${newH}px`
  }, [EXP, COLL])

  const onEnd = useCallback(clientY => {
    if (dragStart.current === null) return
    setExpanded(dragStart.current - clientY > 40)
    if (sheetRef.current) sheetRef.current.style.height = ''
    dragStart.current = null
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    const mm = e => onMove(e.clientY)
    const mu = e => onEnd(e.clientY)
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }
  }, [onMove, onEnd])

  const bookRide = async () => {
    if (!pickup || !dropoff) { setError('Please enter pickup and drop-off'); return }
    setBooking(true); setError('')
    try {
      await axios.post(`${API}/api/v1/rides/book`, {
        passenger_id: phone, pickup_lng: -0.187, pickup_lat: 5.604,
        dropoff_lng: -0.196, dropoff_lat: 5.615,
        pickup_address: pickup, dropoff_address: dropoff,
        fare_ghs: selectedTier === 'Standard' ? 12 : selectedTier === 'Shared' ? 6 : 25,
      })
      setBooked(true)
    } catch { setBooked(true) }
    finally { setBooking(false) }
  }

  const tier = TIERS.find(t => t.id === selectedTier)

  if (booked) return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: '#fff', borderRadius: '24px 24px 0 0',
      padding: '28px 24px 40px', boxShadow: COLORS.shadowLg,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%',
          background: COLORS.primaryLight, display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={32} color={COLORS.primary} />
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: COLORS.textPrimary,
          margin: '0 0 6px' }}>Ride Requested!</h3>
        <p style={{ color: COLORS.textSecond, fontSize: 14, margin: '0 0 24px' }}>
          Finding your <strong style={{ color: COLORS.primary }}>{tier?.name}</strong>…
        </p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[['🕐', tier?.eta, 'ETA'], ['₵', tier?.price, 'Fare (GHS)']].map(([icon, val, label]) => (
            <div key={label} style={{
              flex: 1, background: COLORS.background, borderRadius: 16, padding: '14px 8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15,
                color: COLORS.textPrimary, marginTop: 4 }}>{val}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 11 }}>{label}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setBooked(false)} style={{
          background: 'transparent', border: `1.5px solid ${COLORS.border}`,
          borderRadius: 12, padding: '10px 24px', cursor: 'pointer',
          color: COLORS.textSecond, fontSize: 13, fontFamily: 'Inter, sans-serif',
        }}>Cancel Ride</button>
      </div>
    </div>
  )

  return (
    <div
      ref={sheetRef}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '24px 24px 0 0',
        boxShadow: COLORS.shadowLg, display: 'flex', flexDirection: 'column',
        height: expanded ? EXP : COLL, transition: 'height 0.3s ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Drag handle */}
      <div
        style={{ padding: '12px 20px 4px', cursor: 'grab', flexShrink: 0 }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={e => onMove(e.touches[0].clientY)}
        onTouchEnd={e => onEnd(e.changedTouches[0].clientY)}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999,
          background: COLORS.border, margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: COLORS.textPrimary, margin: 0 }}>
            Choose your ride
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6,
            background: COLORS.primaryLight, borderRadius: 20, padding: '4px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%',
              background: COLORS.primary }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.primary }}>
              {MOCK_DRIVERS.length} nearby
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 24px' }}>

        {/* Address inputs */}
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { id: 'pickup-input',  dot: COLORS.primary, ph: 'Pickup location', val: pickup,  set: setPickup  },
            { id: 'dropoff-input', dot: '#FC5C65',       ph: 'Where to?',       val: dropoff, set: setDropoff },
          ].map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: COLORS.background, border: `1.5px solid ${COLORS.border}`,
              borderRadius: 14, padding: '12px 14px',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%',
                background: f.dot, flexShrink: 0 }} />
              <input
                id={f.id}
                type="text"
                placeholder={f.ph}
                value={f.val}
                onChange={e => { f.set(e.target.value); setError('') }}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 14, color: COLORS.textPrimary, fontFamily: 'Inter, sans-serif',
                }}
              />
              <Search size={14} color={COLORS.textMuted} />
            </div>
          ))}
        </div>

        {/* Tier cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {TIERS.map(t => {
            const sel = selectedTier === t.id
            return (
              <button
                key={t.id}
                id={`tier-${t.id.toLowerCase()}`}
                onClick={() => setSelectedTier(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderRadius: 16, border: `2px solid`,
                  borderColor: sel ? t.borderColor : COLORS.border,
                  background: sel ? `${t.borderColor}0D` : '#fff',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  boxShadow: sel ? `0 4px 16px ${t.borderColor}25` : 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {/* Emoji */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14, fontSize: 24,
                  background: COLORS.background, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{t.emoji}</div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 14,
                      color: COLORS.textPrimary }}>{t.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
                      background: t.badgeColor, color: '#fff', letterSpacing: 0.5,
                    }}>{t.badge}</span>
                  </div>
                  <span style={{ color: COLORS.textSecond, fontSize: 12 }}>{t.subtitle}</span>
                </div>

                {/* Price / ETA */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14,
                    color: COLORS.textPrimary }}>{t.price}</div>
                  <div style={{ fontSize: 11, color: COLORS.textSecond,
                    display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                    <Clock size={10} />{t.eta}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {error && (
          <p style={{ color: COLORS.danger, fontSize: 12, marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 4 }}>
            <X size={12} />{error}
          </p>
        )}

        {/* Book button */}
        <button
          id="book-ride-btn"
          onClick={bookRide}
          disabled={booking}
          style={{
            width: '100%', padding: '15px', borderRadius: 14,
            background: booking ? COLORS.border : COLORS.primary,
            border: 'none', cursor: booking ? 'not-allowed' : 'pointer',
            color: '#fff', fontWeight: 700, fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: booking ? 'none' : '0 6px 20px rgba(0,177,79,0.4)',
            transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
            letterSpacing: 0.2,
          }}
        >
          {booking
            ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            : <><Zap size={18} />Book {tier?.name}</>
          }
        </button>

        <p style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: 11,
          marginTop: 12 }}>
          Secured by PragiaGo · Pay via MTN MoMo / Vodafone Cash
        </p>
      </div>
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────
export default function PassengerHome() {
  const [phone, setPhone] = useState(null)

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%',
      overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* Layer 1: Map (always rendered) */}
      <MapShell />

      {/* Layer 2: Top bar (after login) */}
      {phone && <TopBar phone={phone} />}

      {/* Layer 3: Login flow OR booking sheet */}
      {!phone
        ? <LoginScreen onSuccess={setPhone} />
        : <BottomSheet phone={phone} onLogout={() => setPhone(null)} />
      }

      {/* Global keyframe styles */}
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes ping  { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
