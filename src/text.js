// Small text helpers shared by the screens.

// Markdown down to one plain line, for the idea card
export function plainText(markdown) {
  return (markdown || "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(#{1,6}|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function relativeAge(iso) {
  if (!iso) return "now";
  const minutes = (Date.now() - new Date(iso).getTime()) / 60000;
  if (minutes < 60) return "now";
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 30) return `${Math.floor(minutes / (60 * 24))}d`;
  if (minutes < 60 * 24 * 365) return `${Math.floor(minutes / (60 * 24 * 30))}mo`;
  return `${Math.floor(minutes / (60 * 24 * 365))}y`;
}

// Only web and mail links become clickable, so a stored "javascript:" can't run
export function safeUrl(url) {
  return /^(https?:\/\/|mailto:)/i.test(url.trim()) ? url.trim() : null;
}

export function splitLinks(text) {
  return (text || "").split("\n").map((line) => line.trim()).filter(Boolean);
}
