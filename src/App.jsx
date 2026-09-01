import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const DEV_TYPES    = ["Manual", "Assisted"];
const STATUSES     = ["idea", "doing", "completed"];

const DIFF_COLOR = { Easy: "#4ade80", Medium: "#f0b429", Hard: "#fb923c", Expert: "#f87171" };
const STATUS_COLOR = { idea: "#6b7280", doing: "#7c5cfc", completed: "#4ade80" };
const PALETTE = ["#7c5cfc","#5b4cdc","#6d4fc9","#4a3ab8","#8b6ffd","#9c7fff","#6040e0","#7755ee"];

// ── SVG Icons (no emojis) ─────────────────────────────────────────────────────
const Icon = {
  wheel: (sz=22) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
      <line x1="12" y1="2" x2="12" y2="9.5"/>
      <line x1="12" y1="14.5" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="9.5" y2="12"/>
      <line x1="14.5" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="4.22" x2="9.64" y2="9.64"/>
      <line x1="14.36" y1="14.36" x2="19.78" y2="19.78"/>
      <line x1="19.78" y1="4.22" x2="14.36" y2="9.64"/>
      <line x1="9.64" y1="14.36" x2="4.22" y2="19.78"/>
    </svg>
  ),
  grid: (sz=18) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  edit: (sz=15) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
    </svg>
  ),
  trash: (sz=15) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  plus: (sz=16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  settings: (sz=16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  signout: (sz=16) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  chevronDown: (sz=14) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  chevronUp: (sz=14) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ),
  link: (sz=14) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
};

// ── Wheel SVG Logo ────────────────────────────────────────────────────────────
function WheelLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18" fill="#7c5cfc" opacity="0.15"/>
      <circle cx="20" cy="20" r="18" stroke="#7c5cfc" strokeWidth="2"/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x2 = 20 + Math.cos(rad) * 13;
        const y2 = 20 + Math.sin(rad) * 13;
        return <line key={i} x1="20" y1="20" x2={x2} y2={y2} stroke="#7c5cfc" strokeWidth="1.5" strokeLinecap="round"/>;
      })}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x = 20 + Math.cos(rad) * 14.5;
        const y = 20 + Math.sin(rad) * 14.5;
        return <circle key={i} cx={x} cy={y} r="1.8" fill="#9c7fff"/>;
      })}
      <polygon points="20,2 17,8 23,8" fill="#f0b429"/>
      <circle cx="20" cy="20" r="3.5" fill="#7c5cfc"/>
      <circle cx="20" cy="20" r="1.8" fill="#fff"/>
    </svg>
  );
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
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

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode]   = useState("signin"); // "signin" | "signup"
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
    <div style={{ minHeight:"100vh", background:"#0f1117", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <div style={{ background:"#161b27", border:"1px solid #1e2535", borderRadius:20, padding:"52px 44px", width:420, textAlign:"center" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}><WheelLogo size={52}/></div>
        <h1 style={{ color:"#fff", fontSize:27, fontFamily:"'Space Grotesk',sans-serif", margin:"0 0 6px" }}>Project Wheel</h1>
        <p style={{ color:"#6b7280", fontSize:16, margin:"0 0 32px" }}>Your project ideas, one spin away.</p>
        {signedUp ? (
          <p style={{ color:"#7c5cfc", fontSize:17 }}>Account created — check your email to confirm, then sign in.</p>
        ) : (
          <>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", padding:"14px 16px", background:"#0f1117", border:"1px solid #1e2535", borderRadius:10, color:"#fff", fontSize:16, outline:"none", marginBottom:12 }}
            />
            <input type="password" placeholder="password" value={password}
              onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key==="Enter" && handleSubmit()}
              style={{ width:"100%", boxSizing:"border-box", padding:"14px 16px", background:"#0f1117", border:"1px solid #1e2535", borderRadius:10, color:"#fff", fontSize:16, outline:"none", marginBottom:12 }}
            />
            {err && <p style={{ color:"#f87171", fontSize:14, marginBottom:10 }}>{err}</p>}
            <button onClick={handleSubmit} disabled={loading||!email||!password}
              style={{ width:"100%", padding:"14px", background:"#7c5cfc", border:"none", borderRadius:10, color:"#fff", fontSize:17, fontWeight:600, cursor:"pointer", opacity:loading||!email||!password?0.6:1, marginBottom:16 }}>
              {loading ? "…" : mode==="signin" ? "Sign in" : "Create account"}
            </button>
            <button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setErr("");}}
              style={{ background:"none", border:"none", color:"#6b7280", fontSize:14, cursor:"pointer" }}>
              {mode==="signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
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
      ctx.fillStyle="#1e2535"; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      staticRef.current = off; return;
    }
    const slice = (Math.PI*2)/ps.length;
    ps.forEach((p,i) => {
      const s2=i*slice, e=s2+slice;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s2,e); ctx.closePath();
      ctx.fillStyle=PALETTE[i%PALETTE.length]; ctx.fill();
      ctx.strokeStyle="#0f1117"; ctx.lineWidth=1.5; ctx.stroke();
      const mid=s2+slice/2;
      const maxLen=Math.max(4,Math.min(20,Math.floor((r*0.72*slice)/7)));
      const label=p.name.length>maxLen?p.name.slice(0,maxLen-1)+"…":p.name;
      const fs=ps.length>40?9:ps.length>20?11:ps.length>10?13:15;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid);
      ctx.textAlign="right"; ctx.fillStyle="rgba(255,255,255,0.92)";
      ctx.font=`600 ${fs}px Inter,sans-serif`; ctx.fillText(label,r-14,fs*0.38);
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
    if(!projectsRef.current.length) {
      ctx.fillStyle="#6b7280"; ctx.font="17px Inter,sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("No projects match filters",cx,cy);
    }
    ctx.beginPath(); ctx.arc(cx,cy,24,0,Math.PI*2);
    ctx.fillStyle="#0f1117"; ctx.fill();
    ctx.strokeStyle="#7c5cfc"; ctx.lineWidth=3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2);
    ctx.fillStyle="#7c5cfc"; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx,cy-r-6); ctx.lineTo(cx-14,cy-r+18); ctx.lineTo(cx+14,cy-r+18);
    ctx.closePath(); ctx.fillStyle="#f0b429"; ctx.fill();
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
        const norm=(((-(spinRef.current.angle)%(Math.PI*2))+Math.PI*2)%(Math.PI*2));
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
        style={{ borderRadius:"50%", cursor:"pointer", filter:"drop-shadow(0 0 40px rgba(124,92,252,0.4))", maxWidth:"100%", maxHeight:"100%", flexShrink:1, minHeight:0 }}
      />
      <button onClick={spin} style={{
        padding:"19px 72px", background:"linear-gradient(135deg,#7c5cfc,#5b4cdc)", border:"none",
        borderRadius:14, color:"#fff", fontSize:22, fontWeight:700, cursor:"pointer",
        fontFamily:"'Space Grotesk',sans-serif", boxShadow:"0 6px 28px rgba(124,92,252,0.5)", letterSpacing:0.3,
        flexShrink:0
      }}>Spin</button>
    </div>
  );
}

// ── Result Modal ──────────────────────────────────────────────────────────────
function ResultModal({ project, categories, onAccept, onReroll, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const catNames=(project.categoryIds||[]).map(id=>categories.find(c=>c.id===id)?.name).filter(Boolean);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }} onClick={onClose}>
      <div style={{ background:"#161b27",border:"1px solid #7c5cfc",borderRadius:20,padding:"40px 40px 36px",width:520,boxShadow:"0 0 80px rgba(124,92,252,0.3)" }} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>setExpanded(!expanded)} style={{ width:"100%",background:"none",border:"none",padding:0,cursor:"pointer",textAlign:"left",marginBottom:16 }}>
          <h2 style={{ color:"#fff",fontSize:30,fontFamily:"'Space Grotesk',sans-serif",margin:0,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,lineHeight:1.25 }}>
            {project.name}
            <span style={{ color:"#6b7280",flexShrink:0 }}>{expanded?Icon.chevronUp(20):Icon.chevronDown(20)}</span>
          </h2>
        </button>
        {expanded && (
          <p style={{ color:"#9ca3af",fontSize:16,lineHeight:1.65,margin:"0 0 20px" }}>
            {project.description||"No description yet."}
          </p>
        )}
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:30 }}>
          <Badge color={DIFF_COLOR[project.difficulty]}>{project.difficulty}</Badge>
          <Badge color="#6b7280">{project.dev_type}</Badge>
          {catNames.map(c=><Badge key={c} color="#6b7280">{c}</Badge>)}
        </div>
        <div style={{ display:"flex",gap:12 }}>
          <button onClick={onAccept} style={{ flex:1,padding:"16px",background:"#7c5cfc",border:"none",borderRadius:10,color:"#fff",fontSize:17,fontWeight:600,cursor:"pointer" }}>
            Accept
          </button>
          <button onClick={onReroll} style={{ flex:1,padding:"16px",background:"#1e2535",border:"1px solid #2d3748",borderRadius:10,color:"#9ca3af",fontSize:17,cursor:"pointer" }}>
            Reroll
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span style={{ padding:"5px 14px",borderRadius:99,fontSize:14,fontWeight:500,background:`${color}22`,color }}>
      {children}
    </span>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, categories, onEdit, onDelete }) {
  const catNames=(project.categoryIds||[]).map(id=>categories.find(c=>c.id===id)?.name).filter(Boolean);
  return (
    <div style={{ background:"#161b27",borderLeft:`4px solid ${DIFF_COLOR[project.difficulty]}`,borderRadius:"0 12px 12px 0",padding:"24px 26px",display:"flex",flexDirection:"column",gap:14 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <h3 style={{ color:"#fff",fontSize:19,fontWeight:600,margin:0,lineHeight:1.35 }}>{project.name}</h3>
        <div style={{ display:"flex",gap:4,flexShrink:0,marginLeft:10 }}>
          <IconBtn onClick={()=>onEdit(project)}>{Icon.edit(17)}</IconBtn>
          <IconBtn onClick={()=>onDelete(project.id)}>{Icon.trash(17)}</IconBtn>
        </div>
      </div>
      {project.description && (
        <p style={{ color:"#8b95a5",fontSize:15,margin:0,lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
          {project.description}
        </p>
      )}
      <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
        <Badge color={STATUS_COLOR[project.status]}>{project.status}</Badge>
        <Badge color={DIFF_COLOR[project.difficulty]}>{project.difficulty}</Badge>
        <Badge color="#6b7280">{project.dev_type}</Badge>
        {catNames.map(c=><Badge key={c} color="#4b5563">{c}</Badge>)}
      </div>
      {project.status==="completed"&&project.link&&(
        <a href={project.link} target="_blank" rel="noreferrer"
          style={{ color:"#7c5cfc",fontSize:15,display:"flex",alignItems:"center",gap:6,textDecoration:"none" }}>
          {Icon.link(16)} View project
        </a>
      )}
    </div>
  );
}

function IconBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ background:"none",border:"none",cursor:"pointer",padding:"5px 7px",borderRadius:6,color:"#4b5563",display:"flex",alignItems:"center" }}
      onMouseEnter={e=>e.currentTarget.style.color="#9ca3af"}
      onMouseLeave={e=>e.currentTarget.style.color="#4b5563"}>
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
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:20 }} onClick={onClose}>
      <div style={{ background:"#161b27",border:"1px solid #1e2535",borderRadius:20,padding:38,width:560,maxHeight:"90vh",overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ color:"#fff",fontSize:22,fontFamily:"'Space Grotesk',sans-serif",margin:"0 0 28px" }}>
          {project?.id?"Edit project":"Add project"}
        </h2>
        <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
          <Field label="Name"><input value={form.name} onChange={e=>set("name",e.target.value)} style={inputStyle}/></Field>
          <Field label="Description"><textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={3} style={{...inputStyle,resize:"vertical"}}/></Field>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14 }}>
            <Field label="Difficulty">
              <select value={form.difficulty} onChange={e=>set("difficulty",e.target.value)} style={inputStyle}>
                {DIFFICULTIES.map(d=><option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Dev type">
              <select value={form.dev_type} onChange={e=>set("dev_type",e.target.value)} style={inputStyle}>
                {DEV_TYPES.map(d=><option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e=>set("status",e.target.value)} style={inputStyle}>
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          {form.status==="completed"&&(
            <Field label="Project link"><input value={form.link||""} onChange={e=>set("link",e.target.value)} style={inputStyle} placeholder="https://…"/></Field>
          )}
          <Field label="Categories">
            <div style={{ display:"flex",flexWrap:"wrap",gap:9,marginTop:4 }}>
              {categories.map(c=>{
                const active=form.categoryIds.includes(c.id);
                return(
                  <button key={c.id} onClick={()=>toggleCat(c.id)} style={{
                    padding:"7px 16px",borderRadius:99,fontSize:14,cursor:"pointer",
                    border:active?"1px solid #7c5cfc":"1px solid #2d3748",
                    background:active?"rgba(124,92,252,0.2)":"#1e2535",
                    color:active?"#7c5cfc":"#9ca3af",
                  }}>{c.name}</button>
                );
              })}
            </div>
          </Field>
        </div>
        <div style={{ display:"flex",gap:12,marginTop:30 }}>
          <button onClick={handleSave} disabled={loading||!form.name.trim()}
            style={{ flex:1,padding:"15px",background:"#7c5cfc",border:"none",borderRadius:10,color:"#fff",fontSize:17,fontWeight:600,cursor:"pointer",opacity:loading||!form.name.trim()?0.6:1 }}>
            {loading?"Saving…":"Save"}
          </button>
          <button onClick={onClose} style={{ padding:"15px 24px",background:"#1e2535",border:"none",borderRadius:10,color:"#9ca3af",fontSize:17,cursor:"pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ color:"#6b7280",fontSize:14,display:"block",marginBottom:8 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width:"100%",boxSizing:"border-box",padding:"13px 16px",background:"#0f1117",
  border:"1px solid #1e2535",borderRadius:10,color:"#fff",fontSize:16,outline:"none",fontFamily:"Inter,sans-serif"
};

// ── Category Manager ──────────────────────────────────────────────────────────
function CategoryManager({ categories, projects, onAdd, onRename, onDelete, onClose }) {
  const [newName,setNewName]=useState("");
  const [editing,setEditing]=useState(null);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }} onClick={onClose}>
      <div style={{ background:"#161b27",border:"1px solid #1e2535",borderRadius:20,padding:38,width:520 }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ color:"#fff",fontSize:22,fontFamily:"'Space Grotesk',sans-serif",margin:"0 0 26px" }}>Manage categories</h2>
        <div style={{ display:"flex",gap:10,marginBottom:22 }}>
          <input value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&newName.trim()){onAdd(newName.trim());setNewName("");}}}
            placeholder="New category name" style={{...inputStyle,flex:1}}/>
          <button onClick={()=>{if(newName.trim()){onAdd(newName.trim());setNewName("");}}}
            style={{ padding:"13px 22px",background:"#7c5cfc",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontSize:16,fontWeight:600 }}>
            Add
          </button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:9,maxHeight:400,overflowY:"auto" }}>
          {categories.map(c=>{
            const count=projects.filter(p=>p.categoryIds.includes(c.id)).length;
            return(
              <div key={c.id} style={{ display:"flex",alignItems:"center",gap:8,background:"#0f1117",borderRadius:10,padding:"14px 16px" }}>
                {editing===c.id?(
                  <input autoFocus defaultValue={c.name}
                    onBlur={e=>{onRename(c.id,e.target.value);setEditing(null);}}
                    onKeyDown={e=>{if(e.key==="Enter"){onRename(c.id,e.target.value);setEditing(null);}}}
                    style={{...inputStyle,flex:1,padding:"7px 12px",fontSize:15}}/>
                ):(
                  <span style={{ flex:1,color:"#fff",fontSize:16 }}>
                    {c.name}<span style={{ color:"#4b5563",fontSize:14,marginLeft:10 }}>{count} projects</span>
                  </span>
                )}
                <IconBtn onClick={()=>setEditing(c.id)}>{Icon.edit(16)}</IconBtn>
                <IconBtn onClick={()=>onDelete(c.id)}>{Icon.trash(16)}</IconBtn>
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
    <div style={{ marginBottom:24 }}>
      <p style={{ color:"#4b5563",fontSize:12,fontWeight:700,margin:"0 0 9px",letterSpacing:1,textTransform:"uppercase" }}>{label}</p>
      <div style={{ display:"flex",flexDirection:"column",gap:2 }}>
        <FilterBtn active={all} color="#7c5cfc" onClick={()=>onChange([])}>All</FilterBtn>
        {options.map(o=>{
          const active=selected.includes(o);
          const color=colorMap?colorMap[o]:"#7c5cfc";
          return(
            <FilterBtn key={o} active={active} color={color}
              onClick={()=>onChange(active?selected.filter(x=>x!==o):[...selected,o])}>
              {active&&<span style={{ width:6,height:6,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0 }}/>}
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
      color:active?color:"#6b7280",textAlign:"left",padding:"9px 11px",
      borderRadius:7,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",gap:8,
      fontFamily:"Inter,sans-serif"
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap');
        *{box-sizing:border-box;}
        html,body,#root{margin:0;height:100%;background:#0f1117;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#1e2535;border-radius:3px;}
        select option{background:#161b27;}
        button{font-family:Inter,sans-serif;}
      `}</style>

      <div style={{ display:"flex",height:"100vh",fontFamily:"'Inter',sans-serif",overflow:"hidden" }}>

        {/* Sidebar */}
        <aside style={{ width:SW,background:"#161b27",borderRight:"1px solid #1e2535",padding:"30px 20px",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:11,marginBottom:4 }}>
            <WheelLogo size={36}/>
            <span style={{ color:"#fff",fontWeight:700,fontSize:19,fontFamily:"'Space Grotesk',sans-serif" }}>Project Wheel</span>
          </div>
          <p style={{ color:"#4b5563",fontSize:14,margin:"0 0 30px 47px" }}>{projects.length} projects</p>

          {/* Nav */}
          <div style={{ display:"flex",flexDirection:"column",gap:5,marginBottom:30 }}>
            {[["wheel",Icon.wheel(19),"Spin the wheel"],["projects",Icon.grid(18),"Browse projects"]].map(([v,icon,label])=>(
              <button key={v} onClick={()=>setView(v)} style={{
                display:"flex",alignItems:"center",gap:11,padding:"13px 15px",borderRadius:10,border:"none",cursor:"pointer",fontSize:16,textAlign:"left",
                background:view===v?"rgba(124,92,252,0.15)":"none",
                color:view===v?"#7c5cfc":"#9ca3af",fontWeight:view===v?600:400,
              }}>
                <span style={{ opacity: view===v?1:0.6 }}>{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ borderTop:"1px solid #1e2535",paddingTop:24 }}>
            <MultiFilter label="Category" options={categories.map(c=>c.name)} selected={filterCats} onChange={setFilterCats}/>
            <MultiFilter label="Difficulty" options={DIFFICULTIES} selected={filterDiffs} onChange={setFilterDiffs} colorMap={DIFF_COLOR}/>
            <MultiFilter label="Dev type" options={DEV_TYPES} selected={filterDevTypes} onChange={setFilterDevTypes}/>
            <MultiFilter label="Status" options={STATUSES} selected={filterStatuses} onChange={setFilterStatuses} colorMap={STATUS_COLOR}/>
          </div>

          {/* Bottom actions */}
          <div style={{ marginTop:"auto",paddingTop:22,borderTop:"1px solid #1e2535",display:"flex",flexDirection:"column",gap:9 }}>
            <button onClick={()=>setShowAddProject(true)} style={{ display:"flex",alignItems:"center",gap:9,padding:"13px 15px",background:"#7c5cfc",border:"none",borderRadius:10,color:"#fff",fontSize:16,cursor:"pointer",fontWeight:500 }}>
              {Icon.plus(17)} Add project
            </button>
            <button onClick={()=>setShowCatManager(true)} style={{ display:"flex",alignItems:"center",gap:9,padding:"13px 15px",background:"#1e2535",border:"none",borderRadius:10,color:"#9ca3af",fontSize:16,cursor:"pointer" }}>
              {Icon.settings(17)} Manage categories
            </button>
            <button onClick={()=>supabase.auth.signOut()} style={{ display:"flex",alignItems:"center",gap:9,padding:"13px 15px",background:"none",border:"none",borderRadius:10,color:"#4b5563",fontSize:16,cursor:"pointer" }}>
              {Icon.signout(17)} Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0 }}>

          {view==="wheel"&&(
            <div style={{ flex:1,minHeight:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 40px",gap:24,overflow:"hidden" }}>
              <div style={{ textAlign:"center",flexShrink:0 }}>
                <h1 style={{ color:"#fff",fontSize:36,fontFamily:"'Space Grotesk',sans-serif",margin:"0 0 8px",fontWeight:700 }}>
                  What should you build next?
                </h1>
                <p style={{ color:"#6b7280",fontSize:16,margin:0 }}>
                  {filtered.length} projects in the pool
                </p>
              </div>
              <SpinWheel projects={filtered} onResult={p=>setResult(p)}/>
            </div>
          )}

          {view==="projects"&&(
            <div style={{ flex:1,overflowY:"auto",padding:"34px 42px" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:30 }}>
                <div>
                  <h1 style={{ color:"#fff",fontSize:28,fontFamily:"'Space Grotesk',sans-serif",margin:"0 0 5px" }}>Projects</h1>
                  <p style={{ color:"#6b7280",fontSize:15,margin:0 }}>Showing {filtered.length} of {projects.length}</p>
                </div>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                  style={{...inputStyle,width:280}}/>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(400px,1fr))",gap:16 }}>
                {filtered.map(p=>(
                  <ProjectCard key={p.id} project={p} categories={categories} onEdit={setEditProject} onDelete={deleteProject}/>
                ))}
                {filtered.length===0&&(
                  <p style={{ color:"#6b7280",gridColumn:"1/-1",fontSize:16 }}>No projects match. Adjust your filters.</p>
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