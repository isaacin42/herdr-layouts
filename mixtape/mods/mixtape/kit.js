// Mixtape's kit: the J-card's inks, the two type voices, and the tape model:
// every machine is a side (this Mac is A, then reachable machines by name,
// then unreachable ones), every tab on that machine is a track.

import { div, svg, image } from "gpui-kit";
import { settings, spaces, agents, machines, run, openOverlay } from "herdr";

export const C = {
  card: "#fbfaf4", // white lined inlay stock
  cardShade: "#f2efe4",
  rule: "#c9d6ec", // the inlay's printed blue lines
  margin: "#e7b3b3", // printed margin line
  ink: "#1d3a8f", // ballpoint blue
  inkSoft: "#4b62a8",
  pencil: "#6c6c68", // pencil gray, tentative tracks (≥4.5:1 on card)
  stripe: "#c8102e", // the printed brand stripe: the only printed colour
  stripeInk: "#fff4f2",
  highlighter: "#fff09a", // a swipe across a track that needs you
  shell: "#26272b", // smoked cassette shell around the card
  shellLine: "#3a3b40",
  label: "#f6f1e3",
};

export const HAND = "Gochi Hand";
export const PRINT = "Helvetica Neue";

export function unit() {
  // Herdr already scales mod px by the app zoom (AGENTS.md), so sizes pass
  // through as designed; dividing by zoom made content outgrow its block.
  return (n) => n;
}

/** Ballpoint handwriting: Gochi Hand, ink blue. */
export function hand(u, el, size = 17) {
  return el.font_family(HAND).text_size(u(size)).line_height(`${u(size + 5)}px`).text_color(C.ink);
}

/** The inlay's printed small caps: tiny, tracked, the card's own type. */
export function printed(u, text, color = C.pencil, size = 9) {
  return div().flex_none().font_family(PRINT).text_size(u(size)).font_weight(600).text_color(color).child(String(text).toUpperCase());
}

export function art(name, u, size, color = C.ink) {
  return svg(`mods/mixtape/art/${name}.svg`).flex_none().w(u(size)).h(u(size)).text_color(color);
}

export function programIcon(u, program, size = 14) {
  if (!program?.icon) return null;
  return program.tint
    ? svg(program.icon).flex_none().w(u(size)).h(u(size)).text_color(C.ink)
    : image(program.icon).flex_none().w(u(size)).h(u(size));
}

// ---- time, the way a tracklist writes it

/** Running time m:ss at minute resolution (12:00, 1:04:00). */
export function trackTime(since) {
  if (!since) return "";
  const m = Math.max(0, Math.floor((Date.now() - since) / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, "0")}:00` : `${m}:00`;
}

export function totalTime(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, "0")}:00` : `${m}:00`;
}

// ---- the tape

const URGENT = { blocked: 0, done: 1, working: 2, idle: 3 };

/** Every side: { name, letter, label, state, spaces: [{ space, tracks: [...] }], bonus: [...] }. */
export function tape() {
  const ms = machines();
  const here = ms.find((m) => m.name == null);
  const others = ms
    .filter((m) => m.name)
    .sort((a, b) => (a.layout === "unavailable") - (b.layout === "unavailable") || a.name.localeCompare(b.name));
  const all = spaces();
  // A machine with spaces but missing from machines() still gets a side.
  for (const s of all) if (s.machine && !others.some((m) => m.name === s.machine)) others.push({ name: s.machine, layout: "loading" });
  const byTab = new Map();
  for (const a of agents()) {
    const list = byTab.get(a.tab) ?? [];
    list.push(a);
    byTab.set(a.tab, list);
  }
  const sides = [{ name: null, layout: here?.layout ?? "ready" }, ...others];
  return sides.map((m, i) => {
    let n = 0;
    const groups = [];
    const bonus = [];
    for (const s of all.filter((x) => (x.machine ?? null) === m.name)) {
      const tracks = [];
      for (const t of s.tabs) {
        const who = (byTab.get(t.id) ?? []).sort((a, b) => (URGENT[a.status] ?? 4) - (URGENT[b.status] ?? 4));
        const lead = who[0] ?? null;
        const track = { space: s, tab: t, agent: lead, title: trackTitle(t, lead) };
        if (t.settled) bonus.push(track);
        else tracks.push({ ...track, no: ++n });
      }
      groups.push({ space: s, tracks });
    }
    return {
      name: m.name,
      letter: String.fromCharCode(65 + i),
      label: m.name ?? "this mac",
      state: m.layout,
      groups,
      bonus,
      count: n,
    };
  });
}

function clean(s) {
  return String(s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

export function trackTitle(tab, agent) {
  if (tab.named) return tab.name;
  const t = clean(agent?.title);
  if (t && t !== agent?.program?.name) return t;
  return agent?.program?.name ? `${agent.program.name} ${tab.name}` : `untitled ${tab.name}`;
}

/** The most urgent track on a side, for flipping to it. */
export function urgent(side) {
  const tracks = side.groups.flatMap((g) => g.tracks);
  return tracks.sort((a, b) => (URGENT[a.tab.status] ?? 4) - (URGENT[b.tab.status] ?? 4))[0] ?? null;
}

export function play(track) {
  if (!track) return;
  if (track.agent) run("agent.focus", { terminal: track.agent.address });
  else {
    run("space.select", { id: track.space.id });
    run("tab.select", { id: track.tab.id });
  }
}

export function openRec(machine) {
  openOverlay({ mod: "mixtape", kind: "dialog", frame: "none", props: { role: "rec", machine }, width: 560, height: 470 });
}

export function openNote(track) {
  if (!track?.agent) return;
  openOverlay({
    mod: "mixtape",
    kind: "dialog",
    frame: "none",
    props: { role: "note", address: track.agent.address, title: track.title },
    width: 520,
    height: 230,
  });
}

/** A handwritten button: underlined ballpoint word, a pen-circle on hover. */
export function penButton(u, id, text, fn, o = {}) {
  return div()
    .id(id)
    .flex_none()
    .px(u(6))
    .rounded(u(10))
    .border_1()
    .border_color("#00000000")
    .text_color(o.color ?? C.ink)
    .cursor_pointer()
    .hover((s) => s.border_color(o.color ?? C.ink))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => {
      cx.stop_propagation();
      fn(cx);
    })
    .when(Boolean(o.tip), (el) => el.tooltip(o.tip))
    .child(o.content ?? text);
}
