// The Desk's drawing kit: newsprint, ink and one red pencil; the type (a
// 19th-century news serif for copy, the wire's monospace for apparatus);
// hairline rules; and the story model every role shares.
//
// Sizes go through u(n) so the desk keeps its proportions at any app zoom.
// A hairline is half a logical pixel: one device pixel on a Retina screen.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { settings, spaces, agents, home } from "herdr";

export const C = {
  paper: "#f4efe2",
  desk: "#e9e2d1",
  sheet: "#f8f4ea",
  mark: "#e4dac6",
  ink: "#1c1b18",
  inkSoft: "#3d3a33",
  muted: "#5a554b",
  dim: "#6d675b",
  rule: "#1c1b1840",
  ruleHard: "#1c1b18",
  red: "#b3261e",
  redWash: "#b3261e1f",
  filed: "#2f5e24",
};

export const SERIF = "Old Standard TT";
export const WIRE = "JetBrains Mono";

export function unit() {
  // Herdr already scales mod px by the app zoom (AGENTS.md), so sizes pass
  // through as designed; dividing by zoom made content outgrow its block.
  const u = (n) => n;
  return u;
}

/** Every role's root: the news serif in ink on newsprint. */
export function root(u, el, size = 13) {
  return el.font_family(SERIF).text_size(u(size)).line_height(`${u(size * 1.3)}px`).text_color(C.ink);
}

/** Apparatus text: the wire's monospace, small and spaced. */
export function wire(u, text, o = {}) {
  let el = div()
    .flex_none()
    .font_family(WIRE)
    .text_size(u(o.size ?? 9.5))
    .text_color(o.color ?? C.muted)
    .child(String(text));
  if (o.bold) el = el.font_weight(700);
  return el;
}

/** A hairline rule across (or down, with vertical) its parent. */
export function hair(u, o = {}) {
  const color = o.color ?? C.rule;
  return o.vertical ? div().flex_none().w(u(0.5)).h_full().bg(color) : div().flex_none().h(u(0.5)).w_full().bg(color);
}

/** The newspaper's thick-and-thin double rule. */
export function doubleRule(u) {
  return div()
    .flex_none()
    .w_full()
    .flex()
    .flex_col()
    .gap(u(2))
    .child(div().h(u(2)).w_full().bg(C.ruleHard))
    .child(div().h(u(0.5)).w_full().bg(C.ruleHard));
}

/** A text button in the desk's voice: wire caps, ink, an underline on hover. */
export function mark(u, id, label, onClick, o = {}) {
  const color = o.color ?? C.ink;
  let el = div()
    .id(id)
    .flex_none()
    .px(u(o.px ?? 7))
    .py(u(3))
    .font_family(WIRE)
    .text_size(u(o.size ?? 9.5))
    .font_weight(700)
    .text_color(color)
    .cursor_pointer()
    .hover((s) => s.bg(o.solid ? C.inkSoft : o.dark ? "#f4efe224" : C.mark))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((e, cx) => {
      cx.stop_propagation();
      onClick?.(e, cx);
    })
    .child(label);
  if (o.solid) el = el.bg(color).text_color(C.paper);
  else if (o.boxed) el = el.border_1().border_color(color);
  if (o.disabled) el = el.opacity(0.4);
  if (o.tip) el = el.tooltip(o.tip);
  return el;
}

// ---- stories

export const STATUS = {
  blocked: { word: "HOLD FOR EDITOR", short: "HOLD", color: C.red, rank: 0 },
  done: { word: "FILED", short: "FILED", color: C.filed, rank: 1 },
  working: { word: "ON DEADLINE", short: "WORKING", color: C.ink, rank: 2 },
  idle: { word: "BUDGETED", short: "IDLE", color: C.dim, rank: 3 },
};

export function status(s) {
  return STATUS[s] ?? { word: "NO WORD", short: "—", color: C.dim, rank: 4 };
}

export function clean(s) {
  return String(s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

/** The machine a space lives on: its `machine`, else the id's "machine/" prefix. */
export function machineOf(space) {
  if (!space) return null;
  if (space.machine) return space.machine;
  const i = String(space.id ?? "").indexOf("/");
  return i > 0 ? space.id.slice(0, i) : null;
}

/** A terminal address hc can reach from here: "dev-vm/t12" for a remote one. */
export function qualify(address, machine) {
  if (!address || address.includes("/") || !machine) return address;
  return `${machine}/${address}`;
}

/** A newsroom slug from a name: "Build fix" -> "BUILD-FIX". */
export function slugify(s) {
  return clean(s).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "UNTITLED";
}

/** Every agent as a story, ranked: held first, then filed, on deadline, budgeted. */
export function stories() {
  const index = new Map();
  for (const s of spaces()) for (const t of s.tabs) index.set(t.id, { space: s, tab: t });
  return agents()
    .map((a) => {
      const where = index.get(a.tab);
      const space = where?.space;
      const tab = where?.tab;
      const title = clean(a.title);
      const headline = title && title !== a.program?.name ? title : tab?.named ? tab.name : `${a.program?.name ?? "Agent"} ${a.tab_index}`;
      return {
        ...a,
        space: space ?? null,
        tabInfo: tab ?? null,
        machine: machineOf(space),
        headline,
        slug: slugify(tab?.named ? tab.name : headline),
        spiked: Boolean(tab?.settled),
        since: a.status === "working" ? tab?.working_since ?? null : tab?.changed_at ?? null,
        target: qualify(a.address, machineOf(space)),
      };
    })
    .sort((a, b) => status(a.status).rank - status(b.status).rank || b.seq - a.seq);
}

/** Time on the story the way a desk says it: JUST IN, 12 MIN, 2 HR 05, 3 DAYS. */
export function age(ms) {
  if (ms == null) return "";
  const m = Math.floor(Math.max(0, Date.now() - ms) / 60000);
  if (m < 1) return "JUST IN";
  if (m < 60) return `${m} MIN`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} HR ${String(m % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)} DAYS`;
}

export function clockTime(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const pm = h >= 12;
  h = h % 12 || 12;
  return `${h}:${m} ${pm ? "P.M." : "A.M."}`;
}

export function shortPath(cwd) {
  if (!cwd) return "";
  const h = home();
  const p = cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
  const parts = p.split("/").filter(Boolean);
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : p;
}

export { h_flex };
