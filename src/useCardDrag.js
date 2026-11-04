import { useEffect, useLayoutEffect, useRef, useState } from "react";

const HOLD_MS = 300; // touch: hold this long to pick a card up, so a normal swipe still scrolls
const TOUCH_SLOP = 8; // touch: moving further than this before the hold ends means scrolling
const MOUSE_SLOP = 5; // mouse: moving further than this starts the drag, anything less is a click
const FINGER_GAP = 28;

// Drag a card onto any element marked data-drop="<status>". Uses pointer events, so
// mouse and touch share one path (HTML5 drag and drop doesn't work on phones).
export function useCardDrag(onDrop) {
  const [drag, setDrag] = useState(null); // { id, width, over } while a card is being carried
  const gesture = useRef(null);
  const root = useRef(null);
  const ghost = useRef(null);
  const swallowClick = useRef(false);
  const latestDrop = useRef(onDrop);
  useEffect(() => { latestDrop.current = onDrop; });

  // Moves come too often to re-render for each one, so the ghost is positioned directly
  function placeGhost() {
    const g = gesture.current;
    if (g && ghost.current) ghost.current.style.transform = `translate(${g.x - g.offsetX}px, ${g.y - g.offsetY}px)`;
  }
  useLayoutEffect(placeGhost, [drag]);

  // Has to be listening before the touch starts, or the browser scrolls without asking
  useEffect(() => {
    const node = root.current;
    const holdStill = (e) => { if (gesture.current?.active && e.cancelable) e.preventDefault(); };
    node.addEventListener("touchmove", holdStill, { passive: false });
    return () => {
      node.removeEventListener("touchmove", holdStill);
      gesture.current?.finish(false);
    };
  }, []);

  function startDrag(e, id, source) {
    if (e.button !== 0 || gesture.current) return;
    const node = e.currentTarget;
    const rect = node.getBoundingClientRect();
    const touch = e.pointerType !== "mouse";
    const g = {
      active: false, over: null, x: e.clientX, y: e.clientY,
      offsetX: e.clientX - rect.left,
      // On touch the card rides below the finger, so it doesn't cover the tabs being aimed at
      offsetY: touch ? -FINGER_GAP : e.clientY - rect.top,
    };
    const startX = e.clientX, startY = e.clientY, pointerId = e.pointerId;

    function begin() {
      g.active = true;
      swallowClick.current = true;
      // So letting go outside the window still ends the drag
      if (!touch) node.setPointerCapture(pointerId);
      document.documentElement.classList.add("card-dragging");
      setDrag({ id, width: rect.width, over: null });
    }

    function finish(drop) {
      clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      gesture.current = null;
      if (!g.active) return;
      document.documentElement.classList.remove("card-dragging");
      setDrag(null);
      setTimeout(() => { swallowClick.current = false; }, 50);
      if (drop && g.over) latestDrop.current(id, g.over);
    }
    g.finish = finish;

    function move(ev) {
      if (ev.pointerId !== pointerId) return;
      g.x = ev.clientX;
      g.y = ev.clientY;
      if (!g.active) {
        const distance = Math.hypot(g.x - startX, g.y - startY);
        if (touch) { if (distance > TOUCH_SLOP) finish(false); return; }
        if (distance <= MOUSE_SLOP) return;
        begin();
      }
      placeGhost();
      const target = document.elementFromPoint(g.x, g.y)?.closest("[data-drop]")?.dataset.drop ?? null;
      const over = target === source ? null : target;
      if (over !== g.over) {
        g.over = over;
        setDrag((d) => d && { ...d, over });
      }
    }
    const up = (ev) => { if (ev.pointerId === pointerId) finish(true); };
    const cancel = (ev) => { if (ev.pointerId === pointerId) finish(false); };
    const key = (ev) => { if (ev.key === "Escape") finish(false); };

    const timer = touch ? setTimeout(begin, HOLD_MS) : 0;
    gesture.current = g;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
  }

  const rootProps = {
    ref: root,
    // A drag that ends on its own card must not also open that card
    onClickCapture: (e) => { if (swallowClick.current) { e.preventDefault(); e.stopPropagation(); } },
    // Android's long-press menu would interrupt the hold
    onContextMenu: (e) => { if (gesture.current) e.preventDefault(); },
  };

  return { drag, ghost, rootProps, startDrag };
}
