// The hero. An SVG wheel: the winner is picked first, then the wheel animates to land on it.
import { useEffect, useMemo, useRef, useState } from "react";

const SIZE = 1000, CX = 500, CY = 530, R = 450, HUB = 64;
const MIN_SEGMENTS = 6, MAX_LABELLED = 16;
const LABEL_ROOM = R - HUB - 50;

const measure = document.createElement("canvas").getContext("2d");

function fitLabel(text, fontSize) {
  measure.font = `500 ${fontSize}px "DM Sans", system-ui, sans-serif`;
  if (measure.measureText(text).width <= LABEL_ROOM) return text;
  let cut = text;
  while (cut.length > 1 && measure.measureText(`${cut}…`).width > LABEL_ROOM) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function point(angleDeg, radius) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

function slicePath(from, to) {
  const [x1, y1] = point(from, R), [x2, y2] = point(to, R);
  return `M${CX} ${CY}L${x1} ${y1}A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}Z`;
}

// Amber, coral, teal in order. If that would put the last slice next to a matching first slice,
// the last one takes the middle colour.
function sliceColor(i, total) {
  if (i === total - 1 && total % 3 === 1) return "var(--wheel-2)";
  return `var(--wheel-${(i % 3) + 1})`;
}

function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tickEnabled() {
  try { return localStorage.getItem("whirl.tick") === "on" && "vibrate" in navigator; } catch { return false; }
}

export function Wheel({ ideas, autoSpin, onAutoSpinDone, onResult, onSpinningChange }) {
  const spinRef = useRef(null);
  const angleRef = useRef(0);
  const spinningRef = useRef(false);
  const ideasRef = useRef(ideas);
  const [angle, setAngle] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => { ideasRef.current = ideas; }, [ideas]);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => { if (live) setFontsReady(true); });
    return () => { live = false; };
  }, []);

  // With few ideas, repeat them so the wheel still looks like a wheel
  const segments = useMemo(() => {
    if (!ideas.length) return [];
    const copies = Math.ceil(MIN_SEGMENTS / ideas.length);
    const list = [];
    for (let c = 0; c < copies; c++) ideas.forEach((idea) => list.push(idea));
    return list;
  }, [ideas]);

  const slice = segments.length ? 360 / segments.length : 360;
  const showLabels = segments.length <= MAX_LABELLED;
  const fontSize = segments.length > 12 ? 34 : segments.length > 8 ? 38 : 42;
  const labels = useMemo(() => (
    showLabels ? segments.map((s) => fitLabel(s.name, fontSize)) : []
    // fontsReady: labels are measured again once DM Sans has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [segments, showLabels, fontSize, fontsReady]);

  function finish(winner) {
    spinningRef.current = false;
    onSpinningChange?.(false);
    onResult(winner);
  }

  function spin() {
    const pool = ideasRef.current;
    if (spinningRef.current || !pool.length) return;
    spinningRef.current = true;
    onSpinningChange?.(true);
    setHighlight(null);

    // Winner first, uniform over the pool; then one of its slices if it appears more than once
    const winner = pool[Math.floor(Math.random() * pool.length)];
    const slots = segments.flatMap((s, i) => (s.id === winner.id ? [i] : []));
    const slot = slots[Math.floor(Math.random() * slots.length)];

    if (reducedMotion()) {
      setHighlight(slot);
      finish(winner);
      return;
    }

    // Land somewhere inside the slice, not always dead centre
    const offset = (Math.random() - 0.5) * slice * 0.8;
    const target = 360 - ((slot + 0.5) * slice + offset);
    const current = angleRef.current;
    const toTarget = ((target - current) % 360 + 360) % 360;
    const turns = 5 + Math.floor(Math.random() * 3);
    const next = current + turns * 360 + toTarget;
    angleRef.current = next;
    setAnimate(true);
    setAngle(next);

    let lastBoundary = null;
    const tick = tickEnabled();
    function watch() {
      if (!spinningRef.current || !spinRef.current) return;
      const m = getComputedStyle(spinRef.current).transform.match(/matrix\(([^,]+), ([^,]+)/);
      if (m) {
        const deg = (Math.atan2(+m[2], +m[1]) * 180) / Math.PI;
        const boundary = Math.floor((deg + 360) / slice);
        if (lastBoundary !== null && boundary !== lastBoundary) navigator.vibrate(5);
        lastBoundary = boundary;
      }
      requestAnimationFrame(watch);
    }
    if (tick) requestAnimationFrame(watch);

    const node = spinRef.current;
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      node?.removeEventListener("transitionend", onEnd);
      finish(winner);
    };
    // Slices have their own transitions, and those bubble up here too
    const onEnd = (e) => { if (e.target === node && e.propertyName === "transform") end(); };
    node?.addEventListener("transitionend", onEnd);
    // In case the transition never reports back, such as in a hidden tab
    const duration = getComputedStyle(document.documentElement).getPropertyValue("--spin-duration").trim();
    const ms = parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000);
    setTimeout(end, ms + 300);
  }

  // The Spin buttons in the header and on the Backlog ask for a spin from outside
  useEffect(() => {
    if (!autoSpin) return;
    const t = setTimeout(() => { spin(); onAutoSpinDone(); }, 60);
    return () => clearTimeout(t);
  });

  if (!segments.length) {
    return (
      <svg className="wheel wheel-empty" viewBox={`0 0 ${SIZE} ${SIZE + 40}`} role="img" aria-label="Wheel with 0 ideas">
        <circle cx={CX} cy={CY} r={R} className="wheel-disc"/>
      </svg>
    );
  }

  return (
    <svg className={`wheel${highlight !== null ? " wheel-picked" : ""}`} viewBox={`0 0 ${SIZE} ${SIZE + 40}`}
      role="img" aria-label={`Wheel with ${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"}`} onClick={spin}>
      <g ref={spinRef} className={`wheel-spin${animate ? " spinning" : ""}`} style={{ transform: `rotate(${angle}deg)` }}>
        {segments.map((s, i) => (
          <path key={i} d={slicePath(i * slice, (i + 1) * slice)} data-name={s.name}
            fill={sliceColor(i, segments.length)} className={`wheel-slice${highlight === i ? " picked" : ""}`}/>
        ))}
        {showLabels && segments.map((s, i) => {
          const mid = (i + 0.5) * slice;
          const [x, y] = point(mid, R - 28);
          return (
            <text key={i} x={x} y={y} fontSize={fontSize} dominantBaseline="central" textAnchor="end"
              className="wheel-label" transform={`rotate(${mid - 90} ${x} ${y})`}>
              {labels[i]}
            </text>
          );
        })}
      </g>
      <circle cx={CX} cy={CY} r={HUB} className="wheel-hub"/>
      <polygon points={`${CX - 42},8 ${CX + 42},8 ${CX},${CY - R + 30}`} className="wheel-pointer"/>
    </svg>
  );
}
