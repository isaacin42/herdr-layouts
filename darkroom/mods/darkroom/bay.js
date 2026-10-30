// The bay: the darkroom's working wall, under amber safelight.
//   left    the wall timer (the oldest wait on you) and the light box, where
//           blocked agents lie as test strips under the red lamp
//   top     the drying line: finished agents hang from pegs
//   bottom  four trays in process order: EXPOSE (new agents), DEVELOP
//           (working: the print deepens the longer it works), FIX (just
//           finished, a moment before it's hung), WASH (idle)
// Every agent is one keyed print positioned absolutely; when its station
// changes it glides there once (a bounded transition). Nothing loops: a 60 s
// timer re-renders so developing prints step darker and the timer advances.

import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, run, hc, setAgentOrder, settings } from "herdr";
import { C, TONES, unit, tabInfo, minutesSince, programIcon, hand, printed, ORDER } from "./kit.js";

// on_size_change reports on-screen px (already times the app zoom), while sizes
// set on elements get the zoom applied again, so work in design px throughout.
function designSize(s) {
  const z = Number(settings()?.zoom) || 1;
  return { width: s.width / z, height: s.height / z };
}


const FIX_MS = 4000; // a finished print sits in the fixer this long, then hangs
const EXPOSE_MS = 90000; // a new agent stays on the easel this long
const GLIDE = { duration: 1100, easing: "ease-in-out" };

// What a print is captioned with: the agent's own title (its session name),
// since most tabs are just numbered; the tab name when it says more.
function printName(a) {
  const title = String(a.title ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const tab = String(a.tab_name ?? "");
  return (/^\d+$/.test(tab) || !tab ? title : tab) || a.program?.name || "agent";
}

export default class Bay {
  init(_p, cx) {
    this.size = { width: 1400, height: 330 };
    this.prev = null;
    this.firstSeen = new Map();
    this.fixUntil = new Map();
    cx.timer.every(60000, (cx) => cx.notify());
  }

  // Note new agents and fresh finishes; schedule the one re-render each needs.
  watch(list, cx) {
    const now = Date.now();
    const first = this.prev === null;
    for (const a of list) {
      if (!this.firstSeen.has(a.address)) {
        this.firstSeen.set(a.address, first ? 0 : now);
        if (!first) cx.timer.after(EXPOSE_MS + 100, (cx) => cx.notify());
      }
      const was = this.prev?.get(a.address);
      if (!first && a.status === "done" && was && was !== "done") {
        this.fixUntil.set(a.address, now + FIX_MS);
        cx.timer.after(FIX_MS + 100, (cx) => cx.notify());
      }
    }
    this.prev = new Map(list.map((a) => [a.address, a.status]));
  }

  station(a) {
    const now = Date.now();
    if (a.status === "blocked") return "test";
    if (a.status === "done") return (this.fixUntil.get(a.address) ?? 0) > now ? "fix" : "dry";
    if (a.status === "working") return "develop";
    const seen = this.firstSeen.get(a.address) ?? 0;
    if (seen && now - seen < EXPOSE_MS) return "expose";
    return "wash";
  }

  // ---- geometry, in the same units the block reports its size in

  geometry(u) {
    const W = this.size.width;
    const H = this.size.height;
    const lx = u(16);
    const lw = u(212);
    const rx = lx + lw + u(22);
    const rw = Math.max(u(400), W - rx - u(16));
    const ty = Math.max(u(140), H * 0.44);
    const th = H - ty - u(14);
    const gap = u(12);
    const ew = u(124);
    const fw = u(132);
    const rest = rw - ew - fw - gap * 3;
    const dw = rest * 0.6;
    const ww = rest - dw;
    let x = rx;
    const trays = {};
    for (const [k, w] of [["expose", ew], ["develop", dw], ["fix", fw], ["wash", ww]]) {
      trays[k] = { x, y: ty, w, h: th };
      x += w + gap;
    }
    return {
      W, H, rx, rw, trays,
      lineY: u(46),
      lightbox: { x: lx, y: u(150), w: lw, h: H - u(150) - u(14) },
      timer: { x: lx + u(4), y: u(44), d: u(92) },
    };
  }

  /** Where the i-th of n prints sits in a tray: a grid, then a pile. */
  traySlot(u, t, i) {
    const pw = u(58);
    const ph = u(72);
    const pad = u(12);
    const cols = Math.max(1, Math.floor((t.w - pad * 2 + u(8)) / (pw + u(8))));
    const rows = Math.max(1, Math.floor((t.h - pad - u(26) + u(8)) / (ph + u(8))));
    const cap = cols * rows;
    const j = Math.min(i, cap - 1);
    const over = Math.max(0, i - cap + 1);
    return {
      x: t.x + pad + (j % cols) * (pw + u(8)) + over * u(7),
      y: t.y + pad + Math.floor(j / cols) * (ph + u(8)) + over * u(5),
      w: pw,
      h: ph,
    };
  }

  lineSlot(u, g, i, n) {
    const w = u(64);
    const step = n > 1 ? Math.min(u(80), (g.rw - u(40) - w) / (n - 1)) : u(80);
    return { x: g.rx + u(24) + i * step, y: g.lineY - u(6), w, h: u(82) };
  }

  stripSlot(u, g, i) {
    const b = g.lightbox;
    const h = u(36);
    const cap = Math.max(1, Math.floor((b.h - u(40)) / (h + u(6))));
    const j = Math.min(i, cap - 1);
    const over = Math.max(0, i - cap + 1);
    return { x: b.x + u(8) + over * u(4), y: b.y + u(34) + j * (h + u(6)) + over * u(4), w: b.w - u(16), h };
  }

  // ---- drawing

  image(u, a, tone, w, h, fade) {
    const dark = TONES.indexOf(tone) >= 2;
    return v_flex()
      .flex_none()
      .w(w)
      .h(h)
      .p(u(4))
      .gap(u(2))
      .bg(C.paper)
      .when(fade, (el) => el.opacity(0.55))
      .child(
        div()
          .flex_1()
          .w_full()
          .flex()
          .items_center()
          .justify_center()
          .bg(tone)
          .child(programIcon(a.program, u(22), dark ? C.paper : C.ink)),
      )
      .child(div().w_full().h(u(14)).overflow_hidden().child(hand(u, printName(a), 12).truncate()));
  }

  print(u, a, st, slot) {
    const info = a.info;
    let tone = TONES[4];
    if (st === "develop") {
      const m = minutesSince(info?.tab.working_since) ?? 0;
      tone = TONES[Math.min(4, Math.floor(m / 4))];
    } else if (st === "expose") tone = "#e9dcc2";
    else if (st === "wash") tone = TONES[3];
    const peg = st === "dry";
    return div()
      .id(`print-${a.address}`)
      .absolute()
      .left(slot.x)
      .top(slot.y)
      .transition("left", GLIDE)
      .transition("top", GLIDE)
      .cursor_pointer()
      .hover((s) => s.opacity(0.92))
      .tooltip(`${a.program?.name ?? "agent"} · ${a.space_name} / ${a.tab_name}`)
      .on_click((_e, _cx) => run("agent.focus", { terminal: a.address }))
      .child(this.image(u, a, tone, slot.w, slot.h, st === "wash"))
      .when(peg, (el) => el.child(image("mods/darkroom/peg.svg").absolute().left(slot.w / 2 - u(7)).top(-u(12)).w(u(14)).h(u(30))));
  }

  strip(u, a, slot) {
    const waited = minutesSince(a.info?.tab.changed_at);
    return h_flex()
      .id(`print-${a.address}`)
      .absolute()
      .left(slot.x)
      .top(slot.y)
      .w(slot.w)
      .h(slot.h)
      .transition("left", GLIDE)
      .transition("top", GLIDE)
      .cursor_pointer()
      .tooltip(`${a.program?.name ?? "agent"} needs you · ${a.space_name} / ${a.tab_name}`)
      .on_click((_e, _cx) => run("agent.focus", { terminal: a.address }))
      .child(
        v_flex()
          .flex_none()
          .w(slot.w * 0.5)
          .h_full()
          .px(u(6))
          .justify_center()
          .bg(C.paper)
          .child(hand(u, "your call", 14, C.redDeep))
          .child(div().w_full().overflow_hidden().child(hand(u, printName(a), 12).truncate())),
      )
      .child(
        h_flex()
          .flex_1()
          .h_full()
          .children(TONES.map((t, i) => div().flex_1().h_full().bg(t).when(i === 4, (el) => el.flex().items_center().justify_center().child(printed(u, waited == null ? "" : `${waited}m`, 12, C.amber, { bold: true }))))),
      )
      .child(
        div()
          .id(`pull-${a.address}`)
          .flex_none()
          .h_full()
          .px(u(7))
          .flex()
          .items_center()
          .bg(C.tapeHot)
          .hover((s) => s.bg(C.amber))
          .tooltip("Pull the print: press Enter in this agent (approve)")
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            hc(["keys", a.address, "enter"]).catch(() => {});
          })
          .child(printed(u, "PULL", 12, C.ink, { bold: true })),
      );
  }

  tray(u, key, t, label, count, liquid) {
    return div()
      .absolute()
      .left(t.x)
      .top(t.y)
      .w(t.w)
      .h(t.h)
      .rounded(u(10))
      .border(u(5))
      .border_color(C.enamel)
      .bg(liquid)
      .child(
        h_flex()
          .absolute()
          .left(u(10))
          .bottom(u(2))
          .gap(u(6))
          .items_center()
          .child(hand(u, label, 15, C.enamel))
          .when(count > 0, (el) => el.child(printed(u, String(count), 13, C.amberDim, { bold: true }))),
      );
  }

  render(cx) {
    const u = unit();
    const list = agents().map((a) => ({ ...a, info: tabInfo(a.tab) }));
    this.watch(list, cx);
    const g = this.geometry(u);
    const groups = { test: [], expose: [], develop: [], fix: [], wash: [], dry: [] };
    for (const a of list) groups[this.station(a)].push(a);
    for (const k of Object.keys(groups)) groups[k].sort((x, y) => (x.address < y.address ? -1 : 1));
    setAgentOrder(Object.keys(ORDER).sort((a, b) => ORDER[a] - ORDER[b]).flatMap((k) => groups[k].map((a) => a.address)));

    const blocked = groups.test;
    const oldest = blocked.reduce((m, a) => {
      const w = minutesSince(a.info?.tab.changed_at);
      return w != null && (m == null || w > m) ? w : m;
    }, null);
    const active = spaces().find((s) => s.active);

    const prints = [];
    groups.test.forEach((a, i) => prints.push(this.strip(u, a, this.stripSlot(u, g, i))));
    groups.dry.forEach((a, i) => prints.push(this.print(u, a, "dry", this.lineSlot(u, g, i, groups.dry.length))));
    for (const k of ["expose", "develop", "fix", "wash"])
      groups[k].forEach((a, i) => prints.push(this.print(u, a, k, this.traySlot(u, g.trays[k], i))));

    const lb = g.lightbox;
    const t = g.timer;
    return div()
      .id("darkroom-bay")
      .relative()
      .size_full()
      .overflow_hidden()
      .bg(C.wash)
      .on_size_change((size, cx) => {
        size = designSize(size);
        if (Math.abs(size.width - this.size.width) > 2 || Math.abs(size.height - this.size.height) > 2) {
          this.size = size;
          cx.notify();
        }
      })
      // title, clear of the window buttons
      .child(
        h_flex()
          .absolute()
          .left(u(84))
          .top(u(12))
          .gap(u(10))
          .items_center()
          .child(printed(u, "DARKROOM", 17, C.amber, { bold: true }))
          .child(hand(u, active ? active.name : "", 17, C.muted)),
      )
      // wall timer: the oldest wait on you
      .child(
        div()
          .absolute()
          .left(t.x)
          .top(t.y)
          .w(t.d)
          .h(t.d)
          .child(image("mods/darkroom/timer.svg").absolute().left(0).top(0).w(t.d).h(t.d))
          .child(
            v_flex()
              .absolute()
              .left(0)
              .top(0)
              .w(t.d)
              .h(t.d)
              .items_center()
              .justify_center()
              .child(printed(u, oldest == null ? "--" : oldest > 99 ? "99+" : String(oldest).padStart(2, "0"), 26, oldest == null ? C.dim : C.amber, { bold: true }))
              .child(printed(u, "MIN", 10, C.dim)),
          ),
      )
      .child(
        v_flex()
          .absolute()
          .left(t.x + t.d + u(10))
          .top(t.y + u(18))
          .gap(u(2))
          .child(hand(u, blocked.length ? "oldest wait" : "nothing", 15, C.muted))
          .child(hand(u, blocked.length ? "on you" : "waiting on you", 15, C.muted)),
      )
      // light box under the red lamp
      .child(
        div()
          .absolute()
          .left(lb.x)
          .top(lb.y)
          .w(lb.w)
          .h(lb.h)
          .rounded(u(4))
          .border(u(2))
          .border_color(blocked.length ? C.redDeep : "#3a2614")
          .bg(blocked.length ? "#2a0f0a" : "#1a1009")
          .child(image("mods/darkroom/lamp.svg").absolute().left(lb.w / 2 - u(20)).top(-u(2)).w(u(40)).h(u(30)).when(!blocked.length, (el) => el.opacity(0.45)))
          .child(div().absolute().left(u(10)).top(u(6)).child(hand(u, "light box", 14, blocked.length ? C.red : C.dim)))
          .when(!blocked.length, (el) =>
            el.child(div().absolute().left(u(10)).top(u(40)).child(hand(u, "no test strips. nobody needs you.", 13, C.dim))),
          ),
      )
      // drying line
      .child(div().absolute().left(g.rx).top(g.lineY).w(g.rw).h(u(2)).bg(C.line))
      .child(div().absolute().left(g.rx + g.rw - u(160)).top(u(14)).child(hand(u, groups.dry.length ? `drying line · ${groups.dry.length}` : "drying line", 15, C.muted)))
      // trays, in process order
      .child(this.tray(u, "expose", g.trays.expose, "expose", groups.expose.length, "#241709"))
      .child(this.tray(u, "develop", g.trays.develop, "develop", groups.develop.length, "#2c1b0b"))
      .child(this.tray(u, "fix", g.trays.fix, "fix", groups.fix.length, "#22180f"))
      .child(this.tray(u, "wash", g.trays.wash, "wash", groups.wash.length, "#1c1a14"))
      .children(prints);
  }
}
