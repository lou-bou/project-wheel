import { useState, useEffect, useRef, useCallback } from "react";
import "./app.css";
import {
  api, enqueue, flushQueue, fetchData, localData, queuedCount,
  OfflineError, LoginError,
} from "./offline.js";
import { Icon } from "./icons.jsx";
import { Markdown } from "./markdown.jsx";
import { Wheel } from "./Wheel.jsx";
import { plainText, relativeAge, safeUrl, splitLinks } from "./text.js";

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const DEV_TYPES = ["Manual", "Assisted"];
const STATUSES = ["idea", "doing", "completed"];
const STATUS_LABEL = { idea: "Idea", doing: "Doing", completed: "Completed" };
const CONTENT_OPTIONS = ["Made", "Not made"];
const PROJECT_FIELDS = ["name", "description", "difficulty", "dev_type", "status", "link", "has_content", "notes"];
const VIEWS = ["backlog", "wheel", "board", "settings"];
const NAV = [["backlog", "backlog", "Backlog"], ["wheel", "wheel", "Wheel"], ["board", "board", "Board"], ["settings", "settings", "Settings"]];
const NO_FILTERS = { category: [], difficulty: [], devType: [], status: [], content: [] };

const plural = (n, word) => `${n} ${n === 1 ? word : `${word}s`}`;
const isDesktop = () => matchMedia("(min-width: 900px)").matches;

// ── Back button support ───────────────────────────────────────────────────────
// An installed app has no browser back button, so popups and tabs go through history:
// the phone's back gesture closes the popup instead of leaving the app.
let ownBacks = 0;
const openPopups = [];
window.addEventListener("popstate", () => {
  if (ownBacks > 0) { ownBacks--; return; }
  openPopups.at(-1)?.();
});

function useBackToClose(onClose, enabled = true) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!enabled) return;
    let closedByBack = false;
    const closer = () => { closedByBack = true; closeRef.current(); };
    history.pushState({ ...history.state, modal: true }, "");
    openPopups.push(closer);
    return () => {
      openPopups.splice(openPopups.indexOf(closer), 1);
      if (!closedByBack) { ownBacks++; history.back(); }
    };
  }, [enabled]);
}

// Fades an edge of a sideways scroller only while there's more to see in that direction
function useEdgeFade() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function update() {
      el.classList.toggle("fade-start", el.scrollLeft > 4);
      el.classList.toggle("fade-end", el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);
  return ref;
}

// ── Small pieces ──────────────────────────────────────────────────────────────
function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" aria-hidden="true" className="mark">
      <path d="M80 86 L80 24 A62 62 0 0 1 133.69 55 Z" fill="var(--brand-amber)"/>
      <path d="M80 86 L133.69 55 A62 62 0 0 1 133.69 117 Z" fill="var(--brand-coral)"/>
      <path d="M80 86 L133.69 117 A62 62 0 0 1 80 148 Z" fill="var(--brand-teal)"/>
      <path d="M80 86 L80 148 A62 62 0 0 1 26.31 117 Z" fill="var(--brand-amber)"/>
      <path d="M80 86 L26.31 117 A62 62 0 0 1 26.31 55 Z" fill="var(--brand-coral)"/>
      <path d="M80 86 L26.31 55 A62 62 0 0 1 80 24 Z" fill="var(--brand-teal)"/>
      <circle cx="80" cy="86" r="12" fill="var(--pointer)"/>
      <polygon points="70,8 90,8 80,30" fill="var(--pointer)"/>
    </svg>
  );
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`}><Icon name={status} size={14}/>{STATUS_LABEL[status]}</span>;
}

function DifficultyDots({ level }) {
  const filled = DIFFICULTIES.indexOf(level) + 1;
  return (
    <span className="dots" role="img" aria-label={`Difficulty: ${level}`}>
      {DIFFICULTIES.map((d, i) => <span key={d} className={`dot${i < filled ? " on" : ""}`}/>)}
    </span>
  );
}

function Tag({ children }) {
  return <span className="tag">{children}</span>;
}

function Modal({ onClose, className = "", label, children }) {
  useBackToClose(onClose);
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={label} onClick={e=>e.stopPropagation()}>
        <button className="icon-btn sheet-close" aria-label="Close" onClick={onClose}><Icon name="close"/></button>
        {children}
      </div>
    </div>
  );
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} aria-pressed={value===v} className={value===v?"on":""} onClick={()=>onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

// ── Idea card ─────────────────────────────────────────────────────────────────
function IdeaCard({ idea, categories, burst, onOpen }) {
  const catNames=(idea.categoryIds||[]).map(id=>categories.find(c=>c.id===id)?.name).filter(Boolean);
  const summary=plainText(idea.description);
  return (
    <button className={`card status-${idea.status}${burst?" burst":""}`} onClick={()=>onOpen(idea.id)}>
      <span className="card-bar"/>
      <span className="card-top">
        <span className="card-title">{idea.name}</span>
        <StatusPill status={idea.status}/>
      </span>
      {summary&&<span className="card-desc">{summary}</span>}
      <span className="card-meta">
        {catNames.map(c=><Tag key={c}>{c}</Tag>)}
        <Tag>{idea.dev_type}</Tag>
        {idea.has_content&&<Tag>Content made</Tag>}
        {idea.pending&&<span className="tag tag-pending">Saved on this device</span>}
        <span className="card-end">
          <DifficultyDots level={idea.difficulty}/>
          <span className="mono" title={idea.updated_at?new Date(idea.updated_at).toLocaleString():undefined}>
            updated {relativeAge(idea.updated_at)}
          </span>
        </span>
      </span>
    </button>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────
function filterGroups(categories) {
  return [
    ["category", "Category", categories.map(c=>[c.name,c.name])],
    ["difficulty", "Difficulty", DIFFICULTIES.map(d=>[d,d])],
    ["devType", "Dev type", DEV_TYPES.map(d=>[d,d])],
    ["status", "Status", STATUSES.map(s=>[s,STATUS_LABEL[s]])],
    ["content", "Content", CONTENT_OPTIONS.map(c=>[c,c==="Made"?"Content made":"No content"])],
  ];
}

function FilterChip({ active, onClick, children }) {
  return <button aria-pressed={active} onClick={onClick} className={`chip${active?" on":""}`}>{children}</button>;
}

function FilterRow({ categories, filters, toggle }) {
  const ref=useEdgeFade();
  return (
    <div className="chip-row" ref={ref}>
      {filterGroups(categories).map(([key,label,options],g)=>(
        <div key={key} className="chip-group" role="group" aria-label={label}>
          {g>0&&<span className="chip-divider"/>}
          {options.map(([v,text])=><FilterChip key={v} active={filters[key].includes(v)} onClick={()=>toggle(key,v)}>{text}</FilterChip>)}
        </div>
      ))}
    </div>
  );
}

function ActiveChips({ categories, filters, toggle }) {
  const active=filterGroups(categories).flatMap(([key,,options])=>options.filter(([v])=>filters[key].includes(v)).map(([v,text])=>[key,v,text]));
  if(!active.length) return null;
  return (
    <div className="active-chips">
      {active.map(([key,v,text])=>(
        <button key={key+v} className="chip on chip-removable" aria-label={`Remove filter: ${text}`} onClick={()=>toggle(key,v)}>
          {text}<Icon name="close" size={14}/>
        </button>
      ))}
    </div>
  );
}

function FilterSheet({ categories, filters, toggle, count, shown, onClear, onClose }) {
  return (
    <Modal onClose={onClose} label="Filters">
      <h2 className="sheet-title">Filters</h2>
      {filterGroups(categories).map(([key,label,options])=>(
        <div key={key} className="filter-section">
          <p className="field-label">{label}</p>
          <div className="chip-wrap">
            {options.map(([v,text])=><FilterChip key={v} active={filters[key].includes(v)} onClick={()=>toggle(key,v)}>{text}</FilterChip>)}
          </div>
        </div>
      ))}
      <div className="sheet-actions">
        <button onClick={onClose} className="btn btn-neutral grow">Show {plural(shown,"idea")}</button>
        {count>0&&<button onClick={onClear} className="btn btn-ghost">Clear all</button>}
      </div>
    </Modal>
  );
}

// ── Screens ───────────────────────────────────────────────────────────────────
function BacklogScreen({ ideas, total, categories, filters, toggle, filterCount, clearFilters, search, setSearch, onOpen, onNew, onSpin, burstId, spinDisabled }) {
  return (
    <div className="screen backlog">
      <h1 className="sr-only">Backlog</h1>
      <div className="search-row">
        <label className="search">
          <Icon name="search"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ideas" aria-label="Search ideas"/>
        </label>
        <button onClick={onNew} className="btn btn-neutral new-idea"><Icon name="plus"/>New idea</button>
      </div>
      <FilterRow categories={categories} filters={filters} toggle={toggle}/>
      <div className="list-head">
        <span className="mono">{ideas.length} of {total}</span>
        {filterCount>0&&<button onClick={clearFilters} className="text-btn">Clear all</button>}
      </div>
      <div className="card-list">
        {ideas.map(p=><IdeaCard key={p.id} idea={p} categories={categories} burst={burstId===p.id} onOpen={onOpen}/>)}
        {ideas.length===0&&<p className="empty">{total?"No ideas match. Try fewer filters.":"No ideas yet. Add your first one."}</p>}
      </div>
      <button onClick={onSpin} disabled={spinDisabled} className="btn btn-cta fab"><Icon name="spin"/>Spin</button>
    </div>
  );
}

function WheelScreen({ pool, categories, filters, toggle, filterCount, clearFilters, autoSpin, onAutoSpinDone, onResult, onOpenFilters, onSpinClick }) {
  return (
    <div className="screen wheel-screen">
      <h1 className="sr-only">Wheel</h1>
      <div className="wheel-frame">
        <Wheel ideas={pool} autoSpin={autoSpin} onAutoSpinDone={onAutoSpinDone} onResult={onResult}/>
        {pool.length===0&&(
          <div className="wheel-empty-text">
            <p>No ideas match these filters</p>
            {filterCount>0&&<button onClick={clearFilters} className="btn btn-neutral">Clear filters</button>}
          </div>
        )}
      </div>
      {pool.length>0&&<p className="pool-count">Spinning from <span className="mono">{pool.length}</span> {pool.length===1?"idea":"ideas"}</p>}
      <ActiveChips categories={categories} filters={filters} toggle={toggle}/>
      <div className="wheel-actions">
        <button onClick={onSpinClick} disabled={!pool.length} className="btn btn-cta spin-btn">Spin</button>
        <button onClick={onOpenFilters} className="btn btn-ghost"><Icon name="filter"/>Filters{filterCount>0&&<span className="mono"> {filterCount}</span>}</button>
      </div>
    </div>
  );
}

const NEXT_STATUS = { idea: ["doing","Start building"], doing: ["completed","Mark completed"], completed: ["idea","Back to ideas"] };

function BoardScreen({ projects, categories, onOpen, onMove, burstId }) {
  const [column,setColumn]=useState("idea");
  return (
    <div className="screen board-screen">
      <h1 className="screen-title">Board</h1>
      <div className="board-switch">
        <Segmented label="Column" value={column} onChange={setColumn}
          options={STATUSES.map(s=>[s,`${STATUS_LABEL[s]} ${projects.filter(p=>p.status===s).length}`])}/>
      </div>
      <div className="board">
        {STATUSES.map(s=>{
          const items=projects.filter(p=>p.status===s);
          return (
            <section key={s} className={`column status-${s}${column===s?" current":""}`} aria-label={STATUS_LABEL[s]}>
              <h2 className="column-head"><Icon name={s}/>{STATUS_LABEL[s]}<span className="mono">{items.length}</span></h2>
              <div className="card-list">
                {items.map(p=>(
                  <div key={p.id} className="board-item">
                    <IdeaCard idea={p} categories={categories} burst={burstId===p.id} onOpen={onOpen}/>
                    <button className="btn btn-ghost btn-move" onClick={()=>onMove(p,NEXT_STATUS[s][0])}>{NEXT_STATUS[s][1]}</button>
                  </div>
                ))}
                {items.length===0&&<p className="empty">Nothing here.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CategoryManager({ categories, projects, online, onAdd, onRename, onDelete }) {
  const [newName,setNewName]=useState("");
  const [editing,setEditing]=useState(null);
  function add(){if(newName.trim()){onAdd(newName.trim());setNewName("");}}
  return (
    <>
      {!online&&<p className="note">Category changes need a connection. You can still look at them here.</p>}
      <div className="cat-add">
        <input value={newName} disabled={!online} onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder="New category" aria-label="New category" className="input"/>
        <button disabled={!online} onClick={add} className="btn btn-neutral">Add</button>
      </div>
      <div className="cat-list">
        {categories.map(c=>{
          const count=projects.filter(p=>p.categoryIds.includes(c.id)).length;
          return (
            <div key={c.id} className="cat-row">
              {editing===c.id?(
                <input autoFocus defaultValue={c.name} className="input" aria-label={`Rename ${c.name}`}
                  onBlur={e=>{onRename(c.id,e.target.value);setEditing(null);}}
                  onKeyDown={e=>{if(e.key==="Enter"){onRename(c.id,e.target.value);setEditing(null);}}}/>
              ):(
                <button className="cat-name" disabled={!online} aria-label={`Rename ${c.name}`} onClick={()=>setEditing(c.id)}>
                  {c.name}<span className="mono">{count}</span>
                </button>
              )}
              {online&&<button className="icon-btn danger" aria-label={`Delete ${c.name}`} onClick={()=>onDelete(c.id)}><Icon name="trash"/></button>}
            </div>
          );
        })}
        {categories.length===0&&<p className="empty">No categories yet.</p>}
      </div>
    </>
  );
}

function SettingsScreen({ theme, setTheme, tick, setTick, categories, projects, online, onAdd, onRename, onDelete }) {
  return (
    <div className="screen settings-screen">
      <h1 className="screen-title">Settings</h1>
      <section className="settings-section">
        <h2 className="section-title">Appearance</h2>
        <Segmented label="Theme" value={theme} onChange={setTheme} options={[["system","System"],["light","Light"],["dark","Dark"]]}/>
      </section>
      {"vibrate" in navigator&&(
        <section className="settings-section">
          <h2 className="section-title">Spin</h2>
          <label className="toggle-row">
            <span>Tick while the wheel spins<span className="muted small">A small vibration at each slice, where the phone supports it.</span></span>
            <input type="checkbox" checked={tick} onChange={e=>setTick(e.target.checked)}/>
          </label>
        </section>
      )}
      <section className="settings-section">
        <h2 className="section-title">Categories</h2>
        <CategoryManager categories={categories} projects={projects} online={online} onAdd={onAdd} onRename={onRename} onDelete={onDelete}/>
      </section>
    </div>
  );
}

// ── Idea detail ───────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select value={value} onChange={e=>onChange(e.target.value)} className="input select">
        {options.map(([v,text])=><option key={v} value={v}>{text}</option>)}
      </select>
    </Field>
  );
}

const NEW_IDEA = { name:"",description:"",difficulty:"Medium",dev_type:"Assisted",status:"idea",link:"",has_content:false,notes:"",categoryIds:[] };

function IdeaDetail({ idea, categories, onSave, onDelete, onClose }) {
  const [form,setForm]=useState(idea||NEW_IDEA);
  const [preview,setPreview]=useState(false);
  const [desktop]=useState(isDesktop);
  useBackToClose(onClose,!desktop);
  function set(k,v){setForm(f=>({...f,[k]:v}));}
  function toggleCat(id){setForm(f=>({...f,categoryIds:f.categoryIds.includes(id)?f.categoryIds.filter(c=>c!==id):[...f.categoryIds,id]}));}
  const links=splitLinks(form.link);
  return (
    <aside className="detail" aria-label={idea?"Edit idea":"New idea"}>
      <div className="detail-head">
        <button className="icon-btn" aria-label="Back" onClick={onClose}><Icon name="back"/></button>
        <h2 className="detail-title">{idea?"Edit idea":"New idea"}</h2>
        {idea&&<button className="icon-btn danger" aria-label="Delete idea" onClick={()=>onDelete(idea)}><Icon name="trash"/></button>}
      </div>
      <div className="detail-body">
        <Field label="Title"><input value={form.name} onChange={e=>set("name",e.target.value)} className="input"/></Field>
        <div className="field">
          <div className="field-top">
            <span className="field-label">Description</span>
            <button type="button" className="text-btn" onClick={()=>setPreview(!preview)}>{preview?"Write":"Preview"}</button>
          </div>
          {preview
            ?<div className="preview"><Markdown source={form.description}/></div>
            :<textarea value={form.description||""} onChange={e=>set("description",e.target.value)} rows={4} className="input" aria-label="Description, markdown is supported" placeholder="Markdown works here"/>}
        </div>
        <div className="field">
          <span className="field-label">Categories</span>
          <div className="chip-wrap">
            {categories.map(c=><FilterChip key={c.id} active={form.categoryIds.includes(c.id)} onClick={()=>toggleCat(c.id)}>{c.name}</FilterChip>)}
            {categories.length===0&&<span className="muted small">Add categories in Settings.</span>}
          </div>
        </div>
        <div className="field-grid">
          <Select label="Difficulty" value={form.difficulty} onChange={v=>set("difficulty",v)} options={DIFFICULTIES.map(d=>[d,d])}/>
          <Select label="Dev type" value={form.dev_type} onChange={v=>set("dev_type",v)} options={DEV_TYPES.map(d=>[d,d])}/>
          <Select label="Status" value={form.status} onChange={v=>set("status",v)} options={STATUSES.map(s=>[s,STATUS_LABEL[s]])}/>
          <Select label="Content" value={form.has_content?"Made":"Not made"} onChange={v=>set("has_content",v==="Made")} options={[["Made","Content made"],["Not made","No content"]]}/>
        </div>
        <Field label="Links">
          <textarea value={form.link||""} onChange={e=>set("link",e.target.value)} rows={2} className="input" placeholder="One link per line"/>
        </Field>
        {links.map(l=>safeUrl(l)&&(
          <a key={l} className="open-link" href={safeUrl(l)} target="_blank" rel="noreferrer"><Icon name="link"/><span>{l}</span></a>
        ))}
        <Field label="Notes"><textarea value={form.notes||""} onChange={e=>set("notes",e.target.value)} rows={4} className="input"/></Field>
      </div>
      <div className="detail-actions">
        <button onClick={()=>onSave(form)} disabled={!form.name.trim()} className="btn btn-neutral grow">Save</button>
        <button onClick={onClose} className="btn btn-ghost">Cancel</button>
      </div>
    </aside>
  );
}

// ── Spin result ───────────────────────────────────────────────────────────────
function ResultSheet({ idea, categories, onStart, onAgain, onClose }) {
  const catNames=(idea.categoryIds||[]).map(id=>categories.find(c=>c.id===id)?.name).filter(Boolean);
  const summary=plainText(idea.description);
  return (
    <Modal onClose={onClose} className="result" label="Spin result">
      <h2 className="result-title">{idea.name}</h2>
      {summary&&<p className="result-desc">{summary}</p>}
      <div className="result-meta">
        {catNames.map(c=><Tag key={c}>{c}</Tag>)}
        <span className="result-difficulty"><DifficultyDots level={idea.difficulty}/>{idea.difficulty}</span>
        <Tag>{idea.dev_type}</Tag>
      </div>
      <div className="sheet-actions">
        <button onClick={onStart} className="btn btn-cta grow">Start building</button>
        <button onClick={onAgain} className="btn btn-ghost">Spin again</button>
      </div>
    </Modal>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [saved]=useState(localData);
  const [loaded,setLoaded]=useState(!!saved);
  const [projects,setProjects]=useState(saved?.projects||[]);
  const [categories,setCategories]=useState(saved?.categories||[]);
  const [sync,setSync]=useState({connection:"online",pending:queuedCount()});
  const [notice,setNotice]=useState(null);
  const [view,setView]=useState(VIEWS.includes(history.state?.view)?history.state.view:"backlog");
  const [search,setSearch]=useState("");
  const [filters,setFilters]=useState(NO_FILTERS);
  const [result,setResult]=useState(null);
  const [announce,setAnnounce]=useState("");
  const [selected,setSelected]=useState(null); // an idea's id, or "new"
  const [showFilters,setShowFilters]=useState(false);
  const [autoSpin,setAutoSpin]=useState(false);
  const [burstId,setBurstId]=useState(null);
  const [theme,setThemeState]=useState(()=>{try{return localStorage.getItem("whirl.theme")||"system";}catch{return "system";}});
  const [tick,setTickState]=useState(()=>{try{return localStorage.getItem("whirl.tick")==="on";}catch{return false;}});

  function setTheme(next){
    window.setWhirlTheme(next);
    try{
      if(next==="system") localStorage.removeItem("whirl.theme");
      else localStorage.setItem("whirl.theme",next);
    }catch{/* blocked storage: lasts this visit only */}
    setThemeState(next);
  }
  function setTick(on){
    try{localStorage.setItem("whirl.tick",on?"on":"off");}catch{/* blocked storage */}
    setTickState(on);
  }

  const show=useCallback((data)=>{
    if(!data) return;
    setProjects(data.projects);setCategories(data.categories);setLoaded(true);
  },[]);

  // Send anything queued, then fetch the latest; falls back to the saved copy offline.
  const refresh=useCallback(async()=>{
    const { connection:afterFlush, failed }=await flushQueue();
    if(failed.length) setNotice(`Couldn't save ${failed.map(f=>`"${f.label}"`).join(", ")}: ${failed[0].reason}`);
    const { data, connection }=await fetchData(afterFlush);
    show(data);
    setSync({connection,pending:queuedCount()});
    setLoaded(true);
  },[show]);

  useEffect(()=>{
    Promise.resolve().then(refresh);
    function whenVisible(){if(document.visibilityState==="visible")refresh();}
    function onPop(e){setView(VIEWS.includes(e.state?.view)?e.state.view:"backlog");}
    window.addEventListener("online",refresh);
    document.addEventListener("visibilitychange",whenVisible);
    window.addEventListener("popstate",onPop);
    const timer=setInterval(()=>{if(queuedCount()>0)refresh();},30000);
    return ()=>{
      window.removeEventListener("online",refresh);
      document.removeEventListener("visibilitychange",whenVisible);
      window.removeEventListener("popstate",onPop);
      clearInterval(timer);
    };
  },[refresh]);

  // Backlog is home. Other tabs sit one step above it, so back always returns to the Backlog.
  function goTo(v){
    if(v===view) return;
    setSelected(null);
    if(v==="backlog"){
      if(history.state?.pushed) history.back();
      else{history.replaceState({view:v},"");setView(v);}
    }
    else if(history.state?.pushed){history.replaceState({view:v,pushed:true},"");setView(v);}
    else{history.pushState({view:v,pushed:true},"");setView(v);}
  }

  const toggle=(group,value)=>setFilters(f=>({...f,[group]:f[group].includes(value)?f[group].filter(x=>x!==value):[...f[group],value]}));
  const clearFilters=()=>setFilters(NO_FILTERS);
  const filterCount=Object.values(filters).reduce((n,list)=>n+list.length,0);

  function matchesFilters(p){
    if(filters.category.length){
      const ids=categories.filter(c=>filters.category.includes(c.name)).map(c=>c.id);
      if(!ids.some(id=>p.categoryIds.includes(id))) return false;
    }
    if(filters.difficulty.length&&!filters.difficulty.includes(p.difficulty)) return false;
    if(filters.devType.length&&!filters.devType.includes(p.dev_type)) return false;
    if(filters.status.length&&!filters.status.includes(p.status)) return false;
    if(filters.content.length&&!filters.content.some(f=>(f==="Made")===!!p.has_content)) return false;
    return true;
  }
  const query=search.toLowerCase();
  const backlog=projects.filter(p=>matchesFilters(p)&&(!query||p.name.toLowerCase().includes(query)||(p.description||"").toLowerCase().includes(query)));
  // The wheel picks what to build next, so it spins ideas unless a status filter says otherwise
  const pool=projects.filter(p=>matchesFilters(p)&&(filters.status.length||p.status==="idea"));

  // Project changes go through the device queue, so they work the same online and offline.
  function queueChange(op){
    enqueue(op);
    show(localData());
    setSync(s=>({...s,pending:queuedCount()}));
    refresh();
  }

  function celebrate(id){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setBurstId(id);
    setTimeout(()=>setBurstId(b=>b===id?null:b),650);
  }

  function saveIdea(form){
    const {categoryIds,...fields}=form;
    fields.link=(fields.link||"").trim()||null;
    if(fields.id){
      // Only the fields that changed, so a late replay can't undo newer edits to other fields
      const before=projects.find(p=>p.id===fields.id)||{};
      const changes={};
      PROJECT_FIELDS.forEach(k=>{if(fields[k]!==before[k]) changes[k]=fields[k];});
      const sameCats=[...categoryIds].sort().join()===[...(before.categoryIds||[])].sort().join();
      if(!sameCats) changes.categoryIds=categoryIds;
      if(Object.keys(changes).length) queueChange({method:"PATCH",path:`/projects/${fields.id}`,body:changes,label:fields.name});
      if(changes.status==="completed") celebrate(fields.id);
    } else {
      queueChange({method:"POST",path:"/projects",body:{...fields,id:crypto.randomUUID(),categoryIds},label:fields.name});
    }
    setSelected(null);
  }

  function deleteIdea(idea){
    if(!confirm("Delete this idea?"))return;
    queueChange({method:"DELETE",path:`/projects/${idea.id}`,label:idea.name});
    setSelected(null);
  }

  function moveIdea(p,status){
    queueChange({method:"PATCH",path:`/projects/${p.id}`,body:{status},label:p.name});
    if(status==="completed") celebrate(p.id);
  }

  function startBuilding(p){
    moveIdea(p,"doing");
    setResult(null);
    setAnnounce("");
  }

  function requestSpin(){
    setResult(null);
    goTo("wheel");
    setAutoSpin(true);
  }

  function onSpinResult(p){
    setAutoSpin(false);
    setResult(p);
    setAnnounce(`Picked ${p.name}`);
  }

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
    if(!confirm("Remove this category? Ideas won't be deleted."))return;
    categoryChange(()=>api("DELETE",`/categories/${id}`));
  }

  const selectedIdea=selected&&selected!=="new"?projects.find(p=>p.id===selected):null;
  const showDetail=selected==="new"||!!selectedIdea;
  const hasPane=view==="backlog"||showDetail;

  return (
    <div className="shell">
      <header className="header">
        <div className="brand"><Mark/><span className="wordmark">Whirl</span></div>
        <nav className="top-nav" aria-label="Main">
          {NAV.map(([v,icon,label])=>(
            <button key={v} aria-current={view===v?"page":undefined} onClick={()=>goTo(v)} className={`top-nav-btn${view===v?" on":""}`}><Icon name={icon}/>{label}</button>
          ))}
        </nav>
        <div className="header-end">
          {sync.connection==="offline"&&<span className="pill-status">Offline · changes will sync</span>}
          {sync.connection==="online"&&sync.pending>0&&<span className="pill-status">Saving {sync.pending}…</span>}
          <button onClick={()=>view==="wheel"?setAutoSpin(true):requestSpin()} disabled={!pool.length} className="btn btn-cta header-spin"><Icon name="spin"/>Spin</button>
        </div>
      </header>

      {sync.connection==="login"&&(
        <div className="banner">
          <span>Your login expired.{sync.pending>0&&` ${plural(sync.pending,"change")} saved on this device.`}</span>
          <button className="btn btn-ghost btn-small" onClick={()=>location.reload()}>Sign in</button>
        </div>
      )}
      {notice&&(
        <div className="banner banner-danger" role="alert">
          <span className="banner-text"><Icon name="alert"/>{notice}</span>
          <button className="btn btn-ghost btn-small" onClick={()=>setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className={`content${hasPane?" has-pane":""}`}>
        <main className="main">
          {view==="backlog"&&(
            <BacklogScreen ideas={backlog} total={projects.length} categories={categories} filters={filters} toggle={toggle}
              filterCount={filterCount} clearFilters={clearFilters} search={search} setSearch={setSearch} burstId={burstId}
              onOpen={setSelected} onNew={()=>setSelected("new")} onSpin={requestSpin} spinDisabled={!pool.length}/>
          )}
          {view==="wheel"&&(loaded||projects.length>0)&&(
            <WheelScreen pool={pool} categories={categories} filters={filters} toggle={toggle} filterCount={filterCount} clearFilters={clearFilters}
              autoSpin={autoSpin} onAutoSpinDone={()=>setAutoSpin(false)} onResult={onSpinResult}
              onOpenFilters={()=>setShowFilters(true)} onSpinClick={()=>setAutoSpin(true)}/>
          )}
          {view==="board"&&<BoardScreen projects={projects} categories={categories} onOpen={setSelected} onMove={moveIdea} burstId={burstId}/>}
          {view==="settings"&&(
            <SettingsScreen theme={theme} setTheme={setTheme} tick={tick} setTick={setTick} categories={categories} projects={projects}
              online={sync.connection==="online"} onAdd={addCategory} onRename={renameCategory} onDelete={deleteCategory}/>
          )}
        </main>
        {showDetail
          ?<IdeaDetail key={selected} idea={selectedIdea} categories={categories} onSave={saveIdea} onDelete={deleteIdea} onClose={()=>setSelected(null)}/>
          :hasPane&&<div className="detail-empty"><Mark size={48}/><p>Pick an idea to see its details.</p></div>}
      </div>

      <nav className="bottom-nav" aria-label="Main">
        {NAV.map(([v,icon,label])=>(
          <button key={v} aria-current={view===v?"page":undefined} onClick={()=>goTo(v)} className={`tab${view===v?" on":""}`}><Icon name={icon}/>{label}</button>
        ))}
      </nav>

      <div className="sr-only" aria-live="polite">{announce}</div>

      {result&&<ResultSheet idea={result} categories={categories} onStart={()=>startBuilding(result)} onAgain={()=>{setResult(null);setAutoSpin(true);}} onClose={()=>setResult(null)}/>}
      {showFilters&&<FilterSheet categories={categories} filters={filters} toggle={toggle} count={filterCount} shown={pool.length} onClear={clearFilters} onClose={()=>setShowFilters(false)}/>}
    </div>
  );
}
