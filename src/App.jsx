import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const DEV_TYPES    = ["Manual", "Assisted"];
const STATUSES     = ["idea", "doing", "completed"];

// ── Arcade CRT palette ─────────────────────────────────────────────────────
const BG        = "#0a0d0a";
const PANEL     = "#10140f";
const BORDER    = "#233024";
const BORDER_HI = "#39ff88";
const TEXT      = "#d7ffe0";
const TEXT_DIM  = "#5c7a63";
const GREEN     = "#39ff88";
const GREEN_DIM = "#1e7a45";
const HOT       = "#ff2ecb";

const DIFF_COLOR = { Easy: "#39ff88", Medium: "#f0c419", Hard: "#ff8b3d", Expert: "#ff4d4d" };
const STATUS_COLOR = { idea: "#5c7a63", doing: "#22d3ee", completed: "#39ff88" };
const PALETTE = ["#39ff88","#0d4d2b","#f0c419","#1e7a45","#2ecc71","#166534","#a8e6b8","#0a3d1f"];

function readableTextColor(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const luminance=(0.299*r+0.587*g+0.114*b)/255;
  return luminance>0.55 ? "#0a0d0a" : "#eafff0";
}

const FONT = "'VT323', monospace";
const FONT_HEAD = "'Press Start 2P', monospace";

// ── SVG Icons ─────────────────────────────────────────────────────────────
const Icon = {
  wheel: (sz=22) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
      <line x1="12" y1="2" x2="12" y2="9.5"/>
      <line x1="12" y1="14.5" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="9.5" y2="12"/>
      <line x1="14.5" y1="12" x2="22" y2="12"/>
    </svg>
  ),
  grid: (sz=18) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  edit: (sz=15) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
    </svg>
  ),
  trash: (sz=15) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  plus: (sz=16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  settings: (sz=16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  signout: (sz=16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  chevronDown: (sz=14) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  chevronUp: (sz=14) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  link: (sz=14) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
};

// ── Wheel logo — blocky pixel-terminal mark ─────────────────────────────────
function WheelLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="1" y="1" width="38" height="38" fill="#0a0d0a" stroke="#39ff88" strokeWidth="2"/>
      <rect x="18" y="6" width="4" height="8" fill="#39ff88"/>
      <rect x="18" y="26" width="4" height="8" fill="#39ff88"/>
      <rect x="6" y="18" width="8" height="4" fill="#39ff88"/>
      <rect x="26" y="18" width="8" height="4" fill="#39ff88"/>
      <rect x="17" y="17" width="6" height="6" fill="#ff2ecb"/>
      <rect x="18" y="2" width="4" height="4" fill="#f0c419"/>
    </svg>
  );
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchAll() {
  const [{ data: projects }, { data: categories }, { data: pc }] = await Promise.all([
    supabase.from("projects").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("project_categories").select("*"),
  ]);
  const catMap = {};
  (pc || []).forEach(({ project_id, category_id }) => {
    if (!catMap[project_id]) catMap[project_id] = [];
    catMap[project_id].push(category_id);
  });
  return {
    projects: (projects || []).map((p) => ({ ...p, categoryIds: catMap[p.id] || [] })),
    categories: categories || [],
  };
}

// ── CRT overlay (scanlines + vignette) ──────────────────────────────────────
function CRTOverlay() {
  return (
    <div style={{
      position:"fixed", inset:0, pointerEvents:"none", zIndex:9999,
      background:"repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
      boxShadow:"inset 0 0 160px rgba(0,0,0,0.7)",
      mixBlendMode:"multiply"
    }}/>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode]   = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState("");
  const [signedUp, setSignedUp] = useState(false);

  async function handleSubmit() {
    setLoading(true); setErr("");
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setErr(error.message); else setSignedUp(true);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", background:BG, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT }}>
      <div style={{ background:PANEL, border:`2px solid ${BORDER}`, padding:"48px 40px", width:420, textAlign:"center" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}><WheelLogo size={56}/></div>
        <h1 style={{ color:GREEN, fontSize:18, fontFamily:FONT_HEAD, margin:"0 0 10px", textShadow:`0 0 6px ${GREEN}` }}>PROJECT WHEEL</h1>
        <p style={{ color:TEXT_DIM, fontSize:21, margin:"0 0 30px" }}>&gt; pick what to build next</p>
        {signedUp ? (
          <p style={{ color:GREEN, fontSize:21 }}>Account created — check your email to confirm, then sign in.</p>
        ) : (
          <>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", background:BG, border:`1px solid ${BORDER}`, color:TEXT, fontSize:20, fontFamily:FONT, outline:"none", marginBottom:12 }}
            />
            <input type="password" placeholder="password" value={password}
              onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key==="Enter" && handleSubmit()}
              style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", background:BG, border:`1px solid ${BORDER}`, color:TEXT, fontSize:20, fontFamily:FONT, outline:"none", marginBottom:12 }}
            />
            {err && <p style={{ color:"#ff4d4d", fontSize:17, marginBottom:10 }}>{err}</p>}
            <button onClick={handleSubmit} disabled={loading||!email||!password}
              style={{ width:"100%", padding:"13px", background:GREEN, border:"none", color:"#0a0d0a", fontSize:16, fontFamily:FONT_HEAD, cursor:"pointer", opacity:loading||!email||!password?0.5:1, marginBottom:18 }}>
              {loading ? "..." : mode==="signin" ? "SIGN IN" : "CREATE ACCOUNT"}
            </button>
            <button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setErr("");}}
              style={{ background:"none", border:"none", color:TEXT_DIM, fontSize:18, fontFamily:FONT, cursor:"pointer", textDecoration:"underline" }}>
              {mode==="signin" ? "need an account? sign up" : "already have an account? sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Spin Wheel ────────────────────────────────────────────────────────────────
function SpinWheel({ projects, onResult }) {
  const canvasRef    = useRef(null);
  const wrapRef      = useRef(null);
  const spinRef      = useRef({ angle: 0, spinning: false });
  const rafRef       = useRef(null);
  const projectsRef  = useRef(projects);
  const staticRef    = useRef(null);

  useEffect(() => {
    projectsRef.current = projects;
    const s = canvasRef.current?.width || 600;
    buildStatic(projects, s);
    drawFrame(spinRef.current.angle, s);
  }, [projects]);

  function buildStatic(ps, size) {
    const off = new OffscreenCanvas(size, size);
    const ctx = off.getContext("2d");
    const cx = size/2, cy = size/2, r = cx - 14;
    if (!ps.length) {
      ctx.fillStyle=PANEL; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      staticRef.current = off; return;
    }
    const slice = (Math.PI*2)/ps.length;
    ps.forEach((p,i) => {
      const s2=i*slice, e=s2+slice;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s2,e); ctx.closePath();
      ctx.fillStyle=PALETTE[i%PALETTE.length]; ctx.fill();
      ctx.strokeStyle="#0a0d0a"; ctx.lineWidth=3; ctx.stroke();
      const mid=s2+slice/2;
      const maxLen=Math.max(4,Math.min(20,Math.floor((r*0.72*slice)/7)));
      const label=p.name.length>maxLen?p.name.slice(0,maxLen-1)+"…":p.name;
      const fs=ps.length>40?12:ps.length>20?14:ps.length>10?16:19;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid);
      ctx.textAlign="right"; ctx.fillStyle=readableTextColor(PALETTE[i%PALETTE.length]);
      ctx.font=`${fs}px 'VT323',monospace`; ctx.fillText(label,r-14,fs*0.38);
      ctx.restore();
    });
    staticRef.current = off;
  }

  function drawFrame(angle, size) {
    const canvas=canvasRef.current; if(!canvas||!staticRef.current) return;
    const ctx=canvas.getContext("2d"); const cx=size/2,cy=size/2,r=cx-14;
    ctx.clearRect(0,0,size,size);
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle); ctx.translate(-cx,-cy);
    ctx.drawImage(staticRef.current,0,0); ctx.restore();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.lineWidth=4; ctx.strokeStyle=GREEN; ctx.stroke();
    if(!projectsRef.current.length) {
      ctx.fillStyle=TEXT_DIM; ctx.font="18px 'VT323',monospace";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("no projects match filters",cx,cy+55);
    }
    ctx.beginPath(); ctx.arc(cx,cy,24,0,Math.PI*2);
    ctx.fillStyle="#0a0d0a"; ctx.fill();
    ctx.lineWidth=3; ctx.strokeStyle=GREEN; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2);
    ctx.fillStyle=GREEN; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx,cy-r-6); ctx.lineTo(cx-14,cy-r+18); ctx.lineTo(cx+14,cy-r+18);
    ctx.closePath(); ctx.fillStyle=HOT; ctx.fill();
  }

  function spin() {
    if(spinRef.current.spinning||!projectsRef.current.length) return;
    const size=canvasRef.current?.width||600;
    const duration=3000+Math.random()*2000;
    const delta=(6+Math.floor(Math.random()*4))*Math.PI*2+Math.random()*Math.PI*2;
    const startAngle=spinRef.current.angle, startTime=performance.now();
    spinRef.current.spinning=true;
    function easeOut(t){return 1-Math.pow(1-t,3);}
    function tick(now) {
      const t=Math.min((now-startTime)/duration,1);
      spinRef.current.angle=startAngle+delta*easeOut(t);
      drawFrame(spinRef.current.angle,size);
      if(t<1){rafRef.current=requestAnimationFrame(tick);}
      else{
        spinRef.current.spinning=false;
        const ps=projectsRef.current, slice=(Math.PI*2)/ps.length;
        const pointerAngle=-Math.PI/2;
        let norm=(pointerAngle-spinRef.current.angle)%(Math.PI*2);
        norm=(norm+Math.PI*2)%(Math.PI*2);
        onResult(ps[Math.floor(norm/slice)%ps.length]);
      }
    }
    rafRef.current=requestAnimationFrame(tick);
  }

  useEffect(()=>()=>cancelAnimationFrame(rafRef.current),[]);

  useEffect(()=>{
    function resize(){
      if(!wrapRef.current||!canvasRef.current) return;
      const w=wrapRef.current.clientWidth;
      const h=wrapRef.current.clientHeight;
      const s=Math.max(280,Math.min(w, h, 760));
      canvasRef.current.width=s; canvasRef.current.height=s;
      buildStatic(projectsRef.current,s);
      drawFrame(spinRef.current.angle,s);
    }
    resize();
    const ro=new ResizeObserver(resize);
    if(wrapRef.current) ro.observe(wrapRef.current);
    return ()=>ro.disconnect();
  },[]);

  return (
    <div ref={wrapRef} style={{ flex:"1 1 auto", minHeight:0, width:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:32 }}>
      <canvas ref={canvasRef} onClick={spin}
        style={{ cursor:"pointer", filter:`drop-shadow(0 0 10px ${GREEN}44)`, maxWidth:"100%", maxHeight:"100%", flexShrink:1, minHeight:0 }}
      />
      <button onClick={spin} style={{
        padding:"18px 68px", background:GREEN, border:"none",
        color:"#0a0d0a", fontSize:18, fontFamily:FONT_HEAD, cursor:"pointer",
        boxShadow:`0 0 20px ${GREEN}55`, letterSpacing:1,
        flexShrink:0
      }}>SPIN</button>
    </div>
  );
}

// ── Result Modal ──────────────────────────────────────────────────────────────
function ResultModal({ project, categories, onAccept, onReroll, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const catNames=(project.categoryIds||[]).map(id=>categories.find(c=>c.id===id)?.name).filter(Boolean);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }} onClick={onClose}>
      <div style={{ background:PANEL,border:`2px solid ${GREEN}`,padding:"36px 36px 32px",width:520,boxShadow:`0 0 40px ${GREEN}33` }} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>setExpanded(!expanded)} style={{ width:"100%",background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"left",marginBottom:14 }}>
          <h2 style={{ color:GREEN,fontSize:24,fontFamily:FONT,margin:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,lineHeight:1.2 }}>
            {project.name}
            <span style={{ color:TEXT_DIM,flexShrink:0 }}>{expanded?Icon.chevronUp(20):Icon.chevronDown(20)}</span>
          </h2>
        </button>
        {expanded && (
          <p style={{ color:TEXT_DIM,fontSize:20,lineHeight:1.5,margin:"0 0 18px" }}>
            {project.description||"no description yet."}
          </p>
        )}
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:28 }}>
          <Badge color={DIFF_COLOR[project.difficulty]}>{project.difficulty}</Badge>
          <Badge color={TEXT_DIM}>{project.dev_type}</Badge>
          {catNames.map(c=><Badge key={c} color={TEXT_DIM}>{c}</Badge>)}
        </div>
        <div style={{ display:"flex",gap:12 }}>
          <button onClick={onAccept} style={{ flex:1,padding:"14px",background:GREEN,border:"none",color:"#0a0d0a",fontSize:16,fontFamily:FONT_HEAD,cursor:"pointer" }}>
            ACCEPT
          </button>
          <button onClick={onReroll} style={{ flex:1,padding:"14px",background:"none",border:`1px solid ${BORDER}`,color:TEXT_DIM,fontSize:16,fontFamily:FONT_HEAD,cursor:"pointer" }}>
            REROLL
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{ padding:"4px 12px",fontSize:17,fontFamily:FONT,border:`1px solid ${color}`,color }}>
      {children}
    </span>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, categories, onEdit, onDelete }) {
  const catNames=(project.categoryIds||[]).map(id=>categories.find(c=>c.id===id)?.name).filter(Boolean);
  return (
    <div style={{ background:PANEL,borderLeft:`4px solid ${DIFF_COLOR[project.difficulty]}`,border:`1px solid ${BORDER}`,borderLeftWidth:4,borderLeftColor:DIFF_COLOR[project.difficulty],padding:"20px 22px",display:"flex",flexDirection:"column",gap:12 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <h3 style={{ color:TEXT,fontSize:21,fontFamily:FONT,fontWeight:400,margin:0,lineHeight:1.3 }}>{project.name}</h3>
        <div style={{ display:"flex",gap:4,flexShrink:0,marginLeft:10 }}>
          <IconBtn onClick={()=>onEdit(project)}>{Icon.edit(17)}</IconBtn>
          <IconBtn onClick={()=>onDelete(project.id)}>{Icon.trash(17)}</IconBtn>
        </div>
      </div>
      {project.description && (
        <p style={{ color:TEXT_DIM,fontSize:18,margin:0,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
          {project.description}
        </p>
      )}
      <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
        <Badge color={STATUS_COLOR[project.status]}>{project.status}</Badge>
        <Badge color={DIFF_COLOR[project.difficulty]}>{project.difficulty}</Badge>
        <Badge color={TEXT_DIM}>{project.dev_type}</Badge>
        {catNames.map(c=><Badge key={c} color={TEXT_DIM}>{c}</Badge>)}
      </div>
      {project.status==="completed"&&project.link&&(
        <a href={project.link} target="_blank" rel="noreferrer"
          style={{ color:GREEN,fontSize:18,display:"flex",alignItems:"center",gap:6,textDecoration:"none",fontFamily:FONT }}>
          {Icon.link(16)} view project
        </a>
      )}
    </div>
  );
}

function IconBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ background:"none",border:"none",cursor:"pointer",padding:"5px 7px",color:TEXT_DIM,display:"flex",alignItems:"center" }}
      onMouseEnter={e=>e.currentTarget.style.color=GREEN}
      onMouseLeave={e=>e.currentTarget.style.color=TEXT_DIM}>
      {children}
    </button>
  );
}

// ── Project Form ──────────────────────────────────────────────────────────────
function ProjectFormModal({ project, categories, onSave, onClose }) {
  const [form, setForm]=useState(project||{ name:"",description:"",difficulty:"Medium",dev_type:"Assisted",status:"idea",link:"",categoryIds:[] });
  const [loading,setLoading]=useState(false);
  function set(k,v){setForm(f=>({...f,[k]:v}));}
  function toggleCat(id){setForm(f=>({...f,categoryIds:f.categoryIds.includes(id)?f.categoryIds.filter(c=>c!==id):[...f.categoryIds,id]}));}
  async function handleSave(){if(!form.name.trim())return;setLoading(true);await onSave(form);setLoading(false);}
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20 }} onClick={onClose}>
      <div style={{ background:PANEL,border:`2px solid ${BORDER}`,padding:34,width:560,maxHeight:"90vh",overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ color:GREEN,fontSize:16,fontFamily:FONT_HEAD,margin:"0 0 26px" }}>
          {project?.id?"EDIT PROJECT":"ADD PROJECT"}
        </h2>
        <div style={{ display:"flex",flexDirection:"column",gap:18 }}>
          <Field label="name"><input value={form.name} onChange={e=>set("name",e.target.value)} style={inputStyle}/></Field>
          <Field label="description"><textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={3} style={{...inputStyle,resize:"vertical"}}/></Field>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14 }}>
            <Field label="difficulty">
              <SelectField value={form.difficulty} onChange={e=>set("difficulty",e.target.value)} options={DIFFICULTIES}/>
            </Field>
            <Field label="dev type">
              <SelectField value={form.dev_type} onChange={e=>set("dev_type",e.target.value)} options={DEV_TYPES}/>
            </Field>
            <Field label="status">
              <SelectField value={form.status} onChange={e=>set("status",e.target.value)} options={STATUSES}/>
            </Field>
          </div>
          {form.status==="completed"&&(
            <Field label="project link"><input value={form.link||""} onChange={e=>set("link",e.target.value)} style={inputStyle} placeholder="https://…"/></Field>
          )}
          <Field label="categories">
            <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:4 }}>
              {categories.map(c=>{
                const active=form.categoryIds.includes(c.id);
                return(
                  <button key={c.id} onClick={()=>toggleCat(c.id)} style={{
                    padding:"6px 14px",fontSize:17,fontFamily:FONT,cursor:"pointer",
                    border:active?`1px solid ${GREEN}`:`1px solid ${BORDER}`,
                    background:active?`${GREEN}18`:"none",
                    color:active?GREEN:TEXT_DIM,
                  }}>{c.name}</button>
                );
              })}
            </div>
          </Field>
        </div>
        <div style={{ display:"flex",gap:12,marginTop:28 }}>
          <button onClick={handleSave} disabled={loading||!form.name.trim()}
            style={{ flex:1,padding:"14px",background:GREEN,border:"none",color:"#0a0d0a",fontSize:16,fontFamily:FONT_HEAD,cursor:"pointer",opacity:loading||!form.name.trim()?0.5:1 }}>
            {loading?"SAVING...":"SAVE"}
          </button>
          <button onClick={onClose} style={{ padding:"14px 22px",background:"none",border:`1px solid ${BORDER}`,color:TEXT_DIM,fontSize:16,fontFamily:FONT_HEAD,cursor:"pointer" }}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ color:TEXT_DIM,fontSize:16,fontFamily:FONT,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5 }}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <div style={{ position:"relative" }}>
      <select value={value} onChange={onChange} style={{...inputStyle,appearance:"none",WebkitAppearance:"none",MozAppearance:"none",paddingRight:36,cursor:"pointer"}}>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
      <span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:TEXT_DIM,pointerEvents:"none",display:"flex" }}>
        {Icon.chevronDown(15)}
      </span>
    </div>
  );
}

const inputStyle = {
  width:"100%",boxSizing:"border-box",padding:"11px 14px",background:BG,
  border:`1px solid ${BORDER}`,color:TEXT,fontSize:19,outline:"none",fontFamily:FONT
};

// ── Category Manager ──────────────────────────────────────────────────────────
function CategoryManager({ categories, projects, onAdd, onRename, onDelete, onClose }) {
  const [newName,setNewName]=useState("");
  const [editing,setEditing]=useState(null);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }} onClick={onClose}>
      <div style={{ background:PANEL,border:`2px solid ${BORDER}`,padding:34,width:520 }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ color:GREEN,fontSize:16,fontFamily:FONT_HEAD,margin:"0 0 24px" }}>MANAGE CATEGORIES</h2>
        <div style={{ display:"flex",gap:10,marginBottom:20 }}>
          <input value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newName.trim()){onAdd(newName.trim());setNewName("");}}}
            placeholder="new category name" style={{...inputStyle,flex:1}}/>
          <button onClick={()=>{if(newName.trim()){onAdd(newName.trim());setNewName("");}}}
            style={{ padding:"11px 20px",background:GREEN,border:"none",color:"#0a0d0a",cursor:"pointer",fontSize:15,fontFamily:FONT_HEAD }}>
            ADD
          </button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:380,overflowY:"auto" }}>
          {categories.map(c=>{
            const count=projects.filter(p=>p.categoryIds.includes(c.id)).length;
            return(
              <div key={c.id} style={{ display:"flex",alignItems:"center",gap:8,background:BG,border:`1px solid ${BORDER}`,padding:"12px 14px" }}>
                {editing===c.id?(
                  <input autoFocus defaultValue={c.name}
                    onBlur={e=>{onRename(c.id,e.target.value);setEditing(null);}}
                    onKeyDown={e=>{if(e.key==="Enter"){onRename(c.id,e.target.value);setEditing(null);}}}
                    style={{...inputStyle,flex:1,padding:"6px 10px",fontSize:17}}/>
                ):(
                  <span style={{ flex:1,color:TEXT,fontSize:19,fontFamily:FONT }}>
                    {c.name}<span style={{ color:TEXT_DIM,fontSize:16,marginLeft:10 }}>{count} projects</span>
                  </span>
                )}
                <IconBtn onClick={()=>setEditing(c.id)}>{Icon.edit()}</IconBtn>
                <IconBtn onClick={()=>onDelete(c.id)}>{Icon.trash()}</IconBtn>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Filter ────────────────────────────────────────────────────────────
function MultiFilter({ label, options, selected, onChange, colorMap }) {
  const all=selected.length===0;
  return (
    <div style={{ marginBottom:22 }}>
      <p style={{ color:TEXT_DIM,fontSize:15,fontFamily:FONT,margin:"0 0 8px",letterSpacing:1,textTransform:"uppercase" }}>{label}</p>
      <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
        <FilterBtn active={all} color={GREEN} onClick={()=>onChange([])}>all</FilterBtn>
        {options.map(o=>{
          const active=selected.includes(o);
          const color=colorMap?colorMap[o]:GREEN;
          return(
            <FilterBtn key={o} active={active} color={color}
              onClick={()=>onChange(active?selected.filter(x=>x!==o):[...selected,o])}>
              {active&&<span style={{ width:6,height:6,background:color,display:"inline-block",flexShrink:0 }}/>}
              {o}
            </FilterBtn>
          );
        })}
      </div>
    </div>
  );
}

function FilterBtn({ active, color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background:active?`${color}18`:"none",border:"none",
      color:active?color:TEXT_DIM,textAlign:"left",padding:"7px 10px",
      cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",gap:7,
      fontFamily:FONT
    }}>{children}</button>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session,setSession]=useState(null);
  const [authChecked,setAuthChecked]=useState(false);
  const [projects,setProjects]=useState([]);
  const [categories,setCategories]=useState([]);
  const [view,setView]=useState("wheel");
  const [search,setSearch]=useState("");
  const [filterCats,setFilterCats]=useState([]);
  const [filterDiffs,setFilterDiffs]=useState([]);
  const [filterDevTypes,setFilterDevTypes]=useState([]);
  const [filterStatuses,setFilterStatuses]=useState([]);
  const [result,setResult]=useState(null);
  const [editProject,setEditProject]=useState(null);
  const [showCatManager,setShowCatManager]=useState(false);
  const [showAddProject,setShowAddProject]=useState(false);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setAuthChecked(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  const load=useCallback(async()=>{
    const data=await fetchAll();setProjects(data.projects);setCategories(data.categories);
  },[]);

  useEffect(()=>{if(session)load();},[session]);

  const filtered=projects.filter(p=>{
    if(filterCats.length){
      const ids=categories.filter(c=>filterCats.includes(c.name)).map(c=>c.id);
      if(!ids.some(id=>p.categoryIds.includes(id))) return false;
    }
    if(filterDiffs.length&&!filterDiffs.includes(p.difficulty)) return false;
    if(filterDevTypes.length&&!filterDevTypes.includes(p.dev_type)) return false;
    if(filterStatuses.length&&!filterStatuses.includes(p.status)) return false;
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase())&&!(p.description||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function saveProject(form){
    const {categoryIds,...fields}=form;
    if(!fields.link||fields.status!=="completed") fields.link=null;
    if(fields.id){
      await supabase.from("projects").update(fields).eq("id",fields.id);
      await supabase.from("project_categories").delete().eq("project_id",fields.id);
    } else {
      const {data}=await supabase.from("projects").insert(fields).select().single();
      fields.id=data.id;
    }
    if(categoryIds?.length) await supabase.from("project_categories").insert(categoryIds.map(cid=>({project_id:fields.id,category_id:cid})));
    setEditProject(null);setShowAddProject(false);load();
  }

  async function deleteProject(id){if(!confirm("Delete this project?"))return;await supabase.from("projects").delete().eq("id",id);load();}
  async function acceptResult(p){await supabase.from("projects").update({status:"doing"}).eq("id",p.id);setResult(null);load();}
  async function addCategory(name){await supabase.from("categories").insert({name});load();}
  async function renameCategory(id,name){await supabase.from("categories").update({name}).eq("id",id);load();}
  async function deleteCategory(id){
    if(!confirm("Remove this category? Projects won't be deleted."))return;
    await supabase.from("project_categories").delete().eq("category_id",id);
    await supabase.from("categories").delete().eq("id",id);load();
  }

  if(!authChecked) return null;
  if(!session) return <AuthScreen/>;

  const SW=290;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
        *{box-sizing:border-box;}
        html,body,#root{margin:0;height:100%;background:#0a0d0a;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#233024;}
        select option{background:#10140f;}
        body,input,select,textarea,button{letter-spacing:0.4px;}
        button{font-family:'VT323',monospace;}
      `}</style>

      <CRTOverlay/>

      <div style={{ display:"flex",height:"100vh",fontFamily:FONT,overflow:"hidden" }}>

        {/* Sidebar */}
        <aside style={{ width:SW,background:PANEL,borderRight:`1px solid ${BORDER}`,padding:"28px 18px",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:4 }}>
            <WheelLogo size={34}/>
            <span style={{ color:GREEN,fontWeight:400,fontSize:14,fontFamily:FONT_HEAD,textShadow:`0 0 4px ${GREEN}` }}>PROJECT WHEEL</span>
          </div>
          <p style={{ color:TEXT_DIM,fontSize:17,margin:"0 0 26px 44px" }}>{projects.length} projects</p>

          {/* Nav */}
          <div style={{ display:"flex",flexDirection:"column",gap:4,marginBottom:26 }}>
            {[["wheel",Icon.wheel(18),"spin the wheel"],["projects",Icon.grid(17),"browse projects"]].map(([v,icon,label])=>(
              <button key={v} onClick={()=>setView(v)} style={{
                display:"flex",alignItems:"center",gap:10,padding:"11px 14px",border:"none",cursor:"pointer",fontSize:18,textAlign:"left",
                background:view===v?`${GREEN}18`:"none",
                color:view===v?GREEN:TEXT_DIM,fontFamily:FONT,
              }}>
                <span style={{ opacity: view===v?1:0.6 }}>{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ borderTop:`1px solid ${BORDER}`,paddingTop:20 }}>
            <MultiFilter label="category" options={categories.map(c=>c.name)} selected={filterCats} onChange={setFilterCats}/>
            <MultiFilter label="difficulty" options={DIFFICULTIES} selected={filterDiffs} onChange={setFilterDiffs} colorMap={DIFF_COLOR}/>
            <MultiFilter label="dev type" options={DEV_TYPES} selected={filterDevTypes} onChange={setFilterDevTypes}/>
            <MultiFilter label="status" options={STATUSES} selected={filterStatuses} onChange={setFilterStatuses} colorMap={STATUS_COLOR}/>
          </div>

          {/* Bottom actions */}
          <div style={{ marginTop:"auto",paddingTop:18,borderTop:`1px solid ${BORDER}`,display:"flex",flexDirection:"column",gap:8 }}>
            <button onClick={()=>setShowCatManager(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 14px",background:"none",border:`1px solid ${BORDER}`,color:TEXT_DIM,fontSize:18,fontFamily:FONT,cursor:"pointer" }}>
              {Icon.settings(16)} manage categories
            </button>
            <button onClick={()=>supabase.auth.signOut()} style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 14px",background:"none",border:"none",color:TEXT_DIM,fontSize:18,fontFamily:FONT,cursor:"pointer" }}>
              {Icon.signout(16)} sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0 }}>

          {view==="wheel"&&(
            <div style={{ flex:1,minHeight:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 40px",gap:22,overflow:"hidden" }}>
              <div style={{ textAlign:"center",flexShrink:0 }}>
                <h1 style={{ color:GREEN,fontSize:20,fontFamily:FONT_HEAD,margin:"0 0 10px",textShadow:`0 0 6px ${GREEN}`,lineHeight:1.5 }}>
                  WHAT SHOULD YOU BUILD NEXT?
                </h1>
                <p style={{ color:TEXT_DIM,fontSize:19,margin:0 }}>
                  {filtered.length} projects in the pool
                </p>
              </div>
              <SpinWheel projects={filtered} onResult={p=>setResult(p)}/>
            </div>
          )}

          {view==="projects"&&(
            <div style={{ flex:1,overflowY:"auto",padding:"32px 40px" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26 }}>
                <div>
                  <h1 style={{ color:GREEN,fontSize:17,fontFamily:FONT_HEAD,margin:"0 0 8px",textShadow:`0 0 4px ${GREEN}` }}>PROJECTS</h1>
                  <p style={{ color:TEXT_DIM,fontSize:18,margin:0 }}>showing {filtered.length} of {projects.length}</p>
                </div>
                <div style={{ display:"flex",gap:12 }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="search…"
                    style={{...inputStyle,width:220}}/>
                  <button onClick={()=>setShowAddProject(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 18px",background:GREEN,border:"none",color:"#0a0d0a",fontSize:15,fontFamily:FONT_HEAD,cursor:"pointer",whiteSpace:"nowrap" }}>
                    {Icon.plus(15)} ADD
                  </button>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))",gap:14 }}>
                {filtered.map(p=>(
                  <ProjectCard key={p.id} project={p} categories={categories} onEdit={setEditProject} onDelete={deleteProject}/>
                ))}
                {filtered.length===0&&(
                  <p style={{ color:TEXT_DIM,gridColumn:"1/-1",fontSize:19 }}>no projects match. adjust your filters.</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {result&&<ResultModal project={result} categories={categories} onAccept={()=>acceptResult(result)} onReroll={()=>setResult(null)} onClose={()=>setResult(null)}/>}
      {(editProject||showAddProject)&&<ProjectFormModal project={editProject} categories={categories} onSave={saveProject} onClose={()=>{setEditProject(null);setShowAddProject(false);}}/>}
      {showCatManager&&<CategoryManager categories={categories} projects={projects} onAdd={addCategory} onRename={renameCategory} onDelete={deleteCategory} onClose={()=>setShowCatManager(false)}/>}
    </>
  );
}