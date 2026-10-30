// Neon's kit: the gas colors, glass, electrodes and the tube itself.
//
// A tube is its text drawn as glass. Lit, four offset copies in the gas
// color sit behind a pale core: a halo made of the letterform itself, so the
// glow follows every bend of the script. Unlit, it is clear glass: a dim
// core with one faint highlight copy. Glow is static styling; it changes
// only when a status changes (see the ignition sequences in wall.js).

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { settings, spaces } from "herdr";

export const SCRIPT = "Neonderthaw";
export const TUBE = "Tilt Neon";

export const C = {
  room: "#060407",
  backer: "#0d0a10cc",
  backerEdge: "#ffffff14",
  glass: "#5f5a68",
  glassHi: "#8f8a99",
  electrode: "#a8391f",
  electrodeHot: "#ff6a3d",
  electrodeCap: "#d2603f",
  metal: "#8e8996",
  metalEdge: "#5c5764",
  metalInk: "#18161c",
  panel: "#121015",
  panelEdge: "#241f29",
  ink: "#ece8f2",
  muted: "#b3acbf",
  dim: "#7d7689",
};

// Each status is a gas: [glow, core]. Idle is unlit glass.
export const GAS = {
  working: { glow: "#3d6bff", core: "#e3ebff", word: "LIT" },
  blocked: { glow: "#ff2a3d", core: "#ffe3e6", word: "RED" },
  done: { glow: "#ff9a2e", core: "#fff1de", word: "WARM" },
  idle: null,
};

export function unit() {
  // Herdr already scales mod px by the app zoom (AGENTS.md), so sizes pass
  // through as designed; dividing by zoom made content outgrow its block.
  return (n) => n;
}

/** Strips the spinner and marks agents put in front of their titles. */
export function clean(s) {
  return String(s ?? "").replace(/^[^\p{L}\p{N}~]+/u, "").trim();
}

/**
 * A line of tube. lvl: 0 unlit glass, 1 flash (strike), 2 steady.
 * `gas` is GAS[status] or null for glass. `id`: a stable id (the glow
 * layer animates, and animated elements need one).
 */
export function tube(u, text, o) {
  const { size, font, gas } = o;
  const lvl = gas ? (o.lvl ?? 2) : 0;
  const lit = lvl > 0;
  const halo = gas?.glow ?? C.glass;
  const t = u(size);
  const d = u(Math.max(1.2, size / 16));
  const copy = (dx, dy, color, op) =>
    div().absolute().left(dx).top(dy).whitespace_nowrap().text_color(color).opacity(op).child(text);
  const layers = div()
    .id(`${o.id}-glow`)
    .absolute()
    .inset(0)
    .opacity(lit ? (lvl === 1 ? 1 : 0.9) : 0)
    .transition("opacity", 80)
    .child(copy(-d, 0, halo, 0.45))
    .child(copy(d, 0, halo, 0.45))
    .child(copy(0, -d, halo, 0.45))
    .child(copy(0, d, halo, 0.45))
    .child(copy(0, 0, halo, lvl === 1 ? 0.9 : 0.6));
  const core = div()
    .relative()
    .whitespace_nowrap()
    .text_color(lit ? (lvl === 1 ? "#ffffff" : gas.core) : C.glass)
    .child(text);
  return div()
    .relative()
    .flex_none()
    .font_family(font)
    .text_size(t)
    .line_height(`${Math.round(t * 1.25)}px`)
    .when(!lit, (el) => el.child(copy(0, -u(1), C.glassHi, 0.35)))
    .child(layers)
    .child(core);
}

/** A sealed tube end: glass lead into a red electrode cap, hot when lit. */
export function electrode(u, lit, side) {
  const cap = div()
    .flex_none()
    .w(u(6))
    .h(u(13))
    .rounded(u(2))
    .bg(lit ? C.electrodeHot : C.electrode)
    .border_t(u(2))
    .border_color(lit ? "#ffb08f" : C.electrodeCap)
    .opacity(lit ? 1 : 0.75);
  const lead = div().flex_none().w(u(7)).h(u(2)).bg(lit ? "#b9b4c4" : "#3a3540");
  return h_flex().flex_none().items_center().children(side === "left" ? [cap, lead] : [lead, cap]);
}

/** A small stamped metal plate (machine, counts): dark ink on brushed steel. */
export function plate(u, text) {
  return div()
    .flex_none()
    .px(u(6))
    .py(u(1))
    .rounded(u(2))
    .bg(C.metal)
    .border_1()
    .border_color(C.metalEdge)
    .text_color(C.metalInk)
    .font_family(TUBE)
    .text_size(u(10))
    .child(text);
}

export function machineName(s) {
  return s?.machine ? s.machine.toUpperCase() : "THIS MAC";
}

export function activeSpace() {
  return spaces().find((s) => s.active) ?? null;
}

export function lamp(u, color, on = true) {
  return div().flex_none().w(u(8)).h(u(8)).rounded_full().bg(on ? color : "#2a2430").border_1().border_color(on ? color : "#3a3340");
}
