import { useState, useEffect, useRef, useCallback } from 'react'

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0D1117;--surf:#161B22;--surf2:#1C2128;--surf3:#21262D;
  --border:#30363D;--border2:#484F58;
  --green:#2EA043;--green-lt:#3FB950;--green-gl:rgba(46,160,67,.15);
  --blue:#58A6FF;--blue-dim:rgba(88,166,255,.12);
  --red:#F85149;--red-dim:rgba(248,81,73,.12);
  --text:#C9D1D9;--muted:#8B949E;--dim:#6E7681;
  --font:'Sora',sans-serif;--mono:'JetBrains Mono',monospace;
}
html,body,#root{height:100%;background:var(--bg);color:var(--text);font-family:var(--font)}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}

@keyframes fadeUp  {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn  {from{opacity:0}to{opacity:1}}
@keyframes spin    {to{transform:rotate(360deg)}}
@keyframes pulse   {0%,100%{opacity:1}50%{opacity:.35}}
@keyframes shimmer {from{background-position:-200% center}to{background-position:200% center}}
@keyframes glow    {0%,100%{box-shadow:0 0 12px var(--green-gl)}50%{box-shadow:0 0 28px var(--green-gl),0 0 50px var(--green-gl)}}
@keyframes slideIn {from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn {from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}

.fu {animation:fadeUp  .4s cubic-bezier(.22,1,.36,1) both}
.fi {animation:fadeIn  .3s ease both}
.si {animation:scaleIn .35s cubic-bezier(.22,1,.36,1) both}
.gl {animation:glow    2.5s ease-in-out infinite}

.grid{
  background-image:linear-gradient(rgba(48,54,61,.28) 1px,transparent 1px),
    linear-gradient(90deg,rgba(48,54,61,.28) 1px,transparent 1px);
  background-size:30px 30px;
}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:9px;font-size:14px;font-weight:600;font-family:var(--font);cursor:pointer;border:none;transition:all .17s ease;letter-spacing:.01em;white-space:nowrap;text-decoration:none;justify-content:center}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{background:var(--green);color:#fff}
.btn-primary:hover:not(:disabled){background:var(--green-lt);box-shadow:0 0 18px var(--green-gl)}
.btn-ghost{background:var(--surf3);color:var(--text);border:1.5px solid var(--border)}
.btn-ghost:hover:not(:disabled){border-color:var(--border2);background:var(--surf2)}
.btn-github{background:#24292e;color:#fff;border:1.5px solid #444d56}
.btn-github:hover:not(:disabled){background:#2f363d;border-color:#666}
.btn-lg{padding:14px 32px;font-size:15px;border-radius:10px}
.btn-sm{padding:6px 13px;font-size:12.5px;border-radius:7px}
.card{background:var(--surf);border:1.5px solid var(--border);border-radius:12px;padding:22px}
.dz{border:2px dashed var(--border);border-radius:12px;padding:52px 24px;text-align:center;cursor:pointer;transition:all .2s}
.dz:hover,.dz.over{border-color:var(--green);background:rgba(46,160,67,.05)}
.dz.has-file{border-color:rgba(46,160,67,.55);border-style:solid;background:rgba(46,160,67,.04)}
.prog-track{height:7px;background:var(--surf3);border-radius:4px;overflow:hidden}
.prog-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--green),var(--green-lt),#56d364);background-size:200% auto;transition:width .3s ease;overflow:hidden;position:relative}
.prog-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:shimmer 1.5s linear infinite;background-size:200% auto}
.log-box{background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:14px;font-family:var(--mono);font-size:12px;max-height:210px;overflow-y:auto}
.ll{display:flex;gap:10px;padding:2px 0;animation:slideIn .15s ease}
.ll.ok  {color:var(--green-lt)} .ll.err{color:var(--red)}
.ll.info{color:var(--blue)}     .ll.dim{color:var(--muted)}
.step-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.step-row:last-child{border-bottom:none}
.sd{width:33px;height:33px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:var(--mono);transition:all .3s}
.sd.p{background:var(--surf3);border:2px solid var(--border);color:var(--dim)}
.sd.a{background:var(--green-gl);border:2px solid var(--green);color:var(--green-lt)}
.sd.d{background:var(--green);border:2px solid var(--green);color:#fff}
.sd.e{background:var(--red-dim);border:2px solid var(--red);color:var(--red)}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.badge-green{background:var(--green-gl);color:var(--green-lt);border:1px solid rgba(46,160,67,.3)}
.badge-blue{background:var(--blue-dim);color:var(--blue);border:1px solid rgba(88,166,255,.25)}
.chip{display:flex;align-items:center;gap:8px;background:var(--surf2);border:1.5px solid var(--border);border-radius:8px;padding:4px 12px 4px 5px}
.chip img{width:28px;height:28px;border-radius:50%;border:2px solid var(--green)}
.err-bar{background:var(--red-dim);border-bottom:1px solid rgba(248,81,73,.3);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;animation:fadeUp .3s ease}
.install-bar{position:fixed;top:0;left:0;right:0;z-index:200;background:#0f2318;border-bottom:1px solid rgba(46,160,67,.4);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;animation:fadeUp .3s ease}
`

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const I = {
  github:  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.645.35-1.087.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>,
  upload:  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
  check:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  x:       <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  ext:     <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>,
  copy:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  refresh: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  logout:  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  phone:   <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  shield:  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
}

function Spin({ size = 15, color = 'currentColor' }) {
  return <svg style={{ animation: 'spin .65s linear infinite', flexShrink: 0 }} width={size} height={size} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity=".2"/><path d="M22 12a10 10 0 00-10-10" stroke={color} strokeWidth="3" strokeLinecap="round"/></svg>
}

function Logo({ size = 27 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: size, height: size, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px var(--green-gl)' }}>
        <svg width={size*.57} height={size*.57} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: size*.7, letterSpacing: '-.02em' }}>
        Sebair<span style={{ color: 'var(--green)' }}>Git</span>
      </span>
    </div>
  )
}

const fmt = b => !b ? '0 B' : b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(2)+' MB'

/* ─── Auth storage (localStorage — works on ALL mobile browsers) ─────────── */
const LS_KEY = 'sg_jwt'

function saveToken(token) {
  try { localStorage.setItem(LS_KEY, token) } catch {}
}
function loadToken() {
  try { return localStorage.getItem(LS_KEY) || null } catch { return null }
}
function clearToken() {
  try { localStorage.removeItem(LS_KEY) } catch {}
}

/* Decode JWT payload without verifying (verification is done server-side) */
function decodeJWT(token) {
  try {
    const [, payload] = token.split('.')
    const padded = payload + '=='.slice((payload.length + 3) % 4)  // re-pad
    return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

/* ─── Authed fetch helper ────────────────────────────────────────────────── */
function authFetch(url, options = {}, token) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': options.body instanceof FormData ? undefined : 'application/json',
      ...(options.body instanceof FormData ? {} : {}),
    },
  })
}

/* ─── XHR upload with real progress ─────────────────────────────────────── */
function uploadZip(file, token, onProgress) {
  return new Promise((resolve, reject) => {
    const fd  = new FormData()
    fd.append('zip', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)) }
    xhr.onload = () => {
      try {
        const j = JSON.parse(xhr.responseText)
        xhr.status === 200 ? resolve(j) : reject(new Error(j.error || 'Server error ' + xhr.status))
      } catch { reject(new Error('Unexpected response (' + xhr.status + ')')) }
    }
    xhr.onerror   = () => reject(new Error('Network error — check your connection.'))
    xhr.ontimeout = () => reject(new Error('Request timed out.'))
    xhr.timeout   = 120_000
    xhr.send(fd)
  })
}

/* ─── OAuth URL builder ──────────────────────────────────────────────────── */
function buildOAuthURL() {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  if (!clientId) return '/api/auth/login'
  const p = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: window.location.origin + '/api/auth/callback',
    scope:        'repo user',
    state:        (crypto.randomUUID?.() || Math.random().toString(36).slice(2)),
  })
  return 'https://github.com/login/oauth/authorize?' + p
}

/* ─── Step labels ────────────────────────────────────────────────────────── */
const STEPS = ['Upload ZIP', 'Extract Files', 'Create Repository', 'Upload Files', 'Create Commit', 'Verify']

/* ─── App ────────────────────────────────────────────────────────────────── */
export default function App() {
  /* auth */
  const [token,       setToken]       = useState(null)     // JWT string
  const [user,        setUser]        = useState(null)     // { login, name, avatar }
  const [authLoading, setAuthLoading] = useState(true)
  const [authError,   setAuthError]   = useState(null)
  const [loginBusy,   setLoginBusy]   = useState(false)

  /* upload */
  const [phase,     setPhase]     = useState('idle')   // idle|uploading|processing|done|fail
  const [file,      setFile]      = useState(null)
  const [pct,       setPct]       = useState(0)
  const [stepIdx,   setStepIdx]   = useState(0)
  const [logs,      setLogs]      = useState([])
  const [result,    setResult]    = useState(null)
  const [uploadErr, setUploadErr] = useState(null)

  /* ui */
  const [dragging,    setDragging]    = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [deferredPWA, setDeferredPWA] = useState(null)
  const [showInstall, setShowInstall] = useState(false)

  const fileRef = useRef()
  const logRef  = useRef()

  /* ── PWA install prompt ─────────────────────────────────────────────────── */
  useEffect(() => {
    const h = e => { e.preventDefault(); setDeferredPWA(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  /* ── Auto-scroll logs ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  /* ── Auth bootstrap — runs once on mount ────────────────────────────────── */
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const urlToken  = params.get('token')
    const urlError  = params.get('error')

    // ── Case A: Fresh OAuth redirect — token arrives in URL ───────────────
    if (urlToken) {
      // Clean URL immediately (no token visible in address bar)
      window.history.replaceState({}, '', '/')

      const decoded = decodeJWT(urlToken)
      if (decoded?.login) {
        saveToken(urlToken)
        setToken(urlToken)
        setUser({ login: decoded.login, name: decoded.name, avatar: decoded.avatar })
        setAuthLoading(false)
        return
      } else {
        setAuthError('Login failed — invalid token received. Please try again.')
        setAuthLoading(false)
        return
      }
    }

    // ── Case B: OAuth returned an error ───────────────────────────────────
    if (urlError) {
      window.history.replaceState({}, '', '/')
      if (urlError !== 'access_denied') {
        setAuthError('Login failed: ' + decodeURIComponent(urlError))
      }
      setAuthLoading(false)
      return
    }

    // ── Case C: Returning user — load from localStorage ───────────────────
    const stored = loadToken()
    if (stored) {
      const decoded = decodeJWT(stored)
      // Check token hasn't expired (exp is in seconds)
      if (decoded?.login && decoded?.exp && decoded.exp * 1000 > Date.now()) {
        setToken(stored)
        setUser({ login: decoded.login, name: decoded.name, avatar: decoded.avatar })
        setAuthLoading(false)
        return
      } else {
        // Token expired — clear it
        clearToken()
      }
    }

    // ── Case D: No token anywhere → show login ─────────────────────────────
    setAuthLoading(false)
  }, [])

  /* ── Handlers ───────────────────────────────────────────────────────────── */

  const handleLogin = () => {
    setLoginBusy(true)
    window.location.href = buildOAuthURL()
  }

  const handleLogout = () => {
    clearToken()
    setToken(null)
    setUser(null)
    resetUpload()
  }

  const handleInstall = async () => {
    if (!deferredPWA) return
    deferredPWA.prompt()
    await deferredPWA.userChoice
    setDeferredPWA(null); setShowInstall(false)
  }

  const pickFile = f => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setUploadErr('Only .zip files are accepted.'); setPhase('fail'); return
    }
    if (f.size > 50 * 1024 * 1024) {
      setUploadErr('File exceeds the 50 MB limit.'); setPhase('fail'); return
    }
    setFile(f)
  }

  const onDrop = e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }

  const addLog = useCallback((msg, type = 'dim') => setLogs(p => [...p, { msg, type }]), [])

  const resetUpload = () => {
    setPhase('idle'); setFile(null); setPct(0); setStepIdx(0)
    setLogs([]); setResult(null); setUploadErr(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const copyURL = async url => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  /* ── Upload ──────────────────────────────────────────────────────────────── */
  const startUpload = useCallback(async () => {
    if (!file || !token) return
    setLogs([]); setPct(0); setStepIdx(0); setPhase('uploading')
    addLog(`→ Preparing ${file.name} (${fmt(file.size)})`, 'info')

    try {
      const data = await uploadZip(file, token, p => {
        setPct(p)
        if (p === 100) {
          addLog('✓ File received by server', 'ok')
          setPhase('processing'); setStepIdx(1)
          addLog('→ Extracting ZIP contents…', 'info')
        }
      })

      for (const [delay, step, msg] of [
        [900,  2, '→ Creating GitHub repository…'],
        [1800, 3, '→ Uploading files via Tree API…'],
        [3200, 4, '→ Creating commit…'],
        [400,  5, '→ Verifying file count…'],
      ]) {
        await new Promise(r => setTimeout(r, delay))
        setStepIdx(step); addLog(msg, 'info')
      }

      addLog(`✓ ${data.fileCount}/${data.expectedCount} files verified${data.verified ? '' : ' ⚠'}`, data.verified ? 'ok' : 'err')
      addLog(`✓ Commit ${data.commitSha} → ${data.branch}`, 'ok')
      addLog(`✓ ${data.repoUrl}`, 'ok')
      setResult(data); setPhase('done')

    } catch (err) {
      addLog('✗ ' + err.message, 'err')
      setUploadErr(err.message)
      setPhase('fail')
      if (err.message.includes('login') || err.message.includes('expired') || err.message.includes('401')) {
        clearToken(); setToken(null); setUser(null)
      }
    }
  }, [file, token, addLog])

  /* ── Step status ─────────────────────────────────────────────────────────── */
  const sc = i => {
    if (phase === 'done') return 'd'
    if (phase === 'fail' && i === stepIdx) return 'e'
    if (i < stepIdx) return 'd'
    if (i === stepIdx && phase === 'processing') return 'a'
    return 'p'
  }

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{CSS}</style>

      {showInstall && (
        <div className="install-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--muted)', fontSize: 13 }}>
            {I.phone} <span>Add <strong style={{ color: 'var(--text)' }}>SebairGit</strong> to your home screen</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={handleInstall}>Install</button>
            <button className="btn btn-sm btn-ghost" style={{ padding: '6px 9px' }} onClick={() => setShowInstall(false)}>{I.x}</button>
          </div>
        </div>
      )}

      <div className="grid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: showInstall ? 48 : 0 }}>
        {/* Ambient glow */}
        <div style={{ position: 'fixed', top: '18%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(46,160,67,.04) 0%, transparent 68%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header style={{ padding: '15px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'rgba(13,17,23,.9)', backdropFilter: 'blur(14px)', position: 'sticky', top: showInstall ? 48 : 0, zIndex: 100 }}>
          <Logo size={26} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-green">v2.0</span>

            {authLoading ? <Spin size={18} color="var(--muted)" />
            : user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div className="chip">
                  <img src={user.avatar} alt={user.login} onError={e => e.target.style.display='none'} />
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{user.login}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ gap: 6 }}>
                  {I.logout} Logout
                </button>
              </div>
            ) : (
              <button className="btn btn-github btn-sm" onClick={handleLogin} disabled={loginBusy}>
                {loginBusy ? <Spin size={14} color="#fff" /> : I.github}
                {loginBusy ? 'Redirecting…' : 'Login with GitHub'}
              </button>
            )}
          </div>
        </header>

        {/* Auth error banner */}
        {authError && (
          <div className="err-bar">
            <span style={{ fontSize: 13.5, color: 'var(--red)' }}>⚠ {authError}</span>
            <button onClick={() => setAuthError(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* ── Main ──────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 20px 56px', position: 'relative', zIndex: 1 }}>

          {/* ── NOT LOGGED IN ──────────────────────────────────────────── */}
          {!authLoading && !user && (
            <div className="fu" style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: 22, background: 'var(--surf)', border: '1.5px solid var(--border)', borderRadius: 20, marginBottom: 28, color: 'var(--text)' }} className="gl">
                {I.github}
              </div>
              <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 14 }}>
                ZIP → GitHub<br /><span style={{ color: 'var(--green)' }}>in Seconds</span>
              </h1>
              <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 36, maxWidth: 400, margin: '0 auto 36px' }}>
                Login with GitHub and drop any ZIP — files are extracted and pushed to a new repository with the exact same folder structure.
              </p>
              <button className="btn btn-github btn-lg" onClick={handleLogin} disabled={loginBusy} style={{ minWidth: 268 }}>
                {loginBusy ? <Spin size={18} color="#fff" /> : I.github}
                {loginBusy ? 'Redirecting to GitHub…' : 'Continue with GitHub'}
              </button>

              {/* Trust indicators */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
                {[
                  [I.shield, 'JWT auth — no cookies'],
                  [I.github, 'Your repos only'],
                  ['⚡', 'Tree API upload'],
                ].map(([ic, label]) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--dim)' }}>
                    <span style={{ color: 'var(--green-lt)' }}>{ic}</span>{label}
                  </span>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 36 }}>
                {[
                  { e: '🔒', t: 'Secure', s: 'JWT · no cookies' },
                  { e: '🌿', t: 'Exact Paths', s: 'Structure preserved' },
                  { e: '⚡', t: 'Tree API', s: 'Atomic batch upload' },
                ].map(f => (
                  <div key={f.t} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
                    <div style={{ fontSize: 22, marginBottom: 7 }}>{f.e}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{f.t}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{f.s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── IDLE (logged in) ──────────────────────────────────────── */}
          {user && phase === 'idle' && (
            <div className="fu" style={{ width: '100%', maxWidth: 560 }}>
              <div style={{ textAlign: 'center', marginBottom: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, marginBottom: 10 }}>
                  <img src={user.avatar} alt={user.login} style={{ width: 44, height: 44, borderRadius: '50%', border: '2.5px solid var(--green)' }} onError={e => e.target.style.display='none'} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{user.name || user.login}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>@{user.login}</div>
                  </div>
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>
                  Drop a ZIP → push to <span style={{ color: 'var(--green)' }}>GitHub</span>
                </h2>
              </div>

              <div className={`dz ${dragging ? 'over' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !file && fileRef.current?.click()}
                style={{ cursor: file ? 'default' : 'pointer' }}>
                <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={e => pickFile(e.target.files?.[0])} />

                {!file ? (
                  <div className="fi">
                    <div style={{ width: 58, height: 58, background: 'var(--surf3)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--muted)' }}>
                      <svg width="27" height="27" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <p style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 6 }}>Drop your ZIP file here</p>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 14 }}>or click to browse</p>
                    <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {['.zip only', 'max 50 MB', 'preserves structure', 'all file types'].map(t => (
                        <span key={t} style={{ background: 'var(--surf3)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11.5, padding: '3px 9px', borderRadius: 5, fontFamily: 'var(--mono)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="si" style={{ textAlign: 'center' }}>
                    <div style={{ width: 54, height: 54, background: 'var(--green-gl)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px solid rgba(46,160,67,.35)', color: 'var(--green-lt)' }}>
                      <svg width="25" height="25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <p style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--green-lt)', fontFamily: 'var(--mono)', marginBottom: 5 }}>{file.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{fmt(file.size)}</p>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setFile(null) }}>{I.x} Remove</button>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 11 }}>
                {!file && <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>{I.upload} Browse</button>}
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={!file} onClick={startUpload}>
                  {I.github} Upload to GitHub
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--dim)', marginTop: 10 }}>
                New repo created under <span style={{ fontFamily: 'var(--mono)' }}>@{user.login}</span>
              </p>
            </div>
          )}

          {/* ── UPLOADING ─────────────────────────────────────────────── */}
          {phase === 'uploading' && (
            <div className="fu card" style={{ width: '100%', maxWidth: 500 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                <Spin size={22} color="var(--green)" />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>Uploading ZIP…</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>{file?.name}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--green-lt)' }}>{pct}%</span>
              </div>
              <div className="prog-track"><div className="prog-fill" style={{ width: pct + '%' }} /></div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'center', fontFamily: 'var(--mono)' }}>
                {fmt(Math.round((file?.size || 0) * pct / 100))} / {fmt(file?.size)}
              </p>
            </div>
          )}

          {/* ── PROCESSING ────────────────────────────────────────────── */}
          {phase === 'processing' && (
            <div className="fu" style={{ width: '100%', maxWidth: 540 }}>
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <Spin size={20} color="var(--green)" />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>Processing…</p>
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>{STEPS[stepIdx]}</p>
                  </div>
                </div>
                {STEPS.map((label, i) => (
                  <div key={label} className="step-row">
                    <div className={`sd ${sc(i)}`}>
                      {sc(i) === 'd' ? I.check : sc(i) === 'a' ? <Spin size={13} color="var(--green)" /> : sc(i) === 'e' ? I.x : i + 1}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: sc(i) === 'a' ? 600 : 400, color: sc(i) === 'p' ? 'var(--dim)' : 'var(--text)' }}>{label}</span>
                    {sc(i) === 'd' && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green-lt)', fontFamily: 'var(--mono)' }}>done</span>}
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--green-lt)', fontFamily: 'var(--mono)' }}>Output</span>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>● Live</span>
                </div>
                <div className="log-box" ref={logRef}>
                  {logs.map((l, i) => (
                    <div key={i} className={`ll ${l.type}`}>
                      <span style={{ color: 'var(--dim)', userSelect: 'none', minWidth: 18 }}>{String(i+1).padStart(2,'0')}</span>
                      <span>{l.msg}</span>
                    </div>
                  ))}
                  <div className="ll dim"><span style={{ color: 'var(--dim)' }}>›</span><span style={{ animation: 'pulse 1s infinite' }}>_</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── SUCCESS ───────────────────────────────────────────────── */}
          {phase === 'done' && result && (
            <div className="fu" style={{ width: '100%', maxWidth: 510, textAlign: 'center' }}>
              <div style={{ width: 78, height: 78, background: 'var(--green-gl)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', border: '2px solid rgba(46,160,67,.4)' }} className="gl">
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--green-lt)" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 8 }}>Upload Complete!</h2>
              <p style={{ fontSize: 14.5, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.7 }}>
                {result.fileCount} files pushed to{' '}
                <span style={{ color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{result.owner}/{result.repoName}</span>
                {result.verified ? ' · ✓ verified' : ''}
              </p>

              <div style={{ background: 'var(--surf3)', border: '1.5px solid var(--border)', borderRadius: 9, padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, fontFamily: 'var(--mono)' }}>URL</span>
                <span style={{ flex: 1, fontSize: 12.5, fontFamily: 'var(--mono)', color: 'var(--blue)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{result.repoUrl}</span>
                <button onClick={() => copyURL(result.repoUrl)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green-lt)' : 'var(--muted)', display: 'flex', flexShrink: 0, transition: 'color .2s' }}>
                  {copied ? I.check : I.copy}
                </button>
              </div>

              <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
                {[
                  ['Repository', result.owner + '/' + result.repoName],
                  ['Branch',     result.branch],
                  ['Files',      result.fileCount + '/' + result.expectedCount + (result.verified ? ' ✓' : ' ⚠')],
                  ['Commit',     result.commitSha],
                  ['Size',       result.totalSizeKb + ' KB'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13, fontFamily: 'var(--mono)', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap' }}>
                <a href={result.repoUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: 1 }}>
                  {I.ext} View on GitHub
                </a>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetUpload}>
                  {I.upload} Upload Another
                </button>
              </div>
            </div>
          )}

          {/* ── FAIL ──────────────────────────────────────────────────── */}
          {phase === 'fail' && (
            <div className="fu" style={{ width: '100%', maxWidth: 470, textAlign: 'center' }}>
              <div style={{ width: 70, height: 70, background: 'var(--red-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid rgba(248,81,73,.3)' }}>
                <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="var(--red)" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--red)' }}>Upload Failed</h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>{uploadErr}</p>

              {!user && (
                <button className="btn btn-github" style={{ width: '100%', marginBottom: 14 }} onClick={handleLogin}>
                  {I.github} Login Again
                </button>
              )}

              {logs.length > 0 && (
                <div className="card" style={{ textAlign: 'left', marginBottom: 20, padding: '12px 14px', border: '1.5px solid rgba(248,81,73,.2)' }}>
                  <div className="log-box" style={{ maxHeight: 130 }}>
                    {logs.map((l, i) => (
                      <div key={i} className={`ll ${l.type}`}>
                        <span style={{ color: 'var(--dim)', userSelect: 'none' }}>{String(i+1).padStart(2,'0')}</span>
                        <span>{l.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 11 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={resetUpload}>← Start Over</button>
                {user && <button className="btn btn-primary" style={{ flex: 1 }} onClick={startUpload} disabled={!file}>{I.refresh} Retry</button>}
              </div>
            </div>
          )}

        </main>

        <footer style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 22, alignItems: 'center' }}>
          {['Privacy', 'Terms', 'Docs'].map(l => (
            <span key={l} style={{ fontSize: 12, color: 'var(--dim)', cursor: 'pointer' }}>{l}</span>
          ))}
          {user && (
            <span style={{ fontSize: 12, color: 'var(--dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }} onClick={handleLogout}>
              {I.logout} Sign out @{user.login}
            </span>
          )}
        </footer>
      </div>
    </>
  )
}
