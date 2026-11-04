import { useState, useEffect, useRef, useCallback } from "react";
import "./app.css";
import {
  api, enqueue, flushQueue, fetchData, localData, queuedCount,
  OfflineError, LoginError,
} from "./offline.js";

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const DEV_TYPES    = ["Manual", "Assisted"];
const STATUSES     = ["idea", "doing", "completed"];
const CONTENT_OPTIONS = ["Made", "Not made"];

// Colours come from tokens.css. The wheel is a canvas, so it reads them with token() instead.
const DIFF_COLOR = { Easy: "var(--ok)", Medium: "var(--accent)", Hard: "var(--hard)", Expert: "var(--hi)" };
const STATUS_COLOR = { idea: "var(--muted)", doing: "var(--accent)", completed: "var(--ok)" };
const CONTENT_COLOR = { Made: "var(--ok)", "Not made": "var(--muted)" };
const ACCENT = "var(--accent)";
const SLICES = ["--slice-1","--slice-2","--slice-3","--slice-4"];

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Neighbouring slices never match, including the last one against the first
function sliceColor(i, total) {
  if (i===total-1 && i%SLICES.length===0 && total>1) return SLICES[1];
  return SLICES[i%SLICES.length];
}

// ── Icons (Lucide, pasted in so there is no dependency) ──────────────────────
const ICON = { width:20, height:20, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.75, strokeLinecap:"round", strokeLinejoin:"round", "aria-hidden":true };
const Icon = {
  wheel: <svg {...ICON}><circle cx="12" cy="12" r="8"/><path d="M12 2v7.5"/><path d="m19 5-5.23 5.23"/><path d="M22 12h-7.5"/><path d="m19 19-5.23-5.23"/><path d="M12 14.5V22"/><path d="M10.23 13.77 5 19"/><path d="M9.5 12H2"/><path d="M10.23 10.23 5 5"/><circle cx="12" cy="12" r="2.5"/></svg>,
  grid: <svg {...ICON}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>,
  edit: <svg {...ICON}><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>,
  trash: <svg {...ICON}><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  plus: <svg {...ICON}><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
  tags: <svg {...ICON}><path d="M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z"/><path d="M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193"/><circle cx="10.5" cy="6.5" r=".5" fill="currentColor"/></svg>,
  close: <svg {...ICON}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  filter: <svg {...ICON}><path d="M2 5h20"/><path d="M6 12h12"/><path d="M9 19h6"/></svg>,
  chevronDown: <svg {...ICON}><path d="m6 9 6 6 6-6"/></svg>,
  chevronUp: <svg {...ICON}><path d="m18 15-6-6-6 6"/></svg>,
  link: <svg {...ICON}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>,
  sun: <svg {...ICON}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
  moon: <svg {...ICON}><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>,
};

// ── Spin Wheel ────────────────────────────────────────────────────────────────
function SpinWheel({ projects, theme, onResult }) {
  const canvasRef    = useRef(null);
  const wrapRef      = useRef(null);
  const spinRef      = useRef({ angle: 0, spinning: false });
  const rafRef       = useRef(null);
  const projectsRef  = useRef(projects);
  const staticRef    = useRef(null);
  const sizeRef      = useRef(600);

  useEffect(() => {
    projectsRef.current = projects;
    const s = sizeRef.current;
    buildStatic(projects, s);
    drawFrame(spinRef.current.angle, s);
  }, [projects, theme]);

  // The first draw can happen before Inter has loaded
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      buildStatic(projectsRef.current, sizeRef.current);
      drawFrame(spinRef.current.angle, sizeRef.current);
    });
    return () => { live = false; };
  }, []);

  function buildStatic(ps, size) {
    // Drawn at device resolution so the wheel stays sharp on phones
    const dpr = window.devicePixelRatio || 1;
    const off = new OffscreenCanvas(size*dpr, size*dpr);
    const ctx = off.getContext("2d");
    ctx.scale(dpr, dpr);
    const cx = size/2, cy = size/2, r = cx - 14;
    if (!ps.length) {
      ctx.fillStyle=token("--sunken"); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      staticRef.current = off; return;
    }
    const slice = (Math.PI*2)/ps.length;
    ps.forEach((p,i) => {
      const s2=i*slice, e=s2+slice;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s2,e); ctx.closePath();
      ctx.fillStyle=token(sliceColor(i,ps.length)); ctx.fill();
      ctx.strokeStyle=token("--bg"); ctx.lineWidth=2; ctx.stroke();
      const mid=s2+slice/2;
      const fs=ps.length>40?10:ps.length>20?11:ps.length>10?13:15;
      ctx.font=`500 ${fs}px Inter,system-ui,sans-serif`;
      // Labels run along the radius, so that's the room they get: rim to hub
      const room=r-14-36;
      let label=p.name;
      while(label.length>1&&ctx.measureText(label).width>room) label=label.slice(0,-1);
      if(label!==p.name) label=`${label.slice(0,-1)}…`;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid);
      ctx.textAlign="right"; ctx.fillStyle=token("--on-slice");
      ctx.font=`500 ${fs}px Inter,system-ui,sans-serif`; ctx.fillText(label,r-14,fs*0.38);
      ctx.restore();
    });
    staticRef.current = off;
  }

  function drawFrame(angle, size) {
    const canvas=canvasRef.current; if(!canvas||!staticRef.current) return;
    const dpr=window.devicePixelRatio||1;
    const ctx=canvas.getContext("2d"); const cx=size/2,cy=size/2,r=cx-14;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,size,size);
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle); ctx.translate(-cx,-cy);
    ctx.drawImage(staticRef.current,0,0,size,size); ctx.restore();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.lineWidth=2; ctx.strokeStyle=token("--line-strong"); ctx.stroke();
    if(!projectsRef.current.length) {
      ctx.fillStyle=token("--muted"); ctx.font="14px Inter,system-ui,sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("no projects match filters",cx,cy+55);
    }
    ctx.beginPath(); ctx.arc(cx,cy,24,0,Math.PI*2);
    ctx.fillStyle=token("--surface"); ctx.fill();
    ctx.lineWidth=2; ctx.strokeStyle=token("--line-strong"); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2);
    ctx.fillStyle=token("--accent-fill"); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx,cy-r-6); ctx.lineTo(cx-14,cy-r+18); ctx.lineTo(cx+14,cy-r+18);
    ctx.closePath(); ctx.fillStyle=token("--ink"); ctx.fill();
  }

  function spin() {
    if(spinRef.current.spinning||!projectsRef.current.length) return;
    const size=sizeRef.current;
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
      const s=Math.max(240,Math.min(w, h, 760));
      const dpr=window.devicePixelRatio||1;
      sizeRef.current=s;
      canvasRef.current.width=s*dpr; canvasRef.current.height=s*dpr;
      canvasRef.current.style.width=`${s}px`; canvasRef.current.style.height=`${s}px`;
      buildStatic(projectsRef.current,s);
      drawFrame(spinRef.current.angle,s);
    }
    resize();
    const ro=new ResizeObserver(resize);
    if(wrapRef.current) ro.observe(wrapRef.current);
    return ()=>ro.disconnect();
  },[]);

  return (
    <div className="wheel">
      <div ref={wrapRef} className="wheel-stage">
        <canvas ref={canvasRef} onClick={spin} className="wheel-canvas" aria-label="project wheel"/>
      </div>
      <button onClick={spin} className="btn btn-spin">spin</button>
    </div>
  );
}

// ── Back button support ───────────────────────────────────────────────────────
// An installed app has no browser back button, so popups and tabs go through history:
// the phone's back gesture closes the popup instead of leaving the app.
let ownBacks = 0;
const openPopups = [];
window.addEventListener("popstate", () => {
  if (ownBacks > 0) { ownBacks--; return; }
  openPopups.at(-1)?.();
});

function useBackToClose(onClose) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    let closedByBack = false;
    const closer = () => { closedByBack = true; closeRef.current(); };
    history.pushState({ ...history.state, modal: true }, "");
    openPopups.push(closer);
    return () => {
      openPopups.splice(openPopups.indexOf(closer), 1);
      if (!closedByBack) { ownBacks++; history.back(); }
    };
  }, []);
}

function Modal({ onClose, className = "", children }) {
  useBackToClose(onClose);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
        <button className="icon-btn modal-close" aria-label="close" onClick={onClose}>{Icon.close}</button>
        {children}
      </div>
    </div>
  );
}

// ── Result Modal ──────────────────────────────────────────────────────────────
function ResultModal({ project, categories, onAccept, onReroll, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const catNames=(project.categoryIds||[]).map(id=>categories.find(c=>c.id===id)?.name).filter(Boolean);
  return (
    <Modal onClose={onClose} className="modal-result">
      <button className="result-toggle" onClick={()=>setExpanded(!expanded)}>
        <h2 className="result-name">
          {project.name}
          <span className="result-chevron">{expanded?Icon.chevronUp:Icon.chevronDown}</span>
        </h2>
      </button>
      {expanded && <p className="result-desc">{project.description||"no description yet."}</p>}
      <div className="badges result-badges">
        <Badge color={DIFF_COLOR[project.difficulty]}>{project.difficulty}</Badge>
        <Badge>{project.dev_type}</Badge>
        {catNames.map(c=><Badge key={c}>{c}</Badge>)}
      </div>
      <div className="modal-actions">
        <button onClick={onAccept} className="btn btn-primary">accept</button>
        <button onClick={onReroll} className="btn btn-secondary">reroll</button>
      </div>
    </Modal>
  );
}

// With a colour the badge carries meaning (difficulty, status); without one it's neutral
function Badge({ color, children }) {
  return <span className={`badge${color?" badge-meaning":""}`} style={color?{ "--c":color }:undefined}>{children}</span>;
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, categories, onEdit, onDelete }) {
  const catNames=(project.categoryIds||[]).map(id=>categories.find(c=>c.id===id)?.name).filter(Boolean);
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-name">{project.name}</h3>
        <div className="card-actions">
          <IconBtn label={`edit ${project.name}`} onClick={()=>onEdit(project)}>{Icon.edit}</IconBtn>
          <IconBtn danger label={`delete ${project.name}`} onClick={()=>onDelete(project.id)}>{Icon.trash}</IconBtn>
        </div>
      </div>
      {project.description && <p className="card-desc">{project.description}</p>}
      <div className="badges">
        <Badge color={project.status==="idea"?undefined:STATUS_COLOR[project.status]}>{project.status}</Badge>
        <Badge color={DIFF_COLOR[project.difficulty]}>{project.difficulty}</Badge>
        <Badge>{project.dev_type}</Badge>
        <Badge color={project.has_content?CONTENT_COLOR.Made:undefined}>{project.has_content?"content made":"no content"}</Badge>
        {catNames.map(c=><Badge key={c}>{c}</Badge>)}
        {project.pending&&<span className="badge badge-pending">saved on this device</span>}
      </div>
      {project.status==="completed"&&project.link&&(
        <a href={project.link} target="_blank" rel="noreferrer" className="card-link">
          {Icon.link} view project
        </a>
      )}
    </div>
  );
}

function IconBtn({ onClick, label, danger, children }) {
  return <button onClick={onClick} aria-label={label} className={`icon-btn${danger?" icon-danger":""}`}>{children}</button>;
}

// ── Project Form ──────────────────────────────────────────────────────────────
function ProjectFormModal({ project, categories, onSave, onClose }) {
  const [form, setForm]=useState(project||{ name:"",description:"",difficulty:"Medium",dev_type:"Assisted",status:"idea",link:"",has_content:false,categoryIds:[] });
  const [loading,setLoading]=useState(false);
  function set(k,v){setForm(f=>({...f,[k]:v}));}
  function toggleCat(id){setForm(f=>({...f,categoryIds:f.categoryIds.includes(id)?f.categoryIds.filter(c=>c!==id):[...f.categoryIds,id]}));}
  async function handleSave(){if(!form.name.trim())return;setLoading(true);await onSave(form);setLoading(false);}
  return (
    <Modal onClose={onClose} className="modal-form">
      <h2 className="modal-title">{project?.id?"edit project":"add project"}</h2>
      <div className="form-fields">
        <Field label="name"><input value={form.name} onChange={e=>set("name",e.target.value)} className="input"/></Field>
        <Field label="description"><textarea value={form.description||""} onChange={e=>set("description",e.target.value)} rows={3} className="input input-area"/></Field>
        <div className="form-selects">
          <Field label="difficulty">
            <SelectField value={form.difficulty} onChange={e=>set("difficulty",e.target.value)} options={DIFFICULTIES}/>
          </Field>
          <Field label="dev type">
            <SelectField value={form.dev_type} onChange={e=>set("dev_type",e.target.value)} options={DEV_TYPES}/>
          </Field>
          <Field label="status">
            <SelectField value={form.status} onChange={e=>set("status",e.target.value)} options={STATUSES}/>
          </Field>
          <Field label="content">
            <SelectField value={form.has_content?"Made":"Not made"} onChange={e=>set("has_content",e.target.value==="Made")} options={CONTENT_OPTIONS}/>
          </Field>
        </div>
        {form.status==="completed"&&(
          <Field label="project link"><input value={form.link||""} onChange={e=>set("link",e.target.value)} className="input" placeholder="https://…"/></Field>
        )}
        <Field label="categories">
          <div className="chips">
            {categories.map(c=>(
              <button key={c.id} onClick={()=>toggleCat(c.id)} className={`chip${form.categoryIds.includes(c.id)?" active":""}`}>{c.name}</button>
            ))}
          </div>
        </Field>
      </div>
      <div className="modal-actions">
        <button onClick={handleSave} disabled={loading||!form.name.trim()} className="btn btn-primary">
          {loading?"saving…":"save"}
        </button>
        <button onClick={onClose} className="btn btn-secondary btn-grow-none">cancel</button>
      </div>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <div className="select-wrap">
      <select value={value} onChange={onChange} className="input select">
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
      <span className="select-chevron">{Icon.chevronDown}</span>
    </div>
  );
}

// ── Category Manager ──────────────────────────────────────────────────────────
function CategoryManager({ categories, projects, online, onAdd, onRename, onDelete, onClose }) {
  const [newName,setNewName]=useState("");
  const [editing,setEditing]=useState(null);
  return (
    <Modal onClose={onClose} className="modal-cats">
      <h2 className="modal-title">manage categories</h2>
      {!online&&<p className="modal-note">category changes need a connection. you can still look at them here.</p>}
      <div className="cat-add">
        <input value={newName} disabled={!online} onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&newName.trim()){onAdd(newName.trim());setNewName("");}}}
          placeholder="new category name" className="input"/>
        <button disabled={!online} onClick={()=>{if(newName.trim()){onAdd(newName.trim());setNewName("");}}} className="btn btn-primary btn-small">add</button>
      </div>
      <div className="cat-list">
        {categories.map(c=>{
          const count=projects.filter(p=>p.categoryIds.includes(c.id)).length;
          return(
            <div key={c.id} className="cat-row">
              {editing===c.id?(
                <input autoFocus defaultValue={c.name} className="input input-inline"
                  onBlur={e=>{onRename(c.id,e.target.value);setEditing(null);}}
                  onKeyDown={e=>{if(e.key==="Enter"){onRename(c.id,e.target.value);setEditing(null);}}}/>
              ):(
                <span className="cat-name">{c.name}<span className="cat-count">{count} projects</span></span>
              )}
              {online&&<IconBtn label={`rename ${c.name}`} onClick={()=>setEditing(c.id)}>{Icon.edit}</IconBtn>}
              {online&&<IconBtn danger label={`delete ${c.name}`} onClick={()=>onDelete(c.id)}>{Icon.trash}</IconBtn>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────
function MultiFilter({ label, options, selected, onChange, colorMap }) {
  const all=selected.length===0;
  return (
    <div className="filter-group">
      <p className="filter-label">{label}</p>
      <div className="filter-options">
        <FilterBtn active={all} color={ACCENT} onClick={()=>onChange([])}>all</FilterBtn>
        {options.map(o=>{
          const active=selected.includes(o);
          const color=colorMap?colorMap[o]:ACCENT;
          return(
            <FilterBtn key={o} active={active} color={color}
              onClick={()=>onChange(active?selected.filter(x=>x!==o):[...selected,o])}>
              {active&&<span className="filter-dot"/>}
              {o}
            </FilterBtn>
          );
        })}
      </div>
    </div>
  );
}

function FilterBtn({ active, color, onClick, children }) {
  return <button onClick={onClick} className={`filter-btn${active?" active":""}`} style={{ "--c":color }}>{children}</button>;
}

function Filters({ categories, f }) {
  return (
    <>
      <MultiFilter label="category" options={categories.map(c=>c.name)} selected={f.cats} onChange={f.setCats}/>
      <MultiFilter label="difficulty" options={DIFFICULTIES} selected={f.diffs} onChange={f.setDiffs} colorMap={DIFF_COLOR}/>
      <MultiFilter label="dev type" options={DEV_TYPES} selected={f.devTypes} onChange={f.setDevTypes}/>
      <MultiFilter label="status" options={STATUSES} selected={f.statuses} onChange={f.setStatuses} colorMap={STATUS_COLOR}/>
      <MultiFilter label="content" options={CONTENT_OPTIONS} selected={f.content} onChange={f.setContent} colorMap={CONTENT_COLOR}/>
    </>
  );
}

function FiltersButton({ count, onClick }) {
  return (
    <button onClick={onClick} className="btn-filters">
      {Icon.filter} filters{count>0&&` (${count})`}
    </button>
  );
}

function FilterSheet({ categories, f, count, shown, onClose }) {
  return (
    <Modal onClose={onClose} className="modal-filters">
      <h2 className="modal-title">filters</h2>
      <div className="filter-sheet-body"><Filters categories={categories} f={f}/></div>
      <div className="modal-actions">
        <button onClick={onClose} className="btn btn-primary">show {shown}</button>
        {count>0&&<button onClick={f.clear} className="btn btn-secondary btn-grow-none">clear</button>}
      </div>
    </Modal>
  );
}

// ── Connection / sync notices ─────────────────────────────────────────────────
function SyncBar({ sync, notice, onDismissNotice }) {
  return (
    <>
      {sync.connection==="login"&&(
        <div className="sync-bar sync-warn">
          <span>your login expired.{sync.pending>0&&` ${sync.pending} change${sync.pending>1?"s":""} saved on this device.`}</span>
          <button className="sync-action" onClick={()=>location.reload()}>sign in</button>
        </div>
      )}
      {sync.connection==="offline"&&(
        <div className="sync-bar">
          <span>offline.{sync.pending>0?` ${sync.pending} change${sync.pending>1?"s":""} saved on this device.`:" showing your saved copy."}</span>
        </div>
      )}
      {sync.connection==="online"&&sync.pending>0&&(
        <div className="sync-bar"><span>saving {sync.pending} change{sync.pending>1?"s":""}…</span></div>
      )}
      {notice&&(
        <div className="sync-bar sync-warn">
          <span>{notice}</span>
          <button className="sync-action" onClick={onDismissNotice}>dismiss</button>
        </div>
      )}
    </>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const PROJECT_FIELDS = ["name","description","difficulty","dev_type","status","link","has_content"];

export default function App() {
  const [saved]=useState(localData);
  const [loaded,setLoaded]=useState(!!saved);
  const [projects,setProjects]=useState(saved?.projects||[]);
  const [categories,setCategories]=useState(saved?.categories||[]);
  const [sync,setSync]=useState({connection:"online",pending:queuedCount()});
  const [notice,setNotice]=useState(null);
  const [view,setView]=useState(history.state?.view||"wheel");
  const [search,setSearch]=useState("");
  const [filterCats,setFilterCats]=useState([]);
  const [filterDiffs,setFilterDiffs]=useState([]);
  const [filterDevTypes,setFilterDevTypes]=useState([]);
  const [filterStatuses,setFilterStatuses]=useState([]);
  const [filterContent,setFilterContent]=useState([]);
  const [result,setResult]=useState(null);
  const [editProject,setEditProject]=useState(null);
  const [showCatManager,setShowCatManager]=useState(false);
  const [showAddProject,setShowAddProject]=useState(false);
  const [showFilters,setShowFilters]=useState(false);
  const [theme,setTheme]=useState(document.documentElement.dataset.theme||"light");

  // index.html sets the theme before first paint: the saved choice, otherwise the system's
  function toggleTheme(){
    const next=theme==="dark"?"light":"dark";
    window.setWheelTheme(next);
    try{localStorage.setItem("wheel.theme",next);}catch{/* blocked storage: lasts this visit only */}
    setTheme(next);
  }

  const show=useCallback((data)=>{
    if(!data) return;
    setProjects(data.projects);setCategories(data.categories);setLoaded(true);
  },[]);

  // Send anything queued, then fetch the latest; falls back to the saved copy offline.
  const refresh=useCallback(async()=>{
    const { connection:afterFlush, failed }=await flushQueue();
    if(failed.length) setNotice(`couldn't save ${failed.map(f=>`"${f.label}"`).join(", ")}: ${failed[0].reason}`);
    const { data, connection }=await fetchData(afterFlush);
    show(data);
    setSync({connection,pending:queuedCount()});
    setLoaded(true);
  },[show]);

  useEffect(()=>{
    Promise.resolve().then(refresh);
    function whenVisible(){if(document.visibilityState==="visible")refresh();}
    function onPop(e){setView(e.state?.view||"wheel");}
    const system=matchMedia("(prefers-color-scheme: dark)");
    function onSystemTheme(e){
      if(window.savedWheelTheme()) return;
      const next=e.matches?"dark":"light";
      window.setWheelTheme(next);setTheme(next);
    }
    system.addEventListener("change",onSystemTheme);
    window.addEventListener("online",refresh);
    document.addEventListener("visibilitychange",whenVisible);
    window.addEventListener("popstate",onPop);
    const timer=setInterval(()=>{if(queuedCount()>0)refresh();},30000);
    return ()=>{
      system.removeEventListener("change",onSystemTheme);
      window.removeEventListener("online",refresh);
      document.removeEventListener("visibilitychange",whenVisible);
      window.removeEventListener("popstate",onPop);
      clearInterval(timer);
    };
  },[refresh]);

  // Tabs go through history too, so back from projects returns to the wheel.
  function goTo(v){
    if(v===view) return;
    if(v==="wheel"&&history.state?.pushed) history.back();
    else if(v==="wheel"){history.replaceState({view:v},"");setView(v);}
    else{history.pushState({view:v,pushed:true},"");setView(v);}
  }

  const filtered=projects.filter(p=>{
    if(filterCats.length){
      const ids=categories.filter(c=>filterCats.includes(c.name)).map(c=>c.id);
      if(!ids.some(id=>p.categoryIds.includes(id))) return false;
    }
    if(filterDiffs.length&&!filterDiffs.includes(p.difficulty)) return false;
    if(filterDevTypes.length&&!filterDevTypes.includes(p.dev_type)) return false;
    if(filterStatuses.length&&!filterStatuses.includes(p.status)) return false;
    if(filterContent.length&&!filterContent.some(f=>(f==="Made")===!!p.has_content)) return false;
    if(search&&!p.name.toLowerCase().includes(search.toLowerCase())&&!(p.description||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filterCount=filterCats.length+filterDiffs.length+filterDevTypes.length+filterStatuses.length+filterContent.length;
  const filterState={
    cats:filterCats,setCats:setFilterCats,diffs:filterDiffs,setDiffs:setFilterDiffs,
    devTypes:filterDevTypes,setDevTypes:setFilterDevTypes,statuses:filterStatuses,setStatuses:setFilterStatuses,
    content:filterContent,setContent:setFilterContent,
    clear(){setFilterCats([]);setFilterDiffs([]);setFilterDevTypes([]);setFilterStatuses([]);setFilterContent([]);},
  };

  // Project changes go through the device queue, so they work the same online and offline.
  function queueChange(op){
    enqueue(op);
    show(localData());
    setSync(s=>({...s,pending:queuedCount()}));
    refresh();
  }

  async function saveProject(form){
    const {categoryIds,...fields}=form;
    if(!fields.link||fields.status!=="completed") fields.link=null;
    if(fields.id){
      // Only the fields that changed, so a late replay can't undo newer edits to other fields
      const before=projects.find(p=>p.id===fields.id)||{};
      const changes={};
      PROJECT_FIELDS.forEach(k=>{if(fields[k]!==before[k]) changes[k]=fields[k];});
      const sameCats=[...categoryIds].sort().join()===[...(before.categoryIds||[])].sort().join();
      if(!sameCats) changes.categoryIds=categoryIds;
      if(Object.keys(changes).length) queueChange({method:"PATCH",path:`/projects/${fields.id}`,body:changes,label:fields.name});
    } else {
      queueChange({method:"POST",path:"/projects",body:{...fields,id:crypto.randomUUID(),categoryIds},label:fields.name});
    }
    setEditProject(null);setShowAddProject(false);
  }

  function deleteProject(id){
    if(!confirm("Delete this project?"))return;
    const name=projects.find(p=>p.id===id)?.name||"project";
    queueChange({method:"DELETE",path:`/projects/${id}`,label:name});
  }
  function acceptResult(p){queueChange({method:"PATCH",path:`/projects/${p.id}`,body:{status:"doing"},label:p.name});setResult(null);}

  // Categories are online only: queued projects can point at them, so offline edits could break those links.
  async function categoryChange(run){
    try{await run();}
    catch(err){
      if(err instanceof OfflineError) setSync(s=>({...s,connection:"offline"}));
      else if(err instanceof LoginError) setSync(s=>({...s,connection:"login"}));
      else setNotice(err.message);
    }
    refresh();
  }
  const addCategory=name=>categoryChange(()=>api("POST","/categories",{name}));
  const renameCategory=(id,name)=>categoryChange(()=>api("PATCH",`/categories/${id}`,{name}));
  function deleteCategory(id){
    if(!confirm("Remove this category? Projects won't be deleted."))return;
    categoryChange(()=>api("DELETE",`/categories/${id}`));
  }

  const syncBar=<SyncBar sync={sync} notice={notice} onDismissNotice={()=>setNotice(null)}/>;

  return (
    <>
      <div className="shell">

        {/* Sidebar (desktop) */}
        <aside className="sidebar">
          <div className="brand">
            <img src="/favicon.svg" alt="" className="brand-logo"/>
            <span className="brand-name">project wheel</span>
          </div>
          <p className="brand-count">{projects.length} projects</p>

          <div className="nav">
            {[["wheel",Icon.wheel,"spin the wheel"],["projects",Icon.grid,"browse projects"]].map(([v,icon,label])=>(
              <button key={v} onClick={()=>goTo(v)} className={`nav-btn${view===v?" active":""}`}>
                <span className="nav-icon">{icon}</span>{label}
              </button>
            ))}
          </div>

          <div className="sidebar-filters"><Filters categories={categories} f={filterState}/></div>

          <div className="sidebar-actions">
            <button onClick={()=>setShowCatManager(true)} className="btn-row">
              {Icon.tags} manage categories
            </button>
            <button onClick={toggleTheme} className="btn-row">
              {theme==="dark"?Icon.sun:Icon.moon} {theme==="dark"?"light mode":"dark mode"}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {syncBar}

          {view==="wheel"&&(
            <div className="view-wheel">
              <div className="wheel-head">
                <h1 className="wheel-title">what should you build next?</h1>
                <p className="view-sub">{filtered.length} projects in the pool</p>
                <FiltersButton count={filterCount} onClick={()=>setShowFilters(true)}/>
              </div>
              {loaded||projects.length
                ? <SpinWheel projects={filtered} theme={theme} onResult={p=>setResult(p)}/>
                : <p className="view-sub">loading…</p>}
            </div>
          )}

          {view==="projects"&&(
            <div className="view-projects"><div className="projects-inner">
              <div className="projects-head">
                <div>
                  <h1 className="projects-title">projects</h1>
                  <p className="view-sub">showing {filtered.length} of {projects.length}</p>
                </div>
                <div className="projects-tools">
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="search…" className="input projects-search"/>
                  <FiltersButton count={filterCount} onClick={()=>setShowFilters(true)}/>
                  <button onClick={()=>setShowAddProject(true)} className="btn btn-primary btn-add">
                    {Icon.plus} add
                  </button>
                </div>
              </div>
              <div className="grid">
                {filtered.map(p=>(
                  <ProjectCard key={p.id} project={p} categories={categories} onEdit={setEditProject} onDelete={deleteProject}/>
                ))}
                {filtered.length===0&&<p className="empty">no projects match. adjust your filters.</p>}
              </div>
            </div></div>
          )}
        </main>

        {/* Bottom tabs (phone) */}
        <nav className="tabs">
          {[["wheel",Icon.wheel,"wheel"],["projects",Icon.grid,"projects"]].map(([v,icon,label])=>(
            <button key={v} onClick={()=>goTo(v)} className={`tab${view===v?" active":""}`}><span className="tab-icon">{icon}</span>{label}</button>
          ))}
          <button onClick={()=>setShowCatManager(true)} className="tab"><span className="tab-icon">{Icon.tags}</span>categories</button>
          <button onClick={toggleTheme} className="tab"><span className="tab-icon">{theme==="dark"?Icon.sun:Icon.moon}</span>{theme==="dark"?"light":"dark"}</button>
        </nav>
      </div>

      {result&&<ResultModal project={result} categories={categories} onAccept={()=>acceptResult(result)} onReroll={()=>setResult(null)} onClose={()=>setResult(null)}/>}
      {(editProject||showAddProject)&&<ProjectFormModal project={editProject} categories={categories} onSave={saveProject} onClose={()=>{setEditProject(null);setShowAddProject(false);}}/>}
      {showCatManager&&<CategoryManager categories={categories} projects={projects} online={sync.connection==="online"} onAdd={addCategory} onRename={renameCategory} onDelete={deleteCategory} onClose={()=>setShowCatManager(false)}/>}
      {showFilters&&<FilterSheet categories={categories} f={filterState} count={filterCount} shown={filtered.length} onClose={()=>setShowFilters(false)}/>}
    </>
  );
}
