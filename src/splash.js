// The splash starts on its own from index.html and CSS. This decides when it leaves.
const LAND_MS = 700; // let the parts finish building, measured from page start
const LOAD_LIMIT_MS = 5000; // never hold the app behind the splash longer than this
const FLIGHT_MS = 450;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sleepUntil = (ms) => sleep(Math.max(0, ms - performance.now()));

let markReady;
const ready = new Promise((resolve) => { markReady = resolve; });

// The first screen has something to show: saved data, fresh data, or a known failure
export const appReady = () => markReady();

export async function dismissSplash() {
  const splash = document.getElementById("splash");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    await sleepUntil(reduced ? 200 : LAND_MS);
    await Promise.race([ready, sleepUntil(LOAD_LIMIT_MS)]);
    if (!reduced) await flyToHeader(splash);
  } finally {
    splash.remove();
  }
}

async function flyToHeader(splash) {
  const mark = splash.querySelector(".splash-mark");
  // Leave at the end of a whirl, when the wheel lines up with the real logo. The timeout
  // covers a page opened in the background, where the event can be held back.
  await Promise.race([
    new Promise((resolve) => splash.querySelector(".splash-whirl").addEventListener("animationiteration", resolve, { once: true })),
    sleep(900),
  ]);
  splash.classList.add("splash-leaving");

  const from = mark.getBoundingClientRect();
  const to = document.querySelector(".brand .mark").getBoundingClientRect();
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim();
  const timing = { duration: FLIGHT_MS, easing, fill: "forwards" };
  splash.querySelector(".splash-bg").animate([{ opacity: 1 }, { opacity: 0 }], timing);
  const flight = mark.animate([
    { transform: "none" },
    { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.height / from.height})` },
  ], timing);
  await Promise.race([flight.finished, sleep(FLIGHT_MS + 250)]);
}
