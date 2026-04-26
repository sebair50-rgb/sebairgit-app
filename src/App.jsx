import { useState, useEffect, useRef, useCallback } from 'react'

/* ─── Global Styles ──────────────────────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #0D1117;
  --surf:      #161B22;
  --surf2:     #1C2128;
  --surf3:     #21262D;
  --border:    #30363D;
  --border2:   #484F58;
  --green:     #2EA043;
  --green-lt:  #3FB950;
  --green-gl:  rgba(46,160,67,.18);
  --blue:      #58A6FF;
  --blue-dim:  rgba(88,166,255,.12);
  --red:       #F85149;
  --red-dim:   rgba(248,81,73,.12);
  --orange:    #E3B341;
  --text:      #C9D1D9;
  --muted:     #8B949E;
  --dim:       #6E7681;
  --font:      'Sora', sans-serif;
  --mono:      'JetBrains Mono', monospace;
  --radius:    12px;
}

html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); }
#root { height: 100%; }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

@keyframes spin     { to { transform: rotate(360deg); } }
@keyframes fadeUp   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
@keyframes float    { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes glow     { 0%,100% { box-shadow: 0 0 10px var(--green-gl); } 50% { box-shadow: 0 0 28px var(--green-gl), 0 0 48px var(--green-gl); } }
@keyframes shimmer  { from { background-position: -200% center; } to { background-position: 200% center; } }
@keyframes pulse    { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
@keyframes slideIn  { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
@keyframes scaleIn  { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
@keyframes checkmark{ from { stroke-dashoffset: 50; } to { stroke-dashoffset: 0; } }

.fade-up    { animation: fadeUp  .45s cubic-bezier(.22,1,.36,1) both; }
.fade-in    { animation: fadeIn  .3s ease both; }
.scale-in   { animation: scaleIn .4s cubic-bezier(.22,1,.36,1) both; }
.float      { animation: float   3.5s ease-in-out infinite; }
.glow       { animation: glow    2s ease-in-out infinite; }

.grid-bg {
  background-image:
    linear-gradient(rgba(48,54,61,.35) 1px, transparent 1px),
    linear-gradient(90deg, rgba(48,54,61,.35) 1px, transparent 1px);
  background-size: 30px 30px;
}

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 9px;
  font-size: 14px; font-weight: 600; font-family: var(--font);
  cursor: pointer; border: none; transition: all .18s ease;
  letter-spacing: .01em; white-space: nowrap; text-decoration: none;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary  { background: var(--green); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--green-lt); box-shadow: 0 0 18px var(--green-gl); }
.btn-ghost    { background: var(--surf3); color: var(--text); border: 1.5px solid var(--border); }
.btn-ghost:hover:not(:disabled) { border-color: var(--border2); background: var(--surf2); }
.btn-lg       { padding: 14px 32px; font-size: 15.5px; border-radius: 10px; }
.btn-sm       { padding: 7px 14px; font-size: 12.5px; border-radius: 7px; }

.card {
  background: var(--surf); border: 1.5px solid var(--border);
  border-radius: var(--radius); padding: 22px;
  transition: border-color .2s;
}

.progress-track {
  height: 7px; background: var(--surf3); border-radius: 4px; overflow: hidden;
}
.progress-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--green), var(--green-lt), #56d364);
  background-size: 200% auto;
  transition: width .3s ease;
  position: relative; overflow: hidden;
}
.progress-fill.animated::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent);
  animation: shimmer 1.4s linear infinite; background-size: 200% auto;
}

.drop-zone {
  border: 2px dashed var(--border); border-radius: var(--radius);
  padding: 52px 24px; text-align: center;
  cursor: pointer; transition: all .22s ease; position: relative;
  background: transparent;
}
.drop-zone:hover, .drop-zone.over {
  border-color: var(--green); background: var(--green-gl);
}
.drop-zone.has-file {
  border-color: rgba(46,160,67,.6); border-style: solid;
  background: rgba(46,160,67,.04);
}

.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
}
.badge-green  { background: var(--green-gl); color: var(--green-lt); border: 1px solid rgba(46,160,67,.3); }
.badge-blue   { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(88,166,255,.25); }
.badge-red    { background: var(--red-dim); color: var(--red); border: 1px solid rgba(248,81,73,.25); }
.badge-gray   { background: rgba(110,118,129,.1); color: var(--muted); border: 1px solid rgba(110,118,129,.2); }

.mono { font-family: var(--mono); }

.install-bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  background: linear-gradient(90deg, #0f2318, #0d1117);
  border-bottom: 1px solid rgba(46,160,67,.4);
  padding: 10px 20px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; animation: fadeUp .3s ease;
}

.log-panel {
  background: var(--bg); border: 1.5px solid var(--border);
  border-radius: 9px; padding: 14px 16px;
  font-family: var(--mono); font-size: 12px;
  max-height: 200px; overflow-y: auto;
}
.log-line {
  display: flex; gap: 10px; padding: 2.5px 0;
  animation: slideIn .2s ease;
}
.log-line.ok   { color: var(--green-lt); }
.log-line.err  { color: var(--red); }
.log-line.info { color: var(--blue); }
.log-line.dim  { color: var(--muted); }

.step-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.step-icon {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; font-family: var(--mono);
  transition: all .3s;
}
.step-icon.pending { background: var(--surf3); border: 2px solid var(--border); color: var(--dim); }
.step-icon.active  { background: var(--green-gl); border: 2px solid var(--green); color: var(--green-lt); }
.step-icon.done    { background: var(--green); border: 2px solid var(--green); color: #fff; }
.step-icon.error   { background: var(--red-dim); border: 2px solid var(--red); color: var(--red); }
`

/* ─── SVG Icons ──────────────────────────────────────────────────────────────── */
const Icon = {
  github: (
    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.645.35-1.087.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  ),
  upload: (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
    </svg>
  ),
  zip: (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
    </svg>
  ),
  x: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
    </svg>
  ),
  external: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
    </svg>
  ),
  mobile: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
  ),
  copy: (
    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  ),
}

/* ─── Spinner ────────────────────────────────────────────────────────────────── */
function Spinner({ size = 16, color = 'currentColor' }) {
  return (
    <svg style={{ animation: 'spin .7s linear infinite', flexShrink: 0 }} width={size} height={size} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity=".2"/>
      <path d="M22 12a10 10 0 00-10-10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}

/* ─── Logo ───────────────────────────────────────────────────────────────────── */
function Logo({ size = 28 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size, background: 'var(--green)', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 14px var(--green-gl)',
      }}>
        <svg width={size * .58} height={size * .58} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
        </svg>
      </div>
      <span style={{ fontWeight: 800, fontSize: size * .72, letterSpacing: '-.02em', color: 'var(--text)' }}>
        Sebair<span style={{ color: 'var(--green)' }}>Git</span>
      </span>
    </div>
  )
}

/* ─── XHR upload with real progress ─────────────────────────────────────────── */
function uploadZip(file, onUploadProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('zip', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onUploadProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText)
        if (xhr.status === 200) resolve(json)
        else reject(new Error(json.error || `Server error ${xhr.status}`))
      } catch {
        reject(new Error(`Unexpected response (${xhr.status})`))
      }
    }
    xhr.onerror   = () => reject(new Error('Network error — check your connection.'))
    xhr.ontimeout = () => reject(new Error('Request timed out. Try a smaller ZIP.'))
    xhr.timeout   = 120_000 // 2 min
    xhr.send(formData)
  })
}

/* ─── Format bytes ───────────────────────────────────────────────────────────── */
function fmt(bytes) {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(2)} MB`
}

/* ─── Main App ───────────────────────────────────────────────────────────────── */
export default function App() {
  const [phase, setPhase] = useState('idle')      // idle | uploading | processing | success | error
  const [file,  setFile]  = useState(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [logs,  setLogs]  = useState([])
  const [result, setResult] = useState(null)
  const [error,  setError]  = useState(null)
  const [dragging, setDragging] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstall,    setShowInstall]    = useState(false)
  const fileInputRef = useRef()
  const logsRef      = useRef()

  // PWA install prompt
  useEffect(() => {
    const handler = e => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [logs])

  const addLog = useCallback((msg, type = 'dim') => {
    setLogs(prev => [...prev, { msg, type, ts: Date.now() }])
  }, [])

  const handleFile = useCallback(f => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setError('Only .zip files are accepted.')
      setPhase('error')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File exceeds 50 MB limit.')
      setPhase('error')
      return
    }
    setFile(f)
  }, [])

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowInstall(false)
  }

  const copyUrl = async url => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch {}
  }

  // ── Upload & process ─────────────────────────────────────────────────────────
  const startUpload = useCallback(async () => {
    if (!file) return
    setLogs([])
    setUploadPct(0)
    setActiveStep(0)
    setPhase('uploading')

    addLog(`→ Preparing ${file.name} (${fmt(file.size)})`, 'info')

    try {
      // Phase 1: upload ZIP to server
      const data = await uploadZip(file, pct => {
        setUploadPct(pct)
        if (pct === 100) {
          addLog('✓ File received by server', 'ok')
          setPhase('processing')
          setActiveStep(1)
          addLog('→ Extracting ZIP contents…', 'info')
        }
      })

      // Simulate step progression during server processing
      const steps = [
        { delay: 800,  step: 2, msg: '→ Creating GitHub repository…' },
        { delay: 1800, step: 3, msg: '→ Uploading files via GitHub Tree API…' },
        { delay: 3000, step: 4, msg: '→ Creating commit & updating branch…' },
      ]
      for (const s of steps) {
        await new Promise(r => setTimeout(r, s.delay))
        setActiveStep(s.step)
        addLog(s.msg, 'info')
      }

      // Step 5: verification
      setActiveStep(5)
      addLog('→ Verifying file count…', 'info')
      await new Promise(r => setTimeout(r, 600))

      addLog(`✓ ${data.fileCount} / ${data.expectedCount} files verified`, data.verified ? 'ok' : 'err')
      addLog(`✓ Commit ${data.commitSha} pushed to ${data.branch}`, 'ok')
      addLog(`✓ Repository ready: ${data.repoUrl}`, 'ok')

      setResult(data)
      setPhase('success')

    } catch (err) {
      addLog(`✗ ${err.message}`, 'err')
      setError(err.message)
      setPhase('error')
    }
  }, [file, addLog])

  const reset = () => {
    setPhase('idle'); setFile(null); setUploadPct(0)
    setActiveStep(0); setLogs([]); setResult(null); setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const STEPS = [
    'Upload ZIP',
    'Extract Files',
    'Create Repository',
    'Upload Files',
    'Create Commit',
    'Verify',
  ]

  const stepStatus = i => {
    if (i < activeStep) return 'done'
    if (i === activeStep && phase === 'processing') return 'active'
    if (phase === 'success') return 'done'
    if (phase === 'error' && i === activeStep) return 'error'
    return 'pending'
  }

  return (
    <>
      <style>{STYLES}</style>

      {/* ── PWA Install Banner ─────────────────────────────────────────────── */}
      {showInstall && (
        <div className="install-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13.5 }}>
            {Icon.mobile}
            <span>Add <strong style={{ color: 'var(--text)' }}>SebairGit</strong> to your home screen for instant access</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-primary" onClick={handleInstall}>Install App</button>
            <button className="btn btn-sm btn-ghost" style={{ padding: '7px 10px' }} onClick={() => setShowInstall(false)}>{Icon.x}</button>
          </div>
        </div>
      )}

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <div className="grid-bg" style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        paddingTop: showInstall ? 52 : 0,
      }}>
        {/* Ambient glow */}
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(46,160,67,.04) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Header */}
        <header style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'rgba(13,17,23,.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: showInstall ? 52 : 0, zIndex: 50 }}>
          <Logo size={26} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-green">v1.0</span>
            <a href="https://github.com" target="_blank" rel="noreferrer"
               style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--muted)', fontSize: 13, fontWeight: 500, textDecoration: 'none', padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surf)', transition: 'all .15s' }}>
              {Icon.github} GitHub
            </a>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px 60px', position: 'relative', zIndex: 1 }}>

          {/* ── IDLE: Upload zone ──────────────────────────────────────────── */}
          {(phase === 'idle') && (
            <div className="fade-up" style={{ width: '100%', maxWidth: 560 }}>
              {/* Hero */}
              <div className="float" style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ display: 'inline-flex', padding: 18, background: 'var(--surf)', border: '1.5px solid var(--border)', borderRadius: 20, marginBottom: 20, boxShadow: '0 0 40px var(--green-gl)' }} className="glow">
                  {Icon.github}
                </div>
                <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15, marginBottom: 12 }}>
                  ZIP → GitHub<br />
                  <span style={{ color: 'var(--green)' }}>in Seconds</span>
                </h1>
                <p style={{ fontSize: 15.5, color: 'var(--muted)', lineHeight: 1.7 }}>
                  Drop any ZIP — files are extracted and pushed to a new GitHub repository with the exact same structure.
                </p>
              </div>

              {/* Drop zone */}
              <div
                className={`drop-zone ${dragging ? 'over' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !file && fileInputRef.current?.click()}
                style={{ cursor: file ? 'default' : 'pointer' }}
              >
                <input ref={fileInputRef} type="file" accept=".zip,application/zip" hidden
                       onChange={e => handleFile(e.target.files?.[0])} />

                {!file ? (
                  <div className="fade-in">
                    <div style={{ width: 60, height: 60, background: 'var(--surf3)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--muted)' }}>
                      {Icon.zip}
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Drop your ZIP file here</p>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16 }}>or click to browse</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {['.zip only', 'max 50 MB', 'preserves structure', 'all file types'].map(t => (
                        <span key={t} style={{ background: 'var(--surf3)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11.5, padding: '3px 9px', borderRadius: 5, fontFamily: 'var(--mono)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="scale-in" style={{ textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, background: 'var(--green-gl)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1.5px solid rgba(46,160,67,.35)', color: 'var(--green-lt)' }}>
                      {Icon.zip}
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--green-lt)', marginBottom: 6, fontFamily: 'var(--mono)' }}>{file.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{fmt(file.size)} · ZIP archive</p>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setFile(null) }}>{Icon.x} Remove</button>
                  </div>
                )}
              </div>

              {/* Action */}
              <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                {!file && (
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => fileInputRef.current?.click()}>
                    {Icon.zip} Browse Files
                  </button>
                )}
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={!file} onClick={startUpload}>
                  {Icon.github} Upload to GitHub
                </button>
              </div>

              {/* Features strip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 32 }}>
                {[
                  { icon: '🔒', title: 'Secure', sub: 'Token never exposed' },
                  { icon: '🌿', title: 'Exact Structure', sub: 'Paths preserved' },
                  { icon: '⚡', title: 'Tree API', sub: 'Atomic batch upload' },
                ].map(f => (
                  <div key={f.title} className="card" style={{ textAlign: 'center', padding: '14px 12px' }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{f.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{f.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── UPLOADING ──────────────────────────────────────────────────── */}
          {phase === 'uploading' && (
            <div className="fade-up card" style={{ width: '100%', maxWidth: 520 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <Spinner size={22} color="var(--green)" />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>Uploading ZIP…</p>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--mono)' }}>{file?.name}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--green-lt)' }}>{uploadPct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill animated" style={{ width: `${uploadPct}%` }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, textAlign: 'center', fontFamily: 'var(--mono)' }}>
                {fmt(Math.round(file?.size * uploadPct / 100))} / {fmt(file?.size ?? 0)}
              </p>
            </div>
          )}

          {/* ── PROCESSING ─────────────────────────────────────────────────── */}
          {phase === 'processing' && (
            <div className="fade-up" style={{ width: '100%', maxWidth: 560 }}>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <Spinner size={20} color="var(--green)" />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>Processing…</p>
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>{STEPS[activeStep]}</p>
                  </div>
                </div>

                {/* Steps */}
                {STEPS.map((label, i) => (
                  <div key={label} className="step-row" style={{ borderBottom: i === STEPS.length - 1 ? 'none' : undefined }}>
                    <div className={`step-icon ${stepStatus(i)}`}>
                      {stepStatus(i) === 'done'   ? Icon.check  :
                       stepStatus(i) === 'active'  ? <Spinner size={14} color="var(--green)" /> :
                       stepStatus(i) === 'error'   ? Icon.x :
                       i + 1}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: stepStatus(i) === 'active' ? 600 : 400, color: stepStatus(i) !== 'pending' ? 'var(--text)' : 'var(--dim)' }}>
                      {label}
                    </span>
                    {stepStatus(i) === 'done' && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green-lt)', fontFamily: 'var(--mono)' }}>done</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Live logs */}
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--green-lt)', fontFamily: 'var(--mono)' }}>Output</span>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>● Live</span>
                </div>
                <div className="log-panel" ref={logsRef}>
                  {logs.map((l, i) => (
                    <div key={i} className={`log-line ${l.type}`}>
                      <span style={{ color: 'var(--dim)', userSelect: 'none', minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                      <span>{l.msg}</span>
                    </div>
                  ))}
                  <div className="log-line dim"><span style={{ color: 'var(--dim)' }}>{'>'}</span><span style={{ animation: 'pulse 1s infinite' }}>_</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── SUCCESS ────────────────────────────────────────────────────── */}
          {phase === 'success' && result && (
            <div className="fade-up" style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
              {/* Check icon */}
              <div style={{ width: 80, height: 80, background: 'var(--green-gl)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '2px solid rgba(46,160,67,.4)' }} className="glow">
                <svg width="38" height="38" fill="none" viewBox="0 0 24 24" stroke="var(--green-lt)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" strokeDasharray="50" strokeDashoffset="0" style={{ animation: 'checkmark .5s ease .1s both' }} />
                </svg>
              </div>

              <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 8 }}>Upload Complete!</h2>
              <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.7 }}>
                {result.fileCount} file{result.fileCount !== 1 ? 's' : ''} pushed to{' '}
                <span style={{ color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{result.owner}/{result.repoName}</span>
                {result.verified ? ' · ✓ verified' : ''}
              </p>

              {/* Repo URL */}
              <div style={{ background: 'var(--surf3)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0, fontFamily: 'var(--mono)' }}>URL</span>
                <span style={{ flex: 1, fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--blue)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{result.repoUrl}</span>
                <button onClick={() => copyUrl(result.repoUrl)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green-lt)' : 'var(--muted)', display: 'flex', flexShrink: 0, transition: 'color .2s' }}>
                  {copied ? Icon.check : Icon.copy}
                </button>
              </div>

              {/* Stats */}
              <div className="card" style={{ textAlign: 'left', marginBottom: 24 }}>
                {[
                  ['Repository', `${result.owner}/${result.repoName}`],
                  ['Branch',     result.branch],
                  ['Files',      `${result.fileCount} / ${result.expectedCount} ${result.verified ? '✓' : '⚠'}`],
                  ['Commit',     result.commitSha],
                  ['Size',       `${result.totalSizeKb} KB extracted`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>{k}</span>
                    <span style={{ fontSize: 13, fontFamily: 'var(--mono)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={result.repoUrl} target="_blank" rel="noreferrer"
                   className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {Icon.external} View on GitHub
                </a>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={reset}>
                  {Icon.upload} Upload Another
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR ──────────────────────────────────────────────────────── */}
          {phase === 'error' && (
            <div className="fade-up" style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, background: 'var(--red-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', border: '2px solid rgba(248,81,73,.3)' }}>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--red)" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, color: 'var(--red)' }}>Upload Failed</h2>
              <p style={{ fontSize: 14.5, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.7 }}>{error}</p>

              {logs.length > 0 && (
                <div className="card" style={{ textAlign: 'left', marginBottom: 24, padding: '14px 16px', border: '1.5px solid rgba(248,81,73,.2)' }}>
                  <div className="log-panel" style={{ maxHeight: 140 }}>
                    {logs.map((l, i) => (
                      <div key={i} className={`log-line ${l.type}`}>
                        <span style={{ color: 'var(--dim)', userSelect: 'none' }}>{String(i+1).padStart(2,'0')}</span>
                        <span>{l.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={reset}>← Start Over</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={startUpload} disabled={!file}>
                  {Icon.refresh} Retry
                </button>
              </div>
            </div>
          )}

        </main>

        {/* Footer */}
        <footer style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 24 }}>
          {['Privacy', 'Terms', 'Docs', 'GitHub'].map(l => (
            <span key={l} style={{ fontSize: 12, color: 'var(--dim)', cursor: 'pointer' }}>{l}</span>
          ))}
        </footer>
      </div>
    </>
  )
}
