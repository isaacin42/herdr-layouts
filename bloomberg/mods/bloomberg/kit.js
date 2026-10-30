// Herdr Terminal's drawing kit: the Bloomberg palette, the type, keycaps,
// status words, tickers and the mnemonic table every role shares.
//
// Pixels: like Herdr 98, sizes go through u(n) so the bitmap-grid face
// (Departure Mono, an 11 px grid) lands on whole pixels whatever the app zoom.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { settings, spaces, agents, panes, focused, run, openOverlay, home } from "herdr";

export const C = {
  glass: "#000000",
  panel: "#0a0a0a",
  rule: "#262626",
  ruleHot: "#4a2f12",
  amber: "#fb8b1e",
  amberDim: "#c27420",
  amberInk: "#1a0e02",
  white: "#f2f2f2",
  gray: "#a3a3a3",
  dim: "#767676",
  red: "#ff433d",
  green: "#4af6c3",
  blue: "#0068ff",
  rowSel: "#0b2a66",
  keyYellow: "#f2c200",
  keyYellowLo: "#a68400",
  keyGreen: "#2bb24c",
  keyGreenLo: "#1a6e2f",
  keyRed: "#d6282b",
  keyRedLo: "#80171a",
  keyInk: "#0d0d0d",
};

export const UI = "Departure Mono";

export function unit() {
  // Herdr already scales mod px by the app zoom (AGENTS.md), so sizes pass
  // through as designed; dividing by zoom made content outgrow its block.
  const u = (n) => n;
  return u;
}

/** Every role's root: the grid face, 11 px, on glass. */
export function root(u, el, size = 11) {
  return el.font_family(UI).text_size(u(size)).line_height(`${u(size + 3)}px`).text_color(C.white);
}

// ---- status

export const STATUS = {
  working: { word: "WRKG", bg: C.amber, fg: C.amberInk },
  blocked: { word: "BLKD", bg: C.red, fg: "#1a0303" },
  done: { word: "DONE", bg: C.green, fg: "#02140f" },
  idle: { word: "IDLE", bg: null, fg: C.dim },
  unknown: { word: "----", bg: null, fg: C.dim },
};

export function status(s) {
  return STATUS[s] ?? STATUS.unknown;
}

/** A status cell: a filled 4-letter word, the way a quote cell shows a move. */
export function statusCell(u, s, o = {}) {
  const st = status(s);
  let el = div()
    .flex_none()
    .w(u(o.w ?? 36))
    .h(u(14))
    .flex()
    .items_center()
    .justify_center()
    .text_color(st.fg)
    .child(st.word);
  if (st.bg) el = el.bg(st.bg);
  return el;
}

// ---- names

const WORD = /[A-Za-z0-9]+/g;

/** A space's 4-character exchange code: "web-app-server" -> "WAS", "api2" -> "API2". */
export function code(name) {
  const words = String(name ?? "").match(WORD) ?? [];
  if (!words.length) return "HOME";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
}

/** A tab's ticker: space code + tab number, "WAS.1". */
export function ticker(spaceName, tabIndex) {
  return `${code(spaceName)}.${tabIndex}`;
}

/** Elapsed time the way a quote board shows it: 45S, 12M, 3H07, 2D. */
export function ago(ms) {
  if (ms == null) return "";
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

// ---- keycaps

const KEYS = {
  yellow: [C.keyYellow, C.keyYellowLo, C.keyInk],
  green: [C.keyGreen, C.keyGreenLo, "#04140a"],
  red: [C.keyRed, C.keyRedLo, "#fff1f1"],
  gray: ["#3a3a3a", "#1c1c1c", C.white],
};

/** A Bloomberg keyboard key: a cap with a lit top edge and a dark lip. `down`: pressed in. */
export function keycap(u, id, label, color, onClick, o = {}) {
  const [face, lip, ink] = KEYS[color] ?? KEYS.gray;
  const down = Boolean(o.down);
  let el = div()
    .id(id)
    .flex_none()
    .h(u(20))
    .px(u(o.px ?? 8))
    .flex()
    .items_center()
    .justify_center()
    .rounded(u(2))
    .bg(face)
    .text_color(ink)
    .border_t(u(down ? 0 : 1))
    .border_b(u(down ? 1 : 3))
    .border_color(down ? lip : lip)
    .when(down, (e) => e.opacity(0.82).mt(u(2)))
    .cursor_pointer()
    .hover((s) => s.opacity(0.9))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => {
      cx.stop_propagation();
      onClick?.(cx);
    })
    .child(o.content ?? label);
  if (o.min) el = el.min_w(u(o.min));
  if (o.tip) el = el.tooltip(o.tip);
  return el;
}

/** A field label, amber, the way Bloomberg prints every name beside its value. */
export function label(text, color = C.amber) {
  return div().flex_none().text_color(color).child(text);
}

// ---- the command line's keyboard, from any role: a mod command reaches only
// the copy listening (the command line), where setShared would re-render all.

export function focusCommandLine() {
  run("bloomberg.go", {});
}

export function openHelp() {
  openOverlay({ mod: "bloomberg", kind: "dialog", frame: "none", props: { role: "help" }, width: 720, height: 560 });
}

// ---- agents in board order: blocked first, then working, done, idle

const RANK = { blocked: 0, working: 1, done: 2, idle: 3 };

export function board() {
  return agents()
    .map((a) => ({ ...a, info: tabInfo(a.tab) }))
    .sort((a, b) => (RANK[a.status] ?? 4) - (RANK[b.status] ?? 4) || b.seq - a.seq);
}

function jumpTo(state) {
  const list = board().filter((a) => a.status === state);
  if (!list.length) return `NO ${status(state).word} AGENTS`;
  const cur = focused()?.terminal;
  const i = list.findIndex((a) => a.address === cur);
  run("agent.focus", { terminal: list[(i + 1) % list.length].address });
  return null;
}

function agentTab(argv, name) {
  return () => {
    run("tab.new", { argv, ...(name ? { name } : {}) });
    return null;
  };
}

// ---- mnemonics: [name, args hint, what it does, action(args) -> error text or null]

export const MNEMONICS = [
  ["HELP", "", "This page: every mnemonic", () => (openHelp(), null)],
  ["CLDE", "[TAB NAME]", "Claude Code in a new tab", (a) => agentTab(["claude"], a)()],
  ["CODX", "[TAB NAME]", "Codex in a new tab", (a) => agentTab(["codex"], a)()],
  ["TERM", "[TAB NAME]", "A shell in a new tab", (a) => (run("tab.new", a ? { name: a } : {}), null)],
  ["NEW", "<NAME> [@MACHINE]", "A new space, here or on a machine", (a) => {
    const m = a.match(/@(\S+)/);
    const name = a.replace(/@\S+/, "").trim();
    run("space.new", { ...(name ? { name } : {}), ...(m ? { machine: m[1] } : {}) });
    return null;
  }],
  ["SPLT", "[R|D]", "Split the focused panel right or down", (a) => {
    run("pane.split", { direction: /^d/i.test(a) ? "down" : "right" });
    return null;
  }],
  ["ZOOM", "", "Zoom or unzoom the focused panel", () => (run("pane.zoom", {}), null)],
  ["NEXT", "", "The next agent on the board", () => (run("agent.next", {}), null)],
  ["PREV", "", "The previous agent on the board", () => (run("agent.prev", {}), null)],
  ["BLKD", "", "Cycle through agents waiting on you", () => jumpTo("blocked")],
  ["DONE", "", "Cycle through agents that finished", () => jumpTo("done")],
  ["WRKG", "", "Cycle through agents still working", () => jumpTo("working")],
  ["RNAM", "<NAME>", "Rename this tab", (a) => (a ? (run("tab.rename", { name: a }), null) : "RNAM NEEDS A NAME")],
  ["SNAM", "<NAME>", "Rename this space", (a) => (a ? (run("space.rename", { name: a }), null) : "SNAM NEEDS A NAME")],
  ["AGNT", "", "Show or hide the agent monitor", () => (run("layout.toggle", { id: "monitor-col" }), null)],
  ["CHNG", "", "Show or hide the changes panel", () => (run("layout.toggle", { id: "changes" }), null)],
  ["NEWS", "", "Show or hide the news tape", () => (run("layout.toggle", { id: "tape" }), null)],
  ["PREF", "", "Herdr settings: look, machines, alerts, updates", () => (run("app.settings", {}), null)],
  ["LAYT", "[NAME]", "Switch layout; alone, back to Herdr", (a) => (run("layout.switch", { name: a ? a.toLowerCase() : "main" }), null)],
];

/** Runs a command line: "CLDE review", "NEW api3 @dev-vm", "3". Returns { ok, msg }. */
export function execute(line) {
  const text = line.trim();
  if (!text) return { ok: false, msg: "" };
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    const all = spaces();
    if (n < 1 || n > all.length) return { ok: false, msg: `NO SPACE ${n}. THERE ARE ${all.length}` };
    run("space.select", { index: n });
    return { ok: true, msg: `${code(all[n - 1].name)} <GO>` };
  }
  const [head, ...rest] = text.split(/\s+/);
  const word = head.toUpperCase();
  const m = MNEMONICS.find((x) => x[0] === word);
  if (!m) return { ok: false, msg: `UNKNOWN MNEMONIC ${word}. HELP <GO> LISTS THEM` };
  try {
    const err = m[3](rest.join(" "));
    return err ? { ok: false, msg: err } : { ok: true, msg: `${word} <GO>` };
  } catch (e) {
    return { ok: false, msg: `${word} FAILED: ${String(e).toUpperCase()}` };
  }
}

/** Mnemonics that start with what's typed (the first word). */
export function suggest(line) {
  const w = line.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  if (!w || /^\d+$/.test(w)) return [];
  return MNEMONICS.filter((m) => m[0].startsWith(w)).slice(0, 4);
}

export { h_flex, panes };
