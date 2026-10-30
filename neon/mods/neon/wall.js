// The wall: one neon sign per space on the brick backboard. The space's name
// is the sign's script title; each agent in it is a tube line (its session
// title, else its tab). Working tubes burn cobalt, blocked ones red, finished
// ones warm amber until you look (then they go back to clear glass), idle ones
// are unlit glass. Under each sign, the transformer plate names its machine.
//
// Motion is event-driven and bounded: when an agent starts working its tube
// strikes (glass, flash, glass, steady); when one blocks it stutters a few
// times and holds red. Nothing animates while nothing changes.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, machines, run, setAgentOrder } from "herdr";
import { C, GAS, SCRIPT, TUBE, unit, clean, tube, electrode, plate, machineName } from "./kit.js";

const STEP_MS = 85;
const STRIKE = [0, 1, 0, 1, 2];
const STUTTER = [2, 0, 2, 0, 1, 0, 2];
const RANK = { blocked: 0, working: 1, done: 2, idle: 3 };

export default class Wall {
  init() {
    this.prev = null;
    this.fx = new Map();
  }

  ignite(addr, seq, cx) {
    let i = 0;
    const step = (cx) => {
      if (i >= seq.length) {
        this.fx.delete(addr);
        cx.notify();
        return;
      }
      this.fx.set(addr, seq[i++]);
      cx.notify();
      cx.timer.after(STEP_MS, step);
    };
    cx.timer.after(10, step);
  }

  // Remember statuses; a tube that just started working strikes, one that just blocked stutters.
  watch(list, cx) {
    if (this.prev) {
      for (const a of list) {
        const was = this.prev.get(a.address);
        if (was === undefined || was === a.status) continue;
        if (a.status === "working") this.ignite(a.address, STRIKE, cx);
        else if (a.status === "blocked") this.ignite(a.address, STUTTER, cx);
      }
    }
    this.prev = new Map(list.map((a) => [a.address, a.status]));
  }

  line(u, a) {
    const gas = GAS[a.status] ?? null;
    const lvl = this.fx.get(a.address);
    const lit = Boolean(gas) && lvl !== 0;
    const label = clean(a.title) || a.tab_name || a.program?.name || "agent";
    return h_flex()
      .id(`neon-tube-${a.address}`)
      .flex_none()
      .items_center()
      .gap(u(2))
      .py(u(2))
      .px(u(4))
      .rounded(u(4))
      .cursor_pointer()
      .hover((s) => s.bg("#ffffff0a"))
      .tooltip(`${a.program?.name ?? "Agent"} · ${a.space_name} / tab ${a.tab_index} · ${a.status}`)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, _cx) => run("agent.focus", { terminal: a.address }))
      .child(electrode(u, lit, "left"))
      .child(div().flex_none().px(u(6)).child(tube(u, label.slice(0, 32), { id: `neon-line-${a.address}`, size: 19, font: TUBE, gas, lvl })))
      .child(electrode(u, lit, "right"))
      .child(
        div()
          .flex_none()
          .ml(u(8))
          .font_family(TUBE)
          .text_size(u(10))
          .text_color(gas ? gas.glow : C.dim)
          .opacity(gas ? 0.85 : 0.7)
          .child(gas ? gas.word : "DARK"),
      );
  }

  sign(u, s, mine, power) {
    const order = [...mine].sort((a, b) => (RANK[a.status] ?? 4) - (RANK[b.status] ?? 4));
    // The title burns in its most urgent gas; a sign with no live gas is glass.
    const titleGas = GAS[s.status] ?? null;
    const lit = mine.filter((a) => a.status === "working").length;
    return v_flex()
      .id(`neon-sign-${s.id}`)
      .flex_none()
      .gap(u(4))
      .px(u(18))
      .pt(u(6))
      .pb(u(12))
      .rounded(u(12))
      .bg(C.backer)
      .border_1()
      .border_color(s.active ? "#3d6bff88" : C.backerEdge)
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, _cx) => run("space.select", { id: s.id }))
      .child(tube(u, s.name || "~", { id: `neon-title-${s.id}`, size: 46, font: SCRIPT, gas: power ? titleGas : null }))
      .child(div().flex_none().ml(u(14)).w(u(2)).h(u(8)).bg("#1b161d"))
      .children(order.map((a) => this.line(u, a)))
      .when(!order.length, (el) =>
        el.child(div().flex_none().pl(u(4)).font_family(TUBE).text_size(u(11)).text_color(C.dim).child("no tubes wired: no agents in this space")),
      )
      .child(
        h_flex()
          .flex_none()
          .mt(u(6))
          .gap(u(6))
          .items_center()
          .child(plate(u, machineName(s)))
          .child(plate(u, power ? `${lit} LIT · ${mine.length} TUBES` : "NO POWER")),
      );
  }

  render(cx) {
    const u = unit();
    const list = agents();
    this.watch(list, cx);
    setAgentOrder(
      [...list].sort((a, b) => (RANK[a.status] ?? 4) - (RANK[b.status] ?? 4) || b.seq - a.seq).map((a) => a.address),
    );
    const down = new Set(machines().filter((m) => m.name && m.layout === "unavailable").map((m) => m.name));
    const all = spaces();
    return div()
      .id("neon-wall-scroll")
      .size_full()
      .overflow_y_scroll()
      .child(
        h_flex()
          .w_full()
          .pt(u(40))
          .pb(u(16))
          .px(u(22))
          .gap(u(18))
          .flex_wrap()
          .items_start()
          .content_start()
          .children(all.map((s) => this.sign(u, s, list.filter((a) => a.space === s.id), !down.has(s.machine)))),
      );
  }
}
