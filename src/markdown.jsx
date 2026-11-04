// A small markdown renderer for descriptions: headings, lists, bold, italics, code and links.
// It builds React elements, never HTML strings, so stored text can't inject anything.
import { safeUrl } from "./text.js";

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text) {
  return text.split(INLINE).map((part, i) => {
    if (/^\*\*.+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*.+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^`.+`$/.test(part)) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[(.+)\]\((.+)\)$/);
    if (link) {
      const href = safeUrl(link[2]);
      return href ? <a key={i} href={href} target="_blank" rel="noreferrer">{link[1]}</a> : link[1];
    }
    return part;
  });
}

export function Markdown({ source }) {
  const blocks = [];
  let list = null;
  (source || "").split("\n").forEach((line) => {
    const item = line.match(/^\s*[-*+]\s+(.*)/);
    if (item) {
      if (!list) { list = []; blocks.push({ list }); }
      list.push(item[1]);
      return;
    }
    list = null;
    const heading = line.match(/^#{1,6}\s+(.*)/);
    if (heading) blocks.push({ heading: heading[1] });
    else if (line.trim()) blocks.push({ text: line });
  });
  if (!blocks.length) return <p className="muted">Nothing to preview yet.</p>;
  return (
    <div className="markdown">
      {blocks.map((b, i) => {
        if (b.list) return <ul key={i}>{b.list.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>;
        if (b.heading) return <h4 key={i}>{inline(b.heading)}</h4>;
        return <p key={i}>{inline(b.text)}</p>;
      })}
    </div>
  );
}
