// Orienteering's kit: the ISOM map inks, the condensed face, units, tickers,
// the course (who needs you, in what order) and the hc steering calls every
// role shares.

import { div, image } from "gpui-kit";
import { settings, spaces, agents, machines, hc, run, shared, setShared, openOverlay } from "herdr";

// ISOM 2017 inks, set for a screen: white forest ground, yellow open land,
// olive/green vegetation, brown landforms, blue water, black rock and text,
// and the overprint purple reserved for the course.
export const C = {
  forest: "#ffffff",
  paper: "#fbfaf6",
  open: "#ffd27a",
  rough: "#ffe7b0",
  green: "#b8e0a3",
  olive: "#5f9e3c",
  brown: "#c4691e",
  brownInk: "#8a4512",
  blue: "#2ea3dc",
  blueInk: "#0f6f9e",
  black: "#1d1d1b",
  gray: "#5c5a55",
  dim: "#7a776f",
  rule: "#1d1d1b",
  hair: "#d8d4c8",
  purple: "#b0208e",
  purpleInk: "#8c1670",
  purpleWash: "#f6e3f0",
  red: "#c8102e",
};

export const UI = "Barlow Condensed";
export const ART = "mods/orienteering/art";

export function unit() {
  // Herdr already scales mod px by the app zoom (AGENTS.md), so sizes pass
  // through as designed; dividing by zoom made content outgrow its block.
  const u = (n) => n;
  return u;
}

export function root(u, el, size = 13) {
  return el.font_family(UI).font_weight(500).text_size(u(size)).line_height(`${u(size + 3)}px`).text_color(C.black);
}

// ---- names

const WORD = /[A-Za-z0-9]+/g;

/** A space's control code: "web-app-server" -> "WAS", "api2" -> "API2". */
export function code(name) {
  const words = String(name ?? "").match(WORD) ?? [];
  if (!words.length) return "HOME";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 4).toUpperCase();
}

export function ticker(a) {
  return `${code(a.space_name)}.${a.tab_index}`;
}

export function clean(s) {
  return String(s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

export function feature(a) {
  return clean(a.title) || a.program?.name || "agent";
}

export function ago(ms) {
  if (ms == null) return "";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "<1m";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h${String(m % 60).padStart(2, "0")}`;
  return `${Math.floor(h / 24)}d`;
}

export function tabInfo(tabId) {
  for (const s of spaces()) for (const t of s.tabs) if (t.id === tabId) return { space: s, tab: t };
  return null;
}

/** "This Mac" or the machine's name, upper case for map type. */
export function machineName(m) {
  return m ? m.toUpperCase() : "THIS MAC";
}

/** Machines whose layout can't be read right now (offline cores): drawn as marsh. */
export function unreachable() {
  const out = new Set();
  for (const m of machines()) if (m.name && m.layout === "unavailable") out.add(m.name);
  return out;
}

// ---- status as map symbols (ISOM numbers in the legend)

export const STATE = {
  blocked: { word: "NEEDS YOU", short: "CALL", symbol: "control" },
  done: { word: "FINISHED", short: "FINISH", symbol: "finish" },
  working: { word: "RUNNING", short: "RUN", symbol: "knoll" },
  idle: { word: "AT REST", short: "REST", symbol: "boulder" },
};

export function state(s) {
  return STATE[s] ?? STATE.idle;
}

// ---- punched controls: address -> the state token when punched. A control
// comes back when the agent changes state again (a new token); a terminal
// title changing (spinners) does not bring it back.
// One copy owns writes; the store is read once per copy and kept in memory.

export function loadPunched() {
  const v = shared("orient.punched");
  return v && typeof v === "object" ? { ...v } : {};
}

export function savePunched(p) {
  setShared("orient.punched", p);
}

export function token(a) {
  return `${a.status}@${a.info?.tab.changed_at ?? 0}`;
}

/** The course: agents that need the runner, unpunched, blocked first then
 *  finished, oldest change first within each. Everything else is terrain. */
export function course(punched) {
  const all = agents().map((a) => ({ ...a, info: tabInfo(a.tab) }));
  const when = (a) => a.info?.tab.changed_at ?? Number.MAX_SAFE_INTEGER;
  const live = (a) => punched[a.address] !== token(a);
  const blocked = all.filter((a) => a.status === "blocked" && live(a)).sort((a, b) => when(a) - when(b));
  const done = all.filter((a) => a.status === "done" && live(a)).sort((a, b) => when(a) - when(b));
  const controls = [...blocked, ...done];
  const inCourse = new Set(controls.map((a) => a.address));
  const punchedList = all.filter((a) => (a.status === "blocked" || a.status === "done") && !live(a));
  const terrain = all.filter((a) => !inCourse.has(a.address) && !punchedList.includes(a));
  return { all, controls, terrain, punched: punchedList };
}

// ---- steering through herdr-core. Addresses are machine-qualified already
// ("dev-vm/t12"), so the local hc reaches the agent where it runs.

async function call(args) {
  try {
    const r = await hc(args);
    if (r.code === 0) return { ok: true };
    const err = (r.stderr || r.stdout || "").trim().split("\n").pop();
    return { ok: false, msg: err || `hc ${args[0]} failed` };
  } catch (e) {
    return { ok: false, msg: String(e) };
  }
}

export const steer = {
  approve: (a) => call(["keys", a.address, "enter"]),
  hold: (a) => call(["interrupt", a.address]),
  note: (a, text) => call(["send", a.address, text]),
};

export function openLaunch() {
  openOverlay({ mod: "orienteering", kind: "dialog", frame: "none", props: { role: "launch" }, width: 560, height: 360 });
}

export function openSettings() {
  run("app.settings", {});
}

// ---- small drawing helpers

/** A standard text button in the map's ink: outlined, purple when primary. */
export function button(u, id, label, onClick, o = {}) {
  const primary = Boolean(o.primary);
  return div()
    .id(id)
    .flex_none()
    .h(u(o.h ?? 22))
    .px(u(o.px ?? 8))
    .flex()
    .items_center()
    .justify_center()
    .border(u(1))
    .border_color(primary ? C.purple : C.black)
    .bg(primary ? C.purple : C.forest)
    .text_color(primary ? C.forest : C.black)
    .font_weight(600)
    .cursor_pointer()
    .hover((s) => s.bg(primary ? C.purpleInk : C.purpleWash))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((e, cx) => {
      cx.stop_propagation();
      onClick?.(e, cx);
    })
    .child(label);
}

/** The status symbol at legend size: control circle, finish double circle,
 *  brown knoll dot, black boulder. */
export function symbol(u, status, size = 14) {
  const s = state(status).symbol;
  const box = div().flex_none().w(u(size)).h(u(size)).flex().items_center().justify_center();
  if (s === "control") return box.child(div().w(u(size)).h(u(size)).rounded(u(size)).border(u(2)).border_color(C.purple));
  if (s === "finish")
    return box.child(
      div().w(u(size)).h(u(size)).rounded(u(size)).border(u(1.5)).border_color(C.purple).flex().items_center().justify_center()
        .child(div().w(u(size * 0.55)).h(u(size * 0.55)).rounded(u(size)).border(u(1.5)).border_color(C.purple)),
    );
  if (s === "knoll") return box.child(div().w(u(size * 0.5)).h(u(size * 0.5)).rounded(u(size)).bg(C.brown));
  return box.child(div().w(u(size * 0.7)).h(u(size * 0.7)).child(svgBoulder(u, size * 0.7)));
}

function svgBoulder(u, size) {
  return image(`${ART}/boulder.svg`).w(u(size)).h(u(size));
}
