// The board: the map on the left, the control description sheet on the right,
// in one copy so the punched controls have one owner.
//
// The map: each space is a terrain zone sized by its agents, coloured by the
// machine it lives on (this Mac = yellow open land, dev-vm = white forest
// with an olive thicket edge, others = green, unreachable = marsh). Each agent
// is a feature at a stable spot in its zone: a knoll while running, a boulder
// at rest, a purple control circle when it needs you, a finish double circle
// when it finished. The course rides over everything in purple: from the
// start triangle (where you are, the focused agent) through every control in
// order, blocked first, oldest first. Punching a control re-routes the course.
//
// The sheet: the IOF description sheet as a ranked table of the course, then
// the rest of the terrain, then what's punched. Select a row to act on that
// agent without switching to it: GO, APPROVE (Enter on its dialog), HOLD
// (interrupt), a follow-up NOTE (hc send), PUNCH.

import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, focused, run, setAgentOrder, settings } from "herdr";

// on_size_change reports on-screen px (already times the app zoom), while sizes
// set on elements get the zoom applied again, so work in design px throughout.
function designSize(s) {
  const z = Number(settings()?.zoom) || 1;
  return { width: s.width / z, height: s.height / z };
}

import {
  C, ART, unit, root, course, loadPunched, savePunched, token, steer, ticker, feature, ago, state, symbol, button,
  machineName, unreachable, openLaunch,
} from "./kit.js";

const SHEET_W = 420;
const DOT_GAP = 7;
const DOT_CAP = 520;
const R = 12; // control circle radius

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Zones for every space, grouped into a column per machine, sized by agents. */
function zones(W, H, all) {
  const M = 12, G = 10;
  const count = new Map();
  for (const a of all) count.set(a.space, (count.get(a.space) ?? 0) + 1);
  const groups = new Map();
  for (const s of spaces()) {
    const k = s.machine ?? "";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }
  const keys = [...groups.keys()].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
  const weight = (s) => 1 + (count.get(s.id) ?? 0);
  const colW = keys.map((k) => groups.get(k).reduce((n, s) => n + weight(s), 0));
  const total = colW.reduce((a, b) => a + b, 0) || 1;
  const usableW = Math.max(0, W - 2 * M - G * (keys.length - 1));
  const out = [];
  let x = M;
  keys.forEach((k, i) => {
    const w = (usableW * colW[i]) / total;
    const list = groups.get(k);
    const sum = list.reduce((n, s) => n + weight(s), 0);
    const usableH = Math.max(0, H - 2 * M - G * (list.length - 1));
    let y = M;
    for (const s of list) {
      const h = (usableH * weight(s)) / sum;
      out.push({ space: s, machine: k || null, x, y, w, h });
      y += h + G;
    }
    x += w + G;
  });
  return out;
}

/** Stable feature spots inside a zone: a grid with jitter from the address. */
function place(zone, list) {
  const top = 24, pad = 16;
  const iw = Math.max(1, zone.w - 2 * pad), ih = Math.max(1, zone.h - top - pad);
  const n = list.length;
  const cols = Math.max(1, Math.round(Math.sqrt((n * iw) / ih)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const cw = iw / cols, ch = ih / rows;
  const sorted = [...list].sort((a, b) => a.address.localeCompare(b.address));
  const spots = new Map();
  sorted.forEach((a, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const jx = (hash(a.address) - 0.5) * cw * 0.45;
    const jy = (hash(a.address + "y") - 0.5) * ch * 0.45;
    spots.set(a.address, { x: zone.x + pad + cw * (c + 0.5) + jx, y: zone.y + top + ch * (r + 0.5) + jy });
  });
  return spots;
}

export default class Board {
  init(_p, cx) {
    this.focus = cx.focus_handle();
    this.size = null;
    this.punched = loadPunched();
    this.sel = null;
    this.noting = false;
    this.note = "";
    this.msg = null;
    this.lead = undefined;
    this.haloUntil = 0;
    this.pulse = false;
    // Elapsed times on the sheet read in minutes: refresh once a minute.
    cx.timer.every(60000, (cx) => cx.notify());
  }

  say(ok, msg, cx) {
    this.msg = { ok, msg, at: Date.now() };
    const at = this.msg.at;
    cx.timer.after(ok ? 3000 : 6000, (cx) => {
      if (this.msg?.at === at) {
        this.msg = null;
        cx.notify();
      }
    });
  }

  act(kind, a, cx) {
    if (!a) return;
    const t = ticker(a);
    if (kind === "go") {
      run("agent.focus", { terminal: a.address });
      return;
    }
    if (kind === "punch") {
      this.punched = { ...this.punched, [a.address]: token(a) };
      savePunched(this.punched);
      this.say(true, `PUNCHED ${t}`, cx);
      return;
    }
    if (kind === "unpunch") {
      const p = { ...this.punched };
      delete p[a.address];
      this.punched = p;
      savePunched(p);
      this.say(true, `${t} BACK ON COURSE`, cx);
      return;
    }
    const job = kind === "approve" ? steer.approve(a) : kind === "hold" ? steer.hold(a) : steer.note(a, this.note.trim());
    const verb = kind === "approve" ? "APPROVED" : kind === "hold" ? "HELD" : "NOTE SENT TO";
    this.say(true, `${verb} ${t}…`, cx);
    cx.spawn(async (cx) => {
      const r = await job;
      this.say(r.ok, r.ok ? `${verb} ${t}` : `${t}: ${r.msg}`.toUpperCase(), cx);
      cx.notify();
    });
    if (kind === "note") {
      this.note = "";
      this.noting = false;
    }
  }

  key(e, cx, rows) {
    const m = e.modifiers;
    const a = rows.find((x) => x.address === this.sel);
    if (this.noting) {
      if (e.key === "escape") (this.noting = false), (this.note = "");
      else if (e.key === "enter") {
        if (this.note.trim()) this.act("note", a, cx);
      } else if (e.key === "backspace") this.note = m.alt || m.platform ? this.note.replace(/\S+\s*$/, "") : this.note.slice(0, -1);
      else if (m.control && e.key === "u") this.note = "";
      else if (e.key_char && !m.control && !m.platform) this.note += e.key_char;
      else return;
    } else {
      const i = rows.findIndex((x) => x.address === this.sel);
      if (e.key === "down") this.sel = rows[Math.min(rows.length - 1, i + 1)]?.address ?? null;
      else if (e.key === "up") this.sel = rows[Math.max(0, i - 1)]?.address ?? null;
      else if (e.key === "enter") this.act("go", a, cx);
      else if (e.key === "escape") this.sel = null;
      else return;
    }
    cx.stop_propagation();
    cx.notify();
  }

  // ---- the map

  map(u, plan, cx) {
    const W = this.size?.width ?? 0, H = this.size?.height ?? 0;
    const off = unreachable();
    const el = div()
      .id("orient-map")
      .relative()
      .flex_1()
      .min_w(0)
      .h_full()
      .overflow_hidden()
      .bg(C.forest)
      .on_size_change((size, cx) => {
        size = designSize(size);
        if (!this.size || Math.abs(size.width - this.size.width) > 1 || Math.abs(size.height - this.size.height) > 1) {
          this.size = size;
          cx.notify();
        }
      });
    if (!W || !H) return el;

    const zs = zones(W, H, plan.all);
    const spots = new Map();
    for (const z of zs) {
      const mine = plan.all.filter((a) => a.space === z.space.id);
      for (const [k, v] of place(z, mine)) spots.set(k, v);
    }
    const order = new Map(plan.controls.map((a, i) => [a.address, i + 1]));
    const f = focused();
    const here = plan.all.find((a) => a.address === f?.terminal);
    const start = here ? { x: spots.get(here.address).x - 18, y: spots.get(here.address).y + 18 } : { x: 26, y: H - 26 };

    // Zones.
    const kids = zs.map((z) => {
      const off_ = z.machine && off.has(z.machine);
      const fill = off_ ? C.forest : z.machine === null ? C.open : z.machine === "dev-vm" ? C.forest : C.green;
      let zone = div().absolute().left(z.x).top(z.y).w(z.w).h(z.h).bg(fill);
      if (z.machine === "dev-vm") zone = zone.border(4).border_color(C.olive);
      else if (z.machine !== null) zone = zone.border(2).border_color(C.olive);
      if (z.space.active) zone = zone.border(z.machine === "dev-vm" ? 4 : 2).border_color(z.machine === null ? C.brown : C.olive);
      if (off_) zone = zone.child(image(`${ART}/marsh.svg`).absolute().inset(0).size_full());
      return zone;
    });
    kids.push(image(`${ART}/contours.svg`).absolute().left(0).top(0).w(W).h(H));

    // Zone names, set like map place names; the machine in small caps.
    for (const z of zs) {
      kids.push(
        h_flex()
          .id(`zone-${z.space.id}`)
          .absolute()
          .left(z.x + 8)
          .top(z.y + 5)
          .max_w(Math.max(40, z.w - 16))
          .gap(u(6))
          .items_center()
          .cursor_pointer()
          .on_click((_e, _cx) => run("space.select", { id: z.space.id }))
          .child(div().flex_none().text_size(u(14)).font_weight(700).text_color(C.black).when(z.space.active, (e) => e.underline()).child(z.space.name.toUpperCase()))
          .child(div().min_w(0).truncate().text_size(u(11)).text_color(off.has(z.machine) ? C.blueInk : C.gray).child(`${machineName(z.machine)}${off.has(z.machine) ? " · UNREACHABLE" : ""}`)),
      );
    }

    // The course: purple legs as dotted straight lines between circles.
    const pts = [start, ...plan.controls.map((a) => spots.get(a.address))];
    let budget = DOT_CAP;
    for (let i = 0; i < pts.length - 1 && budget > 0; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const skip = i === 0 ? 14 : R + 3;
      for (let d = skip; d < len - (R + 3) && budget > 0; d += DOT_GAP, budget--) {
        kids.push(div().absolute().left(a.x + (dx * d) / len - 1.5).top(a.y + (dy * d) / len - 1.5).w(3).h(3).rounded(3).bg(C.purple));
      }
    }

    // Features.
    for (const a of plan.all) {
      const p = spots.get(a.address);
      if (!p) continue;
      const n = order.get(a.address);
      const id = `feat-${a.address}`;
      const sel = this.sel === a.address;
      let mark;
      if (n) {
        const ring = state(a.status).symbol === "finish"
          ? div().w(R * 2).h(R * 2).rounded(R * 2).border(2).border_color(C.purple).flex().items_center().justify_center()
              .child(div().w(R * 1.2).h(R * 1.2).rounded(R * 2).border(2).border_color(C.purple))
          : div().w(R * 2).h(R * 2).rounded(R * 2).border(2.5).border_color(C.purple);
        mark = div().relative().w(R * 2).h(R * 2).child(ring)
          .child(div().absolute().left(R * 2 + 2).top(-R * 0.9).text_size(u(17)).font_weight(700).text_color(C.purple).child(String(n)));
      } else if (a.status === "working") {
        mark = div().w(R * 2).h(R * 2).flex().items_center().justify_center().child(div().w(9).h(9).rounded(9).bg(C.brown));
      } else {
        mark = div().w(R * 2).h(R * 2).flex().items_center().justify_center().child(image(`${ART}/boulder.svg`).w(10).h(10));
      }
      kids.push(
        div()
          .id(id)
          .absolute()
          .left(p.x - R)
          .top(p.y - R)
          .transition("left", { duration: 700, easing: "ease-out" })
          .transition("top", { duration: 700, easing: "ease-out" })
          .cursor_pointer()
          .tooltip(`${ticker(a)} · ${feature(a)} · ${state(a.status).word}`)
          .on_click((e, cx) => {
            if (e.click_count >= 2) run("agent.focus", { terminal: a.address });
            else {
              this.sel = a.address;
              cx.notify();
            }
          })
          .when(sel, (el) => el.child(div().absolute().left(-5).top(-5).w(R * 2 + 10).h(R * 2 + 10).border(1).border_dashed().border_color(C.black)))
          .child(mark),
      );
    }

    // The next control's one-time pulse: a halo that fades once, on change.
    const lead = plan.controls[0];
    if (lead && (this.pulse || Date.now() < this.haloUntil)) {
      const p = spots.get(lead.address);
      kids.push(
        div()
          .absolute()
          .left(p.x - R * 2.2)
          .top(p.y - R * 2.2)
          .w(R * 4.4)
          .h(R * 4.4)
          .rounded(R * 5)
          .border(3)
          .border_color(C.purple)
          .opacity(this.pulse ? 0.85 : 0)
          .transition("opacity", this.pulse ? 60 : { duration: 1400, easing: "ease-out" }),
      );
    }

    // Start triangle: you.
    kids.push(image(`${ART}/start.svg`).absolute().left(start.x - 14).top(start.y - 14).w(28).h(26));

    if (!plan.all.length)
      kids.push(
        div().absolute().left(24).top(H / 2 - 10).text_size(u(15)).text_color(C.gray)
          .child("No agents on the map yet. NEW CONTROL places one in a space."),
      );
    return el.children(kids);
  }

  // ---- the description sheet

  cell(u, w, content, o = {}) {
    let c = div().flex_none().h_full().px(u(5)).flex().items_center().border_r(u(1)).border_color(C.hair);
    c = w === "flex" ? c.flex_1().min_w(0) : c.w(u(w));
    if (o.right) c = c.justify_end();
    return c.child(content);
  }

  row(u, a, n, kind) {
    const sel = this.sel === a.address;
    const st = state(a.status);
    const punched = kind === "punched";
    const head = h_flex()
      .id(`row-${a.address}`)
      .flex_none()
      .h(u(28))
      .border_b(u(1))
      .border_color(C.hair)
      .cursor_pointer()
      .when(sel, (e) => e.bg(C.purpleWash))
      .hover((s) => s.bg(sel ? C.purpleWash : "#f3f1ea"))
      .on_click((e, cx) => {
        if (e.click_count >= 2) run("agent.focus", { terminal: a.address });
        this.sel = sel && e.click_count < 2 ? null : a.address;
        this.noting = false;
        this.focus.focus();
        cx.notify();
      })
      .child(this.cell(u, 34, n ? div().text_size(u(17)).font_weight(700).text_color(C.purple).child(String(n)) : symbol(u, a.status, 12)))
      .child(this.cell(u, 56, div().font_weight(600).text_color(punched ? C.dim : C.black).child(ticker(a))))
      .child(this.cell(u, "flex", div().min_w(0).truncate().text_color(punched ? C.dim : C.black).when(punched, (e) => e.line_through()).child(feature(a))))
      .child(this.cell(u, 92, h_flex().gap(u(5)).items_center().child(symbol(u, a.status, 12)).child(div().text_color(a.status === "blocked" ? C.purple : C.gray).font_weight(a.status === "blocked" ? 700 : 500).child(punched ? "PUNCHED" : st.short))))
      .child(this.cell(u, 46, div().text_color(C.gray).child(ago(a.status === "working" ? a.info?.tab.working_since : a.info?.tab.changed_at)), { right: true }));
    if (!sel) return head;

    const actions = h_flex()
      .flex_none()
      .px(u(8))
      .py(u(6))
      .gap(u(6))
      .items_center()
      .bg(C.purpleWash)
      .border_b(u(1))
      .border_color(C.hair)
      .child(button(u, `go-${a.address}`, "GO", (_e, cx) => this.act("go", a, cx), { primary: true }))
      .when(a.status === "blocked", (e) => e.child(button(u, `ok-${a.address}`, "APPROVE", (_e, cx) => this.act("approve", a, cx))))
      .when(a.status === "working" || a.status === "blocked", (e) => e.child(button(u, `hold-${a.address}`, "HOLD", (_e, cx) => this.act("hold", a, cx))))
      .when(Boolean(n), (e) => e.child(button(u, `punch-${a.address}`, "PUNCH", (_e, cx) => this.act("punch", a, cx))))
      .when(punched, (e) => e.child(button(u, `unpunch-${a.address}`, "UNPUNCH", (_e, cx) => this.act("unpunch", a, cx))));

    const on = this.noting;
    const field = h_flex()
      .id(`note-${a.address}`)
      .flex_none()
      .mx(u(8))
      .mb(u(8))
      .h(u(26))
      .px(u(8))
      .items_center()
      .bg(C.forest)
      .border(u(1))
      .border_color(on ? C.purple : C.black)
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => {
        cx.stop_propagation();
        this.noting = true;
        this.focus.focus();
        cx.notify();
      })
      .child(
        div()
          .flex_1()
          .min_w(0)
          .truncate()
          .text_color(this.note ? C.black : C.dim)
          .child(this.note || (on ? "" : `Follow-up for ${ticker(a)}: click, type, Enter sends`)),
      )
      .when(on, (e) => e.child(div().flex_none().w(u(2)).h(u(15)).bg(C.purple)))
      .when(on, (e) => e.child(div().flex_none().ml(u(8)).text_color(C.dim).child("ENTER SENDS · ESC")));

    return v_flex().flex_none().child(head).child(actions).child(field);
  }

  section(u, title, note) {
    return h_flex()
      .flex_none()
      .h(u(22))
      .px(u(8))
      .gap(u(8))
      .items_center()
      .bg(C.black)
      .text_color(C.forest)
      .font_weight(700)
      .child(div().child(title))
      .child(div().flex_1())
      .child(div().font_weight(500).text_color("#d9d6cc").child(note));
  }

  sheet(u, plan) {
    const rows = [
      ...plan.controls.map((a, i) => this.row(u, a, i + 1, "control")),
    ];
    const terrain = plan.terrain.map((a) => this.row(u, a, 0, "terrain"));
    const punched = plan.punched.map((a) => this.row(u, a, 0, "punched"));
    const total = plan.controls.length + plan.punched.length;
    const box = (w, label, value, o = {}) =>
      v_flex()
        .flex_none()
        .when(w === "flex", (e) => e.flex_1().min_w(0))
        .when(w !== "flex", (e) => e.w(u(w)))
        .px(u(6))
        .py(u(3))
        .border_r(u(1))
        .border_color(C.black)
        .child(div().text_size(u(10)).text_color(C.gray).child(label))
        .child(div().text_size(u(o.big ? 20 : 15)).font_weight(700).text_color(o.purple ? C.purple : C.black).child(value));

    return v_flex()
      .flex_none()
      .w(u(SHEET_W))
      .h_full()
      .bg(C.forest)
      .border_l(u(2))
      .border_color(C.black)
      .child(
        h_flex()
          .flex_none()
          .border_b(u(2))
          .border_color(C.black)
          .child(box(70, "COURSE", "A"))
          .child(box(96, "CONTROLS", String(plan.controls.length), { big: true, purple: plan.controls.length > 0 }))
          .child(box(96, "PUNCHED", `${plan.punched.length}/${total}`))
          .child(box("flex", "ON THE MAP", `${plan.all.length} AGENTS`)),
      )
      .child(
        h_flex()
          .flex_none()
          .h(u(20))
          .border_b(u(1))
          .border_color(C.black)
          .text_size(u(11))
          .text_color(C.gray)
          .child(this.cell(u, 34, "NO."))
          .child(this.cell(u, 56, "CODE"))
          .child(this.cell(u, "flex", "WHAT'S THERE"))
          .child(this.cell(u, 92, "STATE"))
          .child(this.cell(u, 46, "TIME", { right: true })),
      )
      .child(
        v_flex()
          .id("orient-sheet-rows")
          .flex_1()
          .min_h(0)
          .overflow_y_scroll()
          .children(rows.length ? rows : [div().px(u(10)).py(u(10)).text_color(C.gray).child("Clear course: nobody needs you. Finished and blocked agents appear here as controls.")])
          .when(terrain.length > 0, (e) => e.child(this.section(u, "ON THE MAP", "RUNNING · AT REST")).children(terrain))
          .when(punched.length > 0, (e) => e.child(this.section(u, "PUNCHED", "BACK ON COURSE IF THEY CHANGE")).children(punched)),
      )
      .child(
        h_flex()
          .flex_none()
          .h(u(26))
          .px(u(8))
          .gap(u(8))
          .items_center()
          .border_t(u(1))
          .border_color(C.black)
          .child(
            div()
              .flex_1()
              .min_w(0)
              .truncate()
              .text_color(this.msg ? (this.msg.ok ? C.black : C.red) : C.gray)
              .font_weight(this.msg ? 600 : 500)
              .child(this.msg?.msg ?? "SELECT A ROW TO ACT · ↑↓ MOVE · ENTER GOES"),
          )
          .child(button(u, "orient-new-sheet", "NEW CONTROL", () => openLaunch(), { h: 20 })),
      );
  }

  render(cx) {
    const u = unit();
    const plan = course(this.punched);
    setAgentOrder([...plan.controls, ...plan.terrain, ...plan.punched].map((a) => a.address));
    const rows = [...plan.controls, ...plan.terrain, ...plan.punched];
    if (this.sel && !rows.some((a) => a.address === this.sel)) this.sel = null;

    const lead = plan.controls[0]?.address ?? null;
    if (this.lead !== undefined && lead && lead !== this.lead) {
      this.pulse = true;
      cx.timer.after(60, (cx) => {
        this.pulse = false;
        this.haloUntil = Date.now() + 1500;
        cx.notify();
        cx.timer.after(1550, (cx) => cx.notify());
      });
    }
    this.lead = lead;

    return root(
      u,
      h_flex()
        .id("orient-board")
        .track_focus(this.focus)
        .on_key_down((e, cx) => this.key(e, cx, rows))
        .size_full()
        .bg(C.forest),
    )
      .child(this.map(u, plan, cx))
      .child(this.sheet(u, plan));
  }
}
