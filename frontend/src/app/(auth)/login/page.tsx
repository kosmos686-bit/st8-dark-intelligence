'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setToken, setUser } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600)
    return () => clearTimeout(t)
  }, [])

  function enter() {
    setLoading(true)
    setToken('demo_token_st8dark_2026')
    setUser({
      id: 'demo-1',
      name: 'Алексей Гагарин',
      email: 'admin@st8.ai',
      phone: null,
      role: 'store_operator',
      store_id: 'store-1',
      client_id: null,
    })
    setTimeout(() => router.push('/dashboard'), 400)
  }

  return (
    <>
      <style>{`
        @keyframes bgPulse {
          0%,100% { opacity:.6; transform:scale(1) translate(0,0); }
          50%      { opacity:.9; transform:scale(1.15) translate(-2%,2%); }
        }
        @keyframes bgPulse2 {
          0%,100% { opacity:.4; transform:scale(1) translate(0,0); }
          50%      { opacity:.7; transform:scale(1.2) translate(3%,-3%); }
        }
        @keyframes float {
          0%,100% { transform:translateY(0px); }
          50%      { transform:translateY(-14px); }
        }
        @keyframes logoGlow {
          0%,100% { filter:drop-shadow(0 0 24px rgba(212,160,23,.6)) drop-shadow(0 0 60px rgba(212,160,23,.2)); }
          50%      { filter:drop-shadow(0 0 40px rgba(212,160,23,.9)) drop-shadow(0 0 100px rgba(212,160,23,.4)); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(32px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes lineGrow {
          from { width:0; }
          to   { width:80px; }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

        .logo-float { animation:float 5s ease-in-out infinite; }
        .logo-glow  { animation:logoGlow 3s ease-in-out infinite; }
        .card-in    { animation:fadeUp .8s ease-out both; }
        .line-grow  { animation:lineGrow 1.2s ease-out .4s both; }
        .dots span  { animation:pulse 1.4s ease-in-out infinite; }
        .dots span:nth-child(2) { animation-delay:.2s; }
        .dots span:nth-child(3) { animation-delay:.4s; }

        .enter-btn {
          background: linear-gradient(135deg,#D4A017,#F59E0B);
          transition: all .25s ease;
          border: none; cursor: pointer;
        }
        .enter-btn:hover { filter:brightness(1.12); transform:translateY(-2px) scale(1.02); }
        .enter-btn:active { transform:translateY(0) scale(1); }

        .grid-bg {
          background-image:
            linear-gradient(rgba(212,160,23,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,160,23,.035) 1px, transparent 1px);
          background-size:60px 60px;
        }
      `}</style>

      <div className="grid-bg" style={{
        minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'#060A12', position:'relative', overflow:'hidden',
      }}>
        {/* Ambient blobs */}
        <div style={{
          position:'absolute', top:'-20%', left:'-15%',
          width:'60vw', height:'60vw', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(212,160,23,.16) 0%, transparent 70%)',
          animation:'bgPulse 9s ease-in-out infinite', pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', bottom:'-25%', right:'-10%',
          width:'65vw', height:'65vw', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(139,92,246,.12) 0%, transparent 70%)',
          animation:'bgPulse2 11s ease-in-out infinite', pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', top:'45%', right:'18%',
          width:'35vw', height:'35vw', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(6,182,212,.07) 0%, transparent 70%)',
          animation:'bgPulse 13s ease-in-out infinite reverse', pointerEvents:'none',
        }}/>

        {/* Main card */}
        <div className="card-in" style={{
          display:'flex', flexDirection:'column', alignItems:'center',
          position:'relative', zIndex:10, padding:'0 24px',
          opacity: ready ? 1 : 0, transition:'opacity .4s ease',
        }}>
          {/* Logo */}
          <div className="logo-float logo-glow" style={{ marginBottom:8 }}>
            <img src="/logo.svg" alt="ST8" style={{ height:80, width:'auto', display:'block' }}/>
          </div>

          {/* Tagline */}
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'16px 0 8px' }}>
            <div className="line-grow" style={{ height:1, background:'rgba(212,160,23,.3)' }}/>
            <p style={{
              fontSize:10, letterSpacing:'0.35em', textTransform:'uppercase',
              color:'rgba(212,160,23,.5)', margin:0, whiteSpace:'nowrap',
            }}>
              Dark Intelligence Platform
            </p>
            <div className="line-grow" style={{ height:1, background:'rgba(212,160,23,.3)' }}/>
          </div>

          {/* Version badge */}
          <div style={{
            marginBottom:52, padding:'4px 14px', borderRadius:20,
            background:'rgba(212,160,23,.08)', border:'1px solid rgba(212,160,23,.15)',
            fontSize:10, letterSpacing:'0.2em', color:'rgba(212,160,23,.4)',
          }}>
            v2.0 · 2026
          </div>

          {/* Stats row */}
          <div style={{
            display:'flex', gap:1, marginBottom:48,
          }}>
            {[
              { label:'ЗАКАЗОВ', value:'2 841' },
              { label:'ТОЧНОСТЬ', value:'98.7%' },
              { label:'ВРЕМЯ СБ.', value:'4.2 мин' },
            ].map((s, i) => (
              <div key={i} style={{
                padding:'14px 24px', textAlign:'center',
                background: i===1 ? 'rgba(212,160,23,.06)' : 'rgba(17,24,39,.6)',
                border:'1px solid rgba(212,160,23,.1)',
                borderRadius: i===0 ? '12px 0 0 12px' : i===2 ? '0 12px 12px 0' : '0',
              }}>
                <div style={{ fontSize:20, fontWeight:800, color:'#D4A017', letterSpacing:'0.02em' }}>
                  {s.value}
                </div>
                <div style={{ fontSize:9, letterSpacing:'0.2em', color:'#475569', marginTop:2 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Enter button */}
          <button
            className="enter-btn"
            onClick={enter}
            disabled={loading}
            style={{
              width:280, padding:'16px 32px', borderRadius:16,
              fontSize:15, fontWeight:700, letterSpacing:'0.08em',
              color:'#060A12', display:'flex', alignItems:'center',
              justifyContent:'center', gap:10,
              opacity: loading ? .7 : 1,
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width:16, height:16, border:'2px solid #92400e',
                  borderTopColor:'#060A12', borderRadius:'50%',
                  display:'inline-block', animation:'spin .7s linear infinite',
                }}/>
                Загрузка…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Войти в систему
              </>
            )}
          </button>

          {/* Live indicator */}
          <div style={{
            marginTop:24, display:'flex', alignItems:'center', gap:6,
            fontSize:10, color:'#334155', letterSpacing:'0.1em',
          }}>
            <span style={{
              width:6, height:6, borderRadius:'50%', background:'#10B981',
              boxShadow:'0 0 6px #10B981', flexShrink:0,
              animation:'pulse 2s ease-in-out infinite',
            }}/>
            СИСТЕМА АКТИВНА
          </div>
        </div>
      </div>
    </>
  )
}
