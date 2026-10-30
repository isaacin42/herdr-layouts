// The Pass's kit: the line's palette (stainless steel, ticket paper, the heat
// lamp), the two faces (VT323 for thermal tickets, Space Mono for label-maker
// tape), the ticket order on the rail, and the one selection every role shares.
//
// Pixels: sizes go through u(n) so the bundled faces land on whole pixels at
// any app zoom (the way Herdr 98 does it).

import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { settings, spaces, agents, home } from "herdr";

export const C = {
  steel: "#1b1f23",
  steelHi: "#2a3036",
  steelLo: "#121518",
  brushed: "#3a4148",
  railHi: "#c9d0d6",
  railLo: "#7d868e",
  paper: "#f6f1e3",
  paperShade: "#e9e1cb",
  ink: "#24211c",
  inkSoft: "#5d564a",
  lamp: "#ffb347",
  lampDeep: "#e8892a",
  lampInk: "#2a1604",
  call: "#d7332b",
  callInk: "#fff3ef",
  up: "#c99a1e",
  upInk: "#241a02",
  line: "#7fc1a6",
  hold: "#8a8f95",
  text: "#e9ecee",
  muted: "#a7afb6",
  dim: "#8f989f",
  tapeBlack: "#141414",
  tapeRed: "#b5231c",
  tapeBlue: "#1f4f8f",
};

export const TICKET = "VT323";
export const TAPE = "Space Mono";

export function unit() {
  // Herdr already scales mod px by the app zoom (AGENTS.md), so sizes pass
  // through as designed; dividing by zoom made content outgrow its block.
  return (n) => n;
}

export function root(u, el, size = 12) {
  return el.font_family(TAPE).text_size(u(size)).line_height(`${u(size + 4)}px`).text_color(C.text);
}

// ---- status words, as the line calls them

export const CALLS = {
  blocked: { word: "CALL", bg: C.call, fg: C.callInk },
  working: { word: "ON THE LINE", bg: null, fg: C.ink },
  done: { word: "ORDER UP", bg: C.up, fg: C.upInk },
  idle: { word: "ON HOLD", bg: null, fg: C.inkSoft },
};

export function call(s) {
  return CALLS[s] ?? CALLS.idle;
}

// ---- names

const WORD = /[A-Za-z0-9]+/g;

/** A space's station code: "web-app-server" -> "WAS", "api2" -> "API2". */
export function code(name) {
  const words = String(name ?? "").match(WORD) ?? [];
  if (!words.length) return "HOME";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
}

/** The ticket number: the terminal's own number, "dev-vm/t12" -> 12. */
export function number(address) {
  const m = String(address ?? "").match(/t(\d+)[a-z]*$/);
  return m ? m[1].padStart(2, "0") : "--";
}

export function clean(s) {
  return String(s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

/** Time on the rail, the way a kitchen screen counts it: 45S, 12M, 3H07. */
export function ago(ms) {
  if (ms == null) return "--";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}S`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}M`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}H${String(m % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}D`;
}

export function tabInfo(tabId) {
  for (const s of spaces()) for (const t of s.tabs) if (t.id === tabId) return { space: s, tab: t };
  return null;
}

export function shortPath(cwd) {
  if (!cwd) return "";
  const h = home();
  const p = cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
  const parts = p.split("/").filter(Boolean);
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : p;
}

// ---- the rail's order: calls pulled to the front, then the line by fire
// time (oldest first), the holds, and ORDER UP at the pass end.

const RANK = { blocked: 0, working: 1, idle: 2, done: 3 };

export function tickets() {
  return agents()
    .map((a) => {
      const info = tabInfo(a.tab);
      const since = a.status === "working" ? info?.tab.working_since : info?.tab.changed_at;
      return { ...a, info, since: since ?? null };
    })
    .sort((a, b) => (RANK[a.status] ?? 2) - (RANK[b.status] ?? 2) || (a.since ?? Infinity) - (b.since ?? Infinity));
}

// ---- the selected ticket, shared by the rail and the expo station.
// Kept on globalThis (one JS runtime for every copy), with waiters so a copy
// redraws itself when another copy changes the selection: no setShared, so
// picking a ticket doesn't re-render every mod in the window.

function store() {
  return (globalThis.__herdrPass ??= { sel: null, waiters: [], flash: null });
}

export function selected() {
  return store().sel;
}

export function select(address) {
  const s = store();
  if (s.sel === address) return;
  s.sel = address;
  wake();
}

/** Feedback the expo shows after a call, kept with the selection. */
export function flash(msg, ok = true) {
  store().flash = msg ? { msg, ok, at: Date.now() } : null;
  wake();
}

export function lastFlash() {
  return store().flash;
}

function wake() {
  const s = store();
  const w = s.waiters;
  s.waiters = [];
  w.forEach((r) => r());
}

export function changed() {
  return new Promise((r) => store().waiters.push(r));
}

/** The selected ticket, else the first CALL, else the first on the rail. */
export function current(list) {
  const sel = selected();
  return list.find((t) => t.address === sel) ?? list[0] ?? null;
}

// ---- label-maker tape: white embossed caps on colored tape

export function tape(u, text, color = C.tapeBlack, o = {}) {
  return div()
    .flex_none()
    .h(u(o.h ?? 20))
    .px(u(o.px ?? 8))
    .flex()
    .items_center()
    .rounded(u(2))
    .bg(color)
    .border_t(u(1))
    .border_color("#ffffff22")
    .font_family(TAPE)
    .font_weight(700)
    .text_size(u(o.size ?? 11))
    .text_color(o.ink ?? "#f4f4f2")
    .child(text);
}

/** A kitchen button: a steel plate with a lit top edge; `color` fills it. */
export function plate(u, id, label, onClick, o = {}) {
  const fill = o.fill ?? C.steelHi;
  return div()
    .id(id)
    .flex_none()
    .h(u(o.h ?? 30))
    .px(u(o.px ?? 12))
    .flex()
    .items_center()
    .justify_center()
    .rounded(u(3))
    .bg(fill)
    .border_t(u(1))
    .border_b(u(2))
    .border_color(o.edge ?? "#00000066")
    .font_family(TAPE)
    .font_weight(700)
    .text_size(u(o.size ?? 12))
    .text_color(o.ink ?? C.text)
    .cursor_pointer()
    .hover((s) => s.opacity(0.88))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((e, cx) => {
      cx.stop_propagation();
      onClick?.(e, cx);
    })
    .when(Boolean(o.tip), (el) => el.tooltip(o.tip))
    .child(label);
}

export function bell(u, size = 14) {
  return image("mods/pass/bell.svg").flex_none().w(u(size)).h(u(size));
}

export { h_flex };
