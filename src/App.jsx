import { useState, useEffect, useRef, useCallback } from 'react'

const SUPA      = 'https://bgbherphlqebbmdalywi.supabase.co/functions/v1'
const ACCESS_MS = 14 * 60 * 1000   // refresh 1 min before 15-min expiry

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0D1117;--surf:#161B22;--surf2:#1C2128;--surf3:#21262D;
  --border:#30363D;--border2:#484F58;
  --green:#2EA043;--green-lt:#3FB950;--green-gl:rgba(46,160,67,.15);--green-dim:rgba(46,160,67,.08);
  --blue:#58A6FF;--blue-dim:rgba(88,166,255,.12);
  --red:#F85149;--red-dim:rgba(248,81,73,.12);
  --orange:#E3B341;--orange-dim:rgba(227,179,65,.1);
  --purple:#BC8CFF;--purple-dim:rgba(188,140,255,.1);
  --text:#C9D1D9;--muted:#8B949E;--dim:#6E7681;
  --font:'Sora',sans-serif;--mono:'JetBrains Mono',monospace;
}
html,body,#root{height:100%;background:var(--bg);color:var(--text);font-family:var(--font)}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
@keyframes fadeUp  {from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn  {from{opacity:0}to{opacity:1}}
@keyframes spin    {to{transform:rotate(360deg)}}
@keyframes pulse   {0%,100%{opacity:1}50%{opacity:.35}}
@keyframes shimmer {from{background-position:-200% center}to{background-position:200% center}}
@keyframes glow    {0%,100%{box-shadow:0 0 14px var(--green-gl)}50%{box-shadow:0 0 32px var(--green-gl),0 0 60px var(--green-gl)}}
@keyframes slideIn {from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn {from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
@keyframes toastIn {from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}
@keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(110%)}}
.fu{animation:fadeUp  .42s cubic-bezier(.22,1,.36,1) both}
.fd{animation:fadeDown .35s ease both}
.fi{animation:fadeIn  .3s ease both}
.si{animation:scaleIn .35s cubic-bezier(.22,1,.36,1) both}
.gl{animation:glow    2.5s ease-in-out infinite}
.grid{
  background-image:linear-gradient(rgba(48,54,61,.22) 1px,transparent 1px),
    linear-gradient(90deg,rgba(48,54,61,.22) 1px,transparent 1px);
  background-size:30px 30px;
}
/* Buttons */
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:9px;font-size:14px;font-weight:600;font-family:var(--font);cursor:pointer;border:none;transition:all .17s;letter-spacing:.01em;white-space:nowrap;text-decoration:none;justify-content:center}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{background:var(--green);color:#fff}
.btn-primary:hover:not(:disabled){background:var(--green-lt);box-shadow:0 4px 16px rgba(46,160,67,.35)}
.btn-primary:active:not(:disabled){transform:scale(.98)}
.btn-ghost{background:var(--surf3);color:var(--text);border:1.5px solid var(--border)}
.btn-ghost:hover:not(:disabled){border-color:var(--border2);background:var(--surf2)}
.btn-github{background:#21262d;color:#fff;border:1.5px solid #30363d}
.btn-github:hover:not(:disabled){background:#2d333b;border-color:#484f58;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.btn-danger{background:transparent;color:var(--red);border:1.5px solid rgba(248,81,73,.35)}
.btn-danger:hover:not(:disabled){background:var(--red-dim);border-color:var(--red)}
.btn-lg{padding:14px 32px;font-size:15px;border-radius:10px}
.btn-sm{padding:6px 13px;font-size:12.5px;border-radius:7px}
.btn-xs{padding:4px 10px;font-size:11.5px;border-radius:6px}
/* Cards */
.card{background:var(--surf);border:1.5px solid var(--border);border-radius:12px;padding:22px}
/* Drop zone */
.dz{border:2px dashed var(--border);border-radius:12px;padding:48px 24px;text-align:center;cursor:pointer;transition:all .22s}
.dz:hover,.dz.over{border-color:var(--green);background:var(--green-dim)}
.dz.has-file{border-color:rgba(46,160,67,.6);border-style:solid;background:rgba(46,160,67,.04)}
/* Progress */
.prog-track{height:6px;background:var(--surf3);border-radius:3px;overflow:hidden}
.prog-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--green),var(--green-lt),#56d364);background-size:200% auto;transition:width .35s ease;overflow:hidden;position:relative}
.prog-fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:shimmer 1.5s linear infinite;background-size:200% auto}
/* Log */
.log-box{background:var(--bg);border:1.5px solid var(--border);border-radius:9px;padding:14px;font-family:var(--mono);font-size:12px;line-height:1.6;max-height:220px;overflow-y:auto}
.ll{display:flex;gap:10px;padding:2px 0;animation:slideIn .15s ease}
.ll.ok{color:var(--green-lt)}.ll.err{color:var(--red)}.ll.info{color:var(--blue)}.ll.dim{color:var(--muted)}
/* Steps */
.step-row{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)}
.step-row:last-child{border-bottom:none}
.sd{width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:var(--mono);transition:all .3s}
.sd.p{background:var(--surf3);border:2px solid var(--border);color:var(--dim)}
.sd.a{background:var(--green-dim);border:2px solid var(--green);color:var(--green-lt)}
.sd.d{background:var(--green);border:2px solid var(--green);color:#fff}
.sd.e{background:var(--red-dim);border:2px solid var(--red);color:var(--red)}
/* Badges */
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;flex-shrink:0}
.badge-green {background:var(--green-dim); color:var(--green-lt);border:1px solid rgba(46,160,67,.3)}
.badge-blue  {background:var(--blue-dim);  color:var(--blue);   border:1px solid rgba(88,166,255,.25)}
.badge-orange{background:var(--orange-dim);color:var(--orange); border:1px solid rgba(227,179,65,.3)}
.badge-gray  {background:var(--surf3);     color:var(--muted);  border:1px solid var(--border)}
.badge-red   {background:var(--red-dim);   color:var(--red);    border:1px solid rgba(248,81,73,.25)}
.badge-purple{background:var(--purple-dim);color:var(--purple); border:1px solid rgba(188,140,255,.25)}
/* Chip */
.chip{display:flex;align-items:center;gap:8px;background:var(--surf2);border:1.5px solid var(--border);border-radius:9px;padding:5px 13px 5px 6px}
.chip img{width:26px;height:26px;border-radius:50%;border:2px solid var(--green);object-fit:cover}
/* Toast */
.toast-stack{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none}
.toast{pointer-events:all;min-width:280px;max-width:360px;background:var(--surf);border:1.5px solid var(--border);border-radius:10px;padding:13px 16px;display:flex;align-items:flex-start;gap:11px;box-shadow:0 8px 32px rgba(0,0,0,.4);animation:toastIn .3s cubic-bezier(.22,1,.36,1) both}
.toast.out{animation:toastOut .25s ease forwards}
.toast.success{border-color:rgba(46,160,67,.4)}.toast.error{border-color:rgba(248,81,73,.4)}
.toast.info{border-color:rgba(88,166,255,.4)}.toast.warning{border-color:rgba(227,179,65,.4)}
/* Tabs */
.nav-tabs{display:flex;gap:4px;background:var(--surf2);border:1.5px solid var(--border);border-radius:9px;padding:4px}
.nav-tab{padding:7px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;color:var(--muted);transition:all .15s;border:none;background:none;font-family:var(--font)}
.nav-tab:hover{color:var(--text);background:var(--surf3)}
.nav-tab.active{background:var(--surf);color:var(--text);border:1px solid var(--border);box-shadow:0 1px 4px rgba(0,0,0,.2)}
/* Stat grid */
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.stat-card{background:var(--surf2);border:1.5px solid var(--border);border-radius:9px;padding:16px;text-align:center}
/* History row */
.hist-row{display:grid;grid-template-columns:1fr auto auto auto;gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);transition:background .15s}
.hist-row:hover{background:var(--surf2)}
.hist-row:last-child{border-bottom:none}
/* Misc */
.session-bar{background:var(--orange-dim);border-bottom:1px solid rgba(227,179,65,.3);padding:9px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;animation:fadeDown .3s ease}
.install-bar{position:fixed;top:0;left:0;right:0;z-index:200;background:rgba(15,35,24,.95);backdrop-filter:blur(10px);border-bottom:1px solid rgba(46,160,67,.35);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;animation:fadeDown .3s ease}
.preview-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px}
.preview-row:last-child{border-bottom:none}
.plan-bar{background:var(--surf2);border:1.5px solid var(--border);border-radius:9px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
@media(max-width:520px){
  .stat-grid{grid-template-columns:1fr 1fr}
  .nav-tabs{gap:2px}.nav-tab{padding:7px 11px;font-size:12px}
  .btn-lg{padding:13px 22px;font-size:14px}
  .hist-row{grid-template-columns:1fr auto auto}
}
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
  history: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  trash:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  warning: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  info:    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>,
  zip:     <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  phone:   <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  folder:  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  file:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function Spin({ size=15, color='currentColor' }) {
  return <svg style={{animation:'spin .65s linear infinite',flexShrink:0}} width={size} height={size} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity=".2"/><path d="M22 12a10 10 0 00-10-10" stroke={color} strokeWidth="3" strokeLinecap="round"/></svg>
}

function Logo({ size=27 }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:9}}>
      <div style={{width:size,height:size,background:'var(--green)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 14px var(--green-gl)',flexShrink:0}}>
        <svg width={size*.57} height={size*.57} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
      </div>
      <span style={{fontWeight:800,fontSize:size*.7,letterSpacing:'-.02em'}}>Sebair<span style={{color:'var(--green)'}}>Git</span></span>
    </div>
  )
}

const fmt     = b => !b?'0 B':b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(2)+' MB'
const fmtTime = ms => ms<1000?ms+'ms':(ms/1000).toFixed(1)+'s'
const fmtDate = ts => { const d=new Date(ts),diff=Date.now()-d.getTime(); return diff<60000?'Just now':diff<3600000?Math.floor(diff/60000)+'m ago':diff<86400000?Math.floor(diff/3600000)+'h ago':d.toLocaleDateString() }

function decodeJWT(t) {
  try { const p=t.split('.')[1]; return JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')+'==')) } catch { return null }
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
let _tid=0
function useToasts() {
  const [toasts,set]=useState([])
  const add=useCallback((msg,type='info',dur=4000)=>{
    const id=++_tid
    set(p=>[...p.slice(-4),{id,msg,type,out:false}])
    setTimeout(()=>{set(p=>p.map(t=>t.id===id?{...t,out:true}:t));setTimeout(()=>set(p=>p.filter(t=>t.id!==id)),280)},dur)
  },[])
  const dismiss=useCallback(id=>{set(p=>p.map(t=>t.id===id?{...t,out:true}:t));setTimeout(()=>set(p=>p.filter(t=>t.id!==id)),280)},[])
  return {toasts,toast:add,dismiss}
}

function Toasts({toasts,dismiss}) {
  if(!toasts.length) return null
  const ic={success:I.check,error:I.x,warning:I.warning,info:I.info}
  const col={success:'var(--green-lt)',error:'var(--red)',warning:'var(--orange)',info:'var(--blue)'}
  return (
    <div className="toast-stack">
      {toasts.map(t=>(
        <div key={t.id} className={`toast ${t.type} ${t.out?'out':''}`}>
          <span style={{color:col[t.type],flexShrink:0,marginTop:1}}>{ic[t.type]}</span>
          <span style={{fontSize:13.5,flex:1,lineHeight:1.5}}>{t.msg}</span>
          <button onClick={()=>dismiss(t.id)} style={{background:'none',border:'none',color:'var(--dim)',cursor:'pointer'}}>{I.x}</button>
        </div>
      ))}
    </div>
  )
}

/* ─── useAuth — access+refresh token pair, silent renewal ───────────────── */
function useAuth(toast) {
  const [at,  setAt]  = useState(null)  // access token  — memory only
  const [rt,  setRt]  = useState(null)  // refresh token — memory only
  const [user,setUser]= useState(null)
  const [ready,setReady]=useState(false)
  const [sessionWarn,setSessionWarn]=useState(false)
  const renewRef=useRef(null)

  const scheduleRenew=useCallback((refreshToken, expMs)=>{
    if(renewRef.current) clearTimeout(renewRef.current)
    const delay=Math.max(0, expMs-Date.now()-60_000)
    renewRef.current=setTimeout(()=>silentRefresh(refreshToken), delay)
  },[])

  const silentRefresh=useCallback(async(refreshToken)=>{
    try {
      const res=await fetch(`${SUPA}/auth-refresh`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})})
      if(!res.ok) throw new Error('refresh_failed')
      const data=await res.json()
      if(data.error) throw new Error(data.error)
      setAt(data.access_token)
      setRt(data.refresh_token)
      const d=decodeJWT(data.access_token)
      if(d?.login) setUser(u=>({...u,login:d.login,name:d.name,avatar:d.avatar,plan:d.plan}))
      scheduleRenew(data.refresh_token, data.exp*1000)
      setSessionWarn(false)
    } catch {
      setAt(null); setRt(null); setUser(null)
      toast?.('Session expired. Please login again.','warning',6000)
    }
  },[scheduleRenew,toast])

  // Bootstrap from URL params after OAuth redirect
  useEffect(()=>{
    const p=new URLSearchParams(window.location.search)
    const urlAt=p.get('at'), urlRt=p.get('rt'), urlExp=p.get('exp'), urlErr=p.get('error')
    if(urlAt&&urlRt){ window.history.replaceState({},'','/'); const d=decodeJWT(urlAt); if(d?.login){setAt(urlAt);setRt(urlRt);setUser({login:d.login,name:d.name,avatar:d.avatar,plan:d.plan,userId:d.sub});if(urlExp)scheduleRenew(urlRt,Number(urlExp)*1000)} }
    else if(urlErr&&urlErr!=='access_denied') window.history.replaceState({},'','/')
    setReady(true)
  },[scheduleRenew])

  // Watch token expiry
  useEffect(()=>{
    if(!at) return
    const check=()=>{const d=decodeJWT(at);if(!d?.exp)return;const left=d.exp*1000-Date.now();setSessionWarn(left<5*60000&&left>0);if(left<=0){setAt(null);setRt(null);setUser(null)}}
    check(); const iv=setInterval(check,30000); return()=>clearInterval(iv)
  },[at])

  const logout=useCallback(async()=>{
    if(renewRef.current) clearTimeout(renewRef.current)
    try { await fetch(`${SUPA}/auth-logout`,{method:'POST',headers:{Authorization:`Bearer ${at}`,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:rt})}) } catch {}
    setAt(null);setRt(null);setUser(null);setSessionWarn(false)
  },[at,rt])

  const renew=useCallback(()=>{ if(rt) silentRefresh(rt) },[rt,silentRefresh])

  return{at,user,ready,sessionWarn,logout,renew}
}

/* ─── ZIP preview (client-side) ─────────────────────────────────────────── */
async function previewZip(file) {
  return new Promise(resolve=>{
    const reader=new FileReader()
    reader.onload=e=>{
      try {
        const buf=e.target.result, view=new DataView(buf)
        const files=[]; let off=0
        while(off<buf.byteLength-4){
          const sig=view.getUint32(off,true)
          if(sig===0x04034b50){
            const nameLen=view.getUint16(off+26,true),extraLen=view.getUint16(off+28,true)
            const compSize=view.getUint32(off+18,true),uncompSize=view.getUint32(off+22,true)
            const name=new TextDecoder().decode(new Uint8Array(buf,off+30,nameLen))
            if(!name.endsWith('/')&&!name.includes('__MACOSX')&&!name.includes('.DS_Store'))
              files.push({name,size:uncompSize})
            off+=30+nameLen+extraLen+compSize
          } else off++
        }
        resolve(files.slice(0,200))
      } catch { resolve([]) }
    }
    reader.readAsArrayBuffer(file.slice(0,4*1024*1024))
  })
}

/* ─── XHR upload ─────────────────────────────────────────────────────────── */
function uploadZip(file,token,onProgress){
  return new Promise((resolve,reject)=>{
    const fd=new FormData(); fd.append('zip',file)
    const xhr=new XMLHttpRequest()
    xhr.open('POST','/api/upload')
    xhr.setRequestHeader('Authorization','Bearer '+token)
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100))}
    xhr.onload=()=>{try{const j=JSON.parse(xhr.responseText);if(xhr.status===200)resolve(j);else reject(Object.assign(new Error(j.error||'Error '+xhr.status),{status:xhr.status}))}catch{reject(new Error('Unexpected response'))}}
    xhr.onerror=()=>reject(new Error('Network error.'))
    xhr.ontimeout=()=>reject(new Error('Request timed out.'))
    xhr.timeout=120_000; xhr.send(fd)
  })
}

/* ─── OAuth start ────────────────────────────────────────────────────────── */
function startLogin(){
  const id=import.meta.env.VITE_GITHUB_CLIENT_ID
  if(!id){window.location.href='/api/auth/login';return}
  const p=new URLSearchParams({client_id:id,redirect_uri:`${SUPA}/auth-callback`,scope:'repo user',state:(crypto.randomUUID?.())||Math.random().toString(36).slice(2)})
  window.location.href='https://github.com/login/oauth/authorize?'+p
}

const PLAN_BADGE = {free:'badge-gray',pro:'badge-blue',enterprise:'badge-purple'}
const STEPS = ['Upload ZIP','Extract Files','Create Repository','Upload Files','Create Commit','Verify']

/* ─────────────────────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────────────────────── */
export default function App() {
  const {toasts,toast,dismiss}=useToasts()
  const {at,user,ready,sessionWarn,logout,renew}=useAuth(toast)

  const [loginBusy, setLoginBusy] =useState(false)
  const [logoutBusy,setLogoutBusy]=useState(false)
  const [authError, setAuthError] =useState(null)

  // Upload
  const [tab,    setTab]   =useState('upload')
  const [phase,  setPhase] =useState('idle')
  const [file,   setFile]  =useState(null)
  const [preview,setPreview]=useState(null)
  const [prevBusy,setPrevBusy]=useState(false)
  const [pct,    setPct]   =useState(0)
  const [stepIdx,setStepIdx]=useState(0)
  const [logs,   setLogs]  =useState([])
  const [result, setResult]=useState(null)
  const [upErr,  setUpErr] =useState(null)
  const [reqStart,setReqStart]=useState(null)

  // History
  const [history,   setHistory]   =useState([])
  const [histStats, setHistStats] =useState({total:0,files:0,bytes:0,successful:0})
  const [histLoading,setHistLoading]=useState(false)

  // UI
  const [dragging,  setDragging]  =useState(false)
  const [copied,    setCopied]    =useState(false)
  const [deferredPWA,setDeferredPWA]=useState(null)
  const [showInstall,setShowInstall]=useState(false)

  const fileRef=useRef(), logRef=useRef()

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search)
    const e=p.get('error')
    if(e&&e!=='access_denied'){setAuthError(decodeURIComponent(e));window.history.replaceState({},'','/')}
  },[])

  useEffect(()=>{
    const h=e=>{e.preventDefault();setDeferredPWA(e);setShowInstall(true)}
    window.addEventListener('beforeinstallprompt',h)
    return()=>window.removeEventListener('beforeinstallprompt',h)
  },[])

  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight},[logs])

  useEffect(()=>{if(tab==='history'&&at)loadHistory()},[tab,at])

  useEffect(()=>{if(user&&ready)toast(`Welcome, @${user.login}! 👋`,'success',3500)},[user?.login])

  async function loadHistory(){
    setHistLoading(true)
    try {
      const r=await fetch('/api/history',{headers:{Authorization:'Bearer '+at}})
      const d=await r.json()
      if(!r.ok) throw new Error(d.error)
      setHistory(d.uploads||[])
      setHistStats(d.stats||{total:0,files:0,bytes:0,successful:0})
    } catch(e){toast('History error: '+e.message,'error')}
    finally{setHistLoading(false)}
  }

  const addLog=useCallback((msg,type='dim')=>setLogs(p=>[...p,{msg,type}]),[])

  const pickFile=async f=>{
    if(!f) return
    if(!f.name.toLowerCase().endsWith('.zip')){toast('Only .zip files accepted.','error');return}
    if(f.size>40*1024*1024){toast('File exceeds 40 MB limit.','error');return}
    setFile(f); toast(`${f.name} ready`,'success',2000)
    setPrevBusy(true)
    try{const files=await previewZip(f);setPreview(files)}catch{setPreview(null)}
    finally{setPrevBusy(false)}
  }

  const resetUpload=()=>{
    setPhase('idle');setFile(null);setPreview(null);setPct(0)
    setStepIdx(0);setLogs([]);setResult(null);setUpErr(null);setReqStart(null)
    if(fileRef.current)fileRef.current.value=''
  }

  const copyURL=async url=>{
    try{await navigator.clipboard.writeText(url);setCopied(true);toast('Copied!','success',2000);setTimeout(()=>setCopied(false),2000)}
    catch{toast('Copy failed.','error')}
  }

  const handleLogout=async()=>{
    setLogoutBusy(true); await logout()
    resetUpload();setTab('upload');setHistory([])
    toast('Logged out.','info',2500);setLogoutBusy(false)
  }

  const deleteItem=async id=>{
    try{await fetch('/api/history?id='+id,{method:'DELETE',headers:{Authorization:'Bearer '+at}});setHistory(p=>p.filter(h=>h.id!==id))}
    catch{toast('Delete failed.','error')}
  }

  const clearHist=async()=>{
    try{await fetch('/api/history',{method:'DELETE',headers:{Authorization:'Bearer '+at}});setHistory([]);setHistStats({total:0,files:0,bytes:0,successful:0});toast('History cleared.','info')}
    catch{toast('Clear failed.','error')}
  }

  /* Upload pipeline */
  const startUpload=useCallback(async()=>{
    if(!file||!at) return
    const start=Date.now()
    setLogs([]);setPct(0);setStepIdx(0);setReqStart(start);setPhase('uploading')
    addLog(`→ Preparing ${file.name} (${fmt(file.size)})`,'info')

    try {
      const data=await uploadZip(file,at,p=>{
        setPct(p)
        if(p===100){addLog('✓ Received by server','ok');setPhase('processing');setStepIdx(1);addLog('→ Extracting & validating…','info')}
      })

      for(const[delay,step,msg] of [
        [1200,2,'→ Creating GitHub repository…'],
        [2000,3,'→ Uploading files via Tree API…'],
        [2000,4,'→ Creating commit…'],
        [500, 5,'→ Verifying…'],
      ]){await new Promise(r=>setTimeout(r,delay));setStepIdx(step);addLog(msg,'info')}

      const elapsed=Date.now()-start
      addLog(`✓ ${data.fileCount}/${data.expectedCount} files${data.skipped?` (${data.skipped} skipped)`:''}`,data.verified?'ok':'err')
      if(data.failedBlobs)addLog(`⚠ ${data.failedBlobs} blobs retried`,'err')
      addLog(`✓ ${data.commitSha} → ${data.branch} · ${fmtTime(elapsed)}`,'ok')
      addLog(`✓ ${data.repoUrl}`,'ok')
      setResult({...data,elapsed});setPhase('done')
      toast(`✓ ${data.fileCount} files → ${data.repoName}`,'success',5000)
      if(tab==='history')loadHistory()

    } catch(err){
      addLog('✗ '+err.message,'err');setUpErr(err.message);setPhase('fail')
      if(err.status===401){logout();toast('Session expired. Please login.','warning',6000)}
      else toast('Upload failed: '+err.message,'error',6000)
    }
  },[file,at,addLog,tab])

  const sc=i=>{if(phase==='done')return 'd';if(phase==='fail'&&i===stepIdx)return 'e';if(i<stepIdx)return 'd';if(i===stepIdx&&phase==='processing')return 'a';return 'p'}

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return(
    <>
      <style>{CSS}</style>
      <Toasts toasts={toasts} dismiss={dismiss}/>

      {showInstall&&(
        <div className="install-bar">
          <div style={{display:'flex',alignItems:'center',gap:9,color:'var(--muted)',fontSize:13}}>
            {I.phone}<span>Add <strong style={{color:'var(--text)'}}>SebairGit</strong> to home screen</span>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-sm btn-primary" onClick={()=>{deferredPWA?.prompt();setShowInstall(false)}}>Install</button>
            <button className="btn btn-sm btn-ghost" style={{padding:'6px 9px'}} onClick={()=>setShowInstall(false)}>{I.x}</button>
          </div>
        </div>
      )}

      <div className="grid" style={{minHeight:'100vh',display:'flex',flexDirection:'column',paddingTop:showInstall?50:0}}>
        <div style={{position:'fixed',top:'15%',left:'50%',transform:'translate(-50%,-50%)',width:800,height:800,background:'radial-gradient(circle, rgba(46,160,67,.03) 0%, transparent 65%)',pointerEvents:'none',zIndex:0}}/>

        {/* HEADER */}
        <header style={{padding:'13px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,borderBottom:'1px solid var(--border)',background:'rgba(13,17,23,.92)',backdropFilter:'blur(16px)',position:'sticky',top:showInstall?50:0,zIndex:100}}>
          <Logo size={25}/>

          {user&&(
            <div className="nav-tabs" style={{flex:1,maxWidth:260,margin:'0 auto'}}>
              <button className={`nav-tab ${tab==='upload'?'active':''}`} onClick={()=>{setTab('upload');if(phase==='done'||phase==='fail')resetUpload()}}>
                {I.upload} Upload
              </button>
              <button className={`nav-tab ${tab==='history'?'active':''}`} onClick={()=>setTab('history')}>
                {I.history} History
                {histStats.total>0&&<span className="badge badge-gray" style={{fontSize:10,padding:'1px 6px',marginLeft:2}}>{histStats.total}</span>}
              </button>
            </div>
          )}

          <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            {!user&&<span className="badge badge-green">v4.0</span>}
            {!ready?<Spin size={18} color="var(--muted)"/>
            :user?(
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div className="chip">
                  <img src={user.avatar} alt={user.login} onError={e=>e.target.style.display='none'}/>
                  <span style={{fontSize:13,fontWeight:600,fontFamily:'var(--mono)',color:'var(--text)'}}>{user.login}</span>
                  <span className={`badge ${PLAN_BADGE[user.plan||'free']}`} style={{fontSize:9,marginLeft:2}}>{user.plan||'free'}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout} disabled={logoutBusy} style={{gap:6}}>
                  {logoutBusy?<Spin size={13}/>:I.logout}
                </button>
              </div>
            ):(
              <button className="btn btn-github btn-sm" onClick={()=>{setLoginBusy(true);startLogin()}} disabled={loginBusy}>
                {loginBusy?<Spin size={14} color="#fff"/>:I.github}
                {loginBusy?'Redirecting…':'Login with GitHub'}
              </button>
            )}
          </div>
        </header>

        {/* Session warning */}
        {sessionWarn&&(
          <div className="session-bar">
            <span style={{fontSize:13.5,color:'var(--orange)',display:'flex',alignItems:'center',gap:8}}>{I.warning} Session expires soon</span>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-sm" style={{background:'var(--orange)',color:'#000',fontWeight:700}} onClick={renew}>Renew</button>
              <button className="btn btn-sm btn-ghost" onClick={()=>setSessionWarn(false)}>{I.x}</button>
            </div>
          </div>
        )}

        {/* Auth error banner */}
        {authError&&(
          <div style={{background:'var(--red-dim)',borderBottom:'1px solid rgba(248,81,73,.3)',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,animation:'fadeDown .3s ease'}}>
            <span style={{fontSize:13.5,color:'var(--red)',display:'flex',alignItems:'center',gap:8}}>{I.x} {authError}</span>
            <button onClick={()=>setAuthError(null)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:20}}>×</button>
          </div>
        )}

        {/* MAIN */}
        <main style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:(!user||tab==='upload')?'center':'flex-start',padding:'32px 20px 60px',position:'relative',zIndex:1}}>

          {/* LANDING */}
          {ready&&!user&&(
            <div className="fu" style={{width:'100%',maxWidth:520,textAlign:'center'}}>
              <div style={{display:'inline-flex',padding:22,background:'var(--surf)',border:'1.5px solid var(--border)',borderRadius:20,marginBottom:28}} className="gl">{I.github}</div>
              <h1 style={{fontSize:42,fontWeight:800,letterSpacing:'-.03em',lineHeight:1.12,marginBottom:14}}>
                ZIP → GitHub<br/><span style={{color:'var(--green)'}}>in Seconds</span>
              </h1>
              <p style={{fontSize:15,color:'var(--muted)',lineHeight:1.75,marginBottom:36,maxWidth:420,margin:'0 auto 36px'}}>
                Login with GitHub and push any ZIP to a new repository — folder structure preserved exactly, every file type supported.
              </p>
              <button className="btn btn-github btn-lg" onClick={()=>{setLoginBusy(true);startLogin()}} disabled={loginBusy} style={{minWidth:278}}>
                {loginBusy?<Spin size={18} color="#fff"/>:I.github}
                {loginBusy?'Redirecting to GitHub…':'Continue with GitHub'}
              </button>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:40}}>
                {[
                  {e:'🔒',t:'Secure Sessions',s:'Refresh token rotation'},
                  {e:'🌿',t:'Exact Structure',s:'All paths preserved'},
                  {e:'⚡',t:'Retry + Backoff',s:'Production-grade upload'},
                ].map(f=>(
                  <div key={f.t} className="card" style={{textAlign:'center',padding:'14px 10px'}}>
                    <div style={{fontSize:22,marginBottom:7}}>{f.e}</div>
                    <div style={{fontSize:13,fontWeight:700}}>{f.t}</div>
                    <div style={{fontSize:11.5,color:'var(--muted)',marginTop:3}}>{f.s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {user&&tab==='history'&&(
            <div className="fu" style={{width:'100%',maxWidth:680}}>
              <div className="stat-grid" style={{marginBottom:20}}>
                {[
                  {label:'Uploads',    val:histStats.total,                     color:'var(--blue)'},
                  {label:'Files',      val:(histStats.files||0).toLocaleString(),color:'var(--green-lt)'},
                  {label:'Data',       val:fmt(histStats.bytes||0),             color:'var(--purple)'},
                ].map(s=>(
                  <div key={s.label} className="stat-card">
                    <div style={{fontSize:24,fontWeight:800,fontFamily:'var(--mono)',color:s.color,letterSpacing:'-.02em'}}>{s.val}</div>
                    <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:14,fontWeight:700}}>Upload History</span>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btn-xs btn-ghost" onClick={loadHistory} disabled={histLoading}>{histLoading?<Spin size={12}/>:I.refresh}</button>
                    {history.length>0&&<button className="btn btn-xs btn-danger" onClick={clearHist}>{I.trash} Clear</button>}
                  </div>
                </div>

                {histLoading?(
                  <div style={{padding:'40px',textAlign:'center',color:'var(--muted)',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
                    <Spin size={22} color="var(--blue)"/><span style={{fontSize:13}}>Loading from Supabase…</span>
                  </div>
                ):history.length===0?(
                  <div style={{padding:'40px',textAlign:'center',color:'var(--muted)'}}>
                    <div style={{fontSize:32,marginBottom:10}}>📂</div>
                    <p style={{fontSize:14,fontWeight:600}}>No uploads yet</p>
                    <p style={{fontSize:13,color:'var(--dim)',marginTop:4}}>History stored securely in Supabase EU</p>
                    <button className="btn btn-primary btn-sm" style={{marginTop:16}} onClick={()=>setTab('upload')}>Start uploading</button>
                  </div>
                ):history.map(h=>(
                  <div key={h.id} className="hist-row">
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,fontFamily:'var(--mono)',color:'var(--blue)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.repo_name||'—'}</div>
                      <div style={{fontSize:11.5,color:'var(--muted)',marginTop:2,display:'flex',gap:8,flexWrap:'wrap'}}>
                        <span>{h.original_name}</span><span>·</span>
                        <span>{h.file_count} files</span><span>·</span>
                        <span>{fmt(h.file_size_bytes)}</span>
                        {h.duration_ms&&<><span>·</span><span>{fmtTime(h.duration_ms)}</span></>}
                      </div>
                    </div>
                    <span style={{fontSize:11.5,color:'var(--dim)',flexShrink:0}}>{fmtDate(h.created_at)}</span>
                    <span className={`badge badge-${h.status==='success'?'green':h.status==='error'?'red':'orange'}`}>{h.status}</span>
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      {h.repo_url&&<a href={h.repo_url} target="_blank" rel="noreferrer" className="btn btn-xs btn-ghost">{I.ext}</a>}
                      <button className="btn btn-xs btn-ghost" onClick={()=>deleteItem(h.id)}>{I.trash}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {user&&tab==='upload'&&(<>

            {/* IDLE */}
            {phase==='idle'&&(
              <div className="fu" style={{width:'100%',maxWidth:580}}>
                {/* Plan bar */}
                <div className="plan-bar">
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span className={`badge ${PLAN_BADGE[user.plan||'free']}`}>{user.plan||'free'}</span>
                    <span style={{fontSize:13,color:'var(--muted)'}}>40 MB · 500 files · 10 uploads/day</span>
                  </div>
                  <span style={{fontSize:12,color:'var(--dim)',fontFamily:'var(--mono)'}}>@{user.login}</span>
                </div>

                {/* Drop zone */}
                <div className={`dz ${dragging?'over':''} ${file?'has-file':''}`}
                  onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
                  onDrop={e=>{e.preventDefault();setDragging(false);pickFile(e.dataTransfer.files[0])}}
                  onClick={()=>!file&&fileRef.current?.click()}
                  onKeyDown={e=>e.key==='Enter'&&!file&&fileRef.current?.click()}
                  tabIndex={0} role="button" style={{cursor:file?'default':'pointer'}}>
                  <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={e=>pickFile(e.target.files?.[0])}/>

                  {!file?(
                    <div className="fi">
                      <div style={{width:58,height:58,background:'var(--surf3)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',color:'var(--muted)'}}>{I.zip}</div>
                      <p style={{fontSize:15.5,fontWeight:600,marginBottom:6}}>Drop your ZIP file here</p>
                      <p style={{fontSize:13.5,color:'var(--muted)',marginBottom:16}}>or click to browse</p>
                      <div style={{display:'flex',gap:7,justifyContent:'center',flexWrap:'wrap'}}>
                        {['.zip only','max 40 MB','up to 500 files','all file types'].map(t=>(
                          <span key={t} style={{background:'var(--surf3)',border:'1px solid var(--border)',color:'var(--muted)',fontSize:11.5,padding:'3px 9px',borderRadius:5,fontFamily:'var(--mono)'}}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ):(
                    <div className="si" style={{textAlign:'center'}}>
                      <div style={{width:54,height:54,background:'var(--green-dim)',borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',border:'1.5px solid rgba(46,160,67,.35)',color:'var(--green-lt)'}}>{I.zip}</div>
                      <p style={{fontSize:15,fontWeight:700,color:'var(--green-lt)',fontFamily:'var(--mono)',marginBottom:5}}>{file.name}</p>
                      <p style={{fontSize:13,color:'var(--muted)',marginBottom:14}}>{fmt(file.size)}</p>
                      <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();setFile(null);setPreview(null)}}>{I.x} Remove</button>
                    </div>
                  )}
                </div>

                {/* ZIP preview */}
                {file&&(
                  <div className="card" style={{marginTop:12,padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <span style={{fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:7}}>{I.folder} ZIP Contents</span>
                      {prevBusy?<Spin size={14} color="var(--muted)"/>:preview&&<span style={{fontSize:12,color:'var(--muted)'}}>{preview.length} files{preview.length===200?' (first 200)':''}</span>}
                    </div>
                    {prevBusy?(
                      <div style={{textAlign:'center',padding:'10px',color:'var(--dim)',fontSize:13}}>Scanning…</div>
                    ):preview?.length>0?(
                      <div style={{maxHeight:170,overflowY:'auto'}}>
                        {preview.slice(0,15).map((f,i)=>(
                          <div key={i} className="preview-row">
                            <span style={{fontFamily:'var(--mono)',color:'var(--text)',display:'flex',alignItems:'center',gap:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {f.name.endsWith('/')?I.folder:I.file}
                              <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{f.name}</span>
                            </span>
                            <span style={{color:'var(--dim)',fontSize:11.5,flexShrink:0,marginLeft:8}}>{fmt(f.size)}</span>
                          </div>
                        ))}
                        {preview.length>15&&<div style={{padding:'7px 0',fontSize:12,color:'var(--dim)',textAlign:'center'}}>+{preview.length-15} more files</div>}
                      </div>
                    ):null}
                  </div>
                )}

                <div style={{marginTop:14,display:'flex',gap:11}}>
                  {!file&&<button className="btn btn-ghost" style={{flex:1}} onClick={()=>fileRef.current?.click()}>{I.upload} Browse</button>}
                  <button className="btn btn-primary btn-lg" style={{flex:1}} disabled={!file||prevBusy} onClick={startUpload}>
                    {I.github} Upload to GitHub
                  </button>
                </div>
                {histStats.total>0&&(
                  <button className="btn btn-ghost btn-sm" style={{width:'100%',marginTop:12,color:'var(--muted)'}} onClick={()=>setTab('history')}>
                    {I.history} {histStats.total} upload{histStats.total!==1?'s':''} in history
                  </button>
                )}
              </div>
            )}

            {/* UPLOADING */}
            {phase==='uploading'&&(
              <div className="fu card" style={{width:'100%',maxWidth:500}}>
                <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
                  <Spin size={22} color="var(--green)"/>
                  <div><p style={{fontWeight:700,fontSize:16}}>Uploading…</p><p style={{fontSize:12.5,color:'var(--muted)',fontFamily:'var(--mono)',marginTop:2}}>{file?.name}</p></div>
                  <span style={{marginLeft:'auto',fontSize:24,fontWeight:800,fontFamily:'var(--mono)',color:'var(--green-lt)'}}>{pct}%</span>
                </div>
                <div className="prog-track"><div className="prog-fill" style={{width:pct+'%'}}/></div>
                <p style={{fontSize:12,color:'var(--muted)',marginTop:8,textAlign:'center',fontFamily:'var(--mono)'}}>
                  {fmt(Math.round((file?.size||0)*pct/100))} / {fmt(file?.size)}
                </p>
              </div>
            )}

            {/* PROCESSING */}
            {phase==='processing'&&(
              <div className="fu" style={{width:'100%',maxWidth:540}}>
                <div className="card" style={{marginBottom:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
                    <Spin size={20} color="var(--green)"/>
                    <div><p style={{fontWeight:700,fontSize:15}}>Processing…</p><p style={{fontSize:13,color:'var(--muted)'}}>{STEPS[stepIdx]}</p></div>
                    {reqStart&&<span style={{marginLeft:'auto',fontSize:12,color:'var(--dim)',fontFamily:'var(--mono)'}}>{fmtTime(Date.now()-reqStart)}</span>}
                  </div>
                  {STEPS.map((label,i)=>(
                    <div key={label} className="step-row">
                      <div className={`sd ${sc(i)}`}>{sc(i)==='d'?I.check:sc(i)==='a'?<Spin size={13} color="var(--green)"/>:sc(i)==='e'?I.x:i+1}</div>
                      <span style={{fontSize:13.5,fontWeight:sc(i)==='a'?600:400,color:sc(i)==='p'?'var(--dim)':'var(--text)'}}>{label}</span>
                      {sc(i)==='d'&&<span style={{marginLeft:'auto',fontSize:11,color:'var(--green-lt)',fontFamily:'var(--mono)'}}>done</span>}
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:'12px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontSize:11,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--green-lt)',fontFamily:'var(--mono)'}}>Output</span>
                    <span className="badge badge-blue" style={{fontSize:10}}>● Live</span>
                  </div>
                  <div className="log-box" ref={logRef}>
                    {logs.map((l,i)=>(
                      <div key={i} className={`ll ${l.type}`}>
                        <span style={{color:'var(--dim)',userSelect:'none',minWidth:18}}>{String(i+1).padStart(2,'0')}</span>
                        <span>{l.msg}</span>
                      </div>
                    ))}
                    <div className="ll dim"><span style={{color:'var(--dim)'}}>›</span><span style={{animation:'pulse 1s infinite'}}>_</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* SUCCESS */}
            {phase==='done'&&result&&(
              <div className="fu" style={{width:'100%',maxWidth:510,textAlign:'center'}}>
                <div style={{width:80,height:80,background:'var(--green-dim)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 22px',border:'2px solid rgba(46,160,67,.4)'}} className="gl">
                  <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--green-lt)" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <h2 style={{fontSize:28,fontWeight:800,letterSpacing:'-.02em',marginBottom:8}}>Upload Complete!</h2>
                <p style={{fontSize:14.5,color:'var(--muted)',marginBottom:24,lineHeight:1.7}}>
                  <strong style={{color:'var(--text)'}}>{result.fileCount}</strong> files → <span style={{color:'var(--blue)',fontFamily:'var(--mono)'}}>{result.owner}/{result.repoName}</span>
                  {result.verified?' · ✓':''}{result.elapsed?` · ${fmtTime(result.elapsed)}`:''}
                </p>

                <div style={{background:'var(--surf3)',border:'1.5px solid var(--border)',borderRadius:9,padding:'12px 14px',marginBottom:18,display:'flex',alignItems:'center',gap:9}}>
                  <span style={{fontSize:12,color:'var(--muted)',flexShrink:0,fontFamily:'var(--mono)'}}>URL</span>
                  <a href={result.repoUrl} target="_blank" rel="noreferrer" style={{flex:1,fontSize:12.5,fontFamily:'var(--mono)',color:'var(--blue)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:'none',textAlign:'left'}}>{result.repoUrl}</a>
                  <button onClick={()=>copyURL(result.repoUrl)} style={{background:'none',border:'none',cursor:'pointer',color:copied?'var(--green-lt)':'var(--muted)',display:'flex',flexShrink:0,transition:'color .2s'}}>{copied?I.check:I.copy}</button>
                </div>

                <div className="card" style={{textAlign:'left',marginBottom:20}}>
                  {[
                    ['Repository',result.owner+'/'+result.repoName],
                    ['Branch',result.branch],
                    ['Files',`${result.fileCount}/${result.expectedCount}${result.verified?' ✓':' ⚠'}${result.skipped?` · ${result.skipped} skipped`:''}`],
                    ['Commit',result.commitSha],
                    ['Size',result.totalSizeKb+' KB'],
                    ...(result.elapsed?[['Time',fmtTime(result.elapsed)]]:[] ),
                    ...(result.failedBlobs?[['Retried',result.failedBlobs+' blobs']]:[] ),
                  ].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',gap:10}}>
                      <span style={{fontSize:13,color:'var(--muted)',flexShrink:0}}>{k}</span>
                      <span style={{fontSize:13,fontFamily:'var(--mono)',textAlign:'right',wordBreak:'break-all'}}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{display:'flex',gap:11,flexWrap:'wrap'}}>
                  <a href={result.repoUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{flex:1}}>{I.ext} View on GitHub</a>
                  <button className="btn btn-ghost" style={{flex:1}} onClick={resetUpload}>{I.upload} Upload Another</button>
                </div>
              </div>
            )}

            {/* FAIL */}
            {phase==='fail'&&(
              <div className="fu" style={{width:'100%',maxWidth:470,textAlign:'center'}}>
                <div style={{width:72,height:72,background:'var(--red-dim)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',border:'2px solid rgba(248,81,73,.3)'}}>
                  <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="var(--red)" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </div>
                <h2 style={{fontSize:24,fontWeight:800,marginBottom:8,color:'var(--red)'}}>Upload Failed</h2>
                <p style={{fontSize:14,color:'var(--muted)',lineHeight:1.7,marginBottom:20}}>{upErr}</p>
                {!user&&<button className="btn btn-github" style={{width:'100%',marginBottom:14}} onClick={()=>{setLoginBusy(true);startLogin()}}>{I.github} Login Again</button>}
                {logs.length>0&&(
                  <div className="card" style={{textAlign:'left',marginBottom:20,padding:'12px 14px',borderColor:'rgba(248,81,73,.25)',background:'var(--red-dim)'}}>
                    <div className="log-box" style={{maxHeight:130}}>
                      {logs.map((l,i)=>(
                        <div key={i} className={`ll ${l.type}`}>
                          <span style={{color:'var(--dim)',userSelect:'none'}}>{String(i+1).padStart(2,'0')}</span>
                          <span>{l.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{display:'flex',gap:11}}>
                  <button className="btn btn-ghost" style={{flex:1}} onClick={resetUpload}>← Start Over</button>
                  {user&&file&&<button className="btn btn-primary" style={{flex:1}} onClick={startUpload}>{I.refresh} Retry</button>}
                </div>
              </div>
            )}
          </>)}

        </main>

        {/* FOOTER */}
        <footer style={{padding:'12px 24px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <span style={{fontSize:12,color:'var(--dim)',fontFamily:'var(--mono)'}}>SebairGit v4.0 · Supabase EU-W2 · Vercel cdg1</span>
          <div style={{display:'flex',gap:20}}>
            {['Privacy','Terms','Docs'].map(l=><span key={l} style={{fontSize:12,color:'var(--dim)',cursor:'pointer'}}>{l}</span>)}
            {user&&<span style={{fontSize:12,color:'var(--dim)',cursor:'pointer',display:'flex',alignItems:'center',gap:5}} onClick={handleLogout}>{I.logout} Sign out</span>}
          </div>
        </footer>
      </div>
    </>
  )
}
