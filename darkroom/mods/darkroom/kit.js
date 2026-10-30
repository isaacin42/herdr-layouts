// Darkroom's kit: the safelight palette, the two voices (grease pencil and
// printed timer type), the silver tones a print passes through as it
// develops, and the station each agent belongs to.

import { div, svg, image } from "gpui-kit";
import { settings, spaces } from "herdr";

export const C = {
  wash: "#120a04", // the room under safelight
  bench: "#1c1007",
  amber: "#ffb347", // the safelight itself
  amberDim: "#c98f45",
  enamel: "#e3d2b0", // tray rims and the easel, white enamel under amber
  enamelShade: "#b9a47e",
  paper: "#efdfc2", // print paper under amber
  ink: "#2b1d10", // grease pencil on tape and paper
  red: "#ff5a3c", // red grease pencil, the red lamp
  redDeep: "#d23a28",
  tape: "#d8c49c",
  tapeHot: "#f0c070",
  line: "#8a6a40",
  muted: "#c9a36a",
  dim: "#8f6c40",
};

// Silver tones, light to black: a print's image deepens through these.
export const TONES = ["#dccdb0", "#b29f80", "#83735b", "#544838", "#241c14"];

export const HAND = "Caveat Brush";
export const PRINT = "Barlow Condensed";

export function unit() {
  // Herdr already scales mod px by the app zoom (AGENTS.md), so sizes pass
  // through as designed; dividing by zoom made content outgrow its block.
  return (n) => n;
}

export function tabInfo(tabId) {
  for (const s of spaces()) for (const t of s.tabs) if (t.id === tabId) return { space: s, tab: t };
  return null;
}

export function minutesSince(ms) {
  if (ms == null) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 60000));
}

/** A program's icon, tinted when it's a one-colour glyph. */
export function programIcon(p, size, color) {
  if (!p?.icon) return div().flex_none().w(size).h(size);
  return p.tint ? svg(p.icon).flex_none().size(size).text_color(color) : image(p.icon).flex_none().w(size).h(size);
}

/** Grease-pencil text. */
export function hand(u, text, size, color = C.ink) {
  return div().flex_none().font_family(HAND).text_size(u(size)).line_height(`${u(size + 2)}px`).text_color(color).child(text);
}

/** Printed label text (timer face, station plates). */
export function printed(u, text, size, color = C.amber, o = {}) {
  let el = div().flex_none().font_family(PRINT).text_size(u(size)).line_height(`${u(size + 2)}px`).text_color(color).child(text);
  if (o.bold) el = el.font_weight(600);
  return el;
}

// Station order: what needs you first, then the process left to right.
export const ORDER = { test: 0, expose: 1, develop: 2, fix: 3, wash: 4, dry: 5 };

export const STATUS_WORD = {
  working: "developing",
  blocked: "your call",
  done: "on the line",
  idle: "in the wash",
};
