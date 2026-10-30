// The rail: every agent is a thermal ticket clipped on a steel rail. Calls
// (blocked) are pulled to the front, the line runs by fire time (oldest
// first), holds wait behind it, and ORDER UP tickets ride at the pass end
// under the heat lamp. Click a ticket to bring it to the expo station;
// double-click to go to its station (agent.focus).
//
// Motion is event-driven only: a ticket whose place changes glides there
// (a transition on `left`, so ORDER UP slides once to the pass end), and a
// ticket that starts calling shakes for under a second, then stops.

import { div, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { run, setAgentOrder } from "herdr";
import { C, TICKET, unit, root, tickets, current, select, changed, call, code, number, clean, ago, tape, bell } from "./kit.js";

const PITCH = 166;
const W = 152;
const PASS_W = 118;
const SHAKE_MS = 840;

export default class Rail {
  init(_p, cx) {
    this.prev = null;
    this.shaking = new Set();
    cx.spawn(async (cx) => {
      for (;;) {
        await changed();
        cx.notify();
      }
    });
    // Times on the tickets: data, refreshed with the minute.
    cx.timer.every(60000, (cx) => cx.notify());
  }

  watch(list, cx) {
    const now = new Map(list.map((t) => [t.address, t.status]));
    if (this.prev) {
      const started = list.filter((t) => t.status === "blocked" && this.prev.get(t.address) !== "blocked").map((t) => t.address);
      if (started.length) {
        started.forEach((a) => this.shaking.add(a));
        cx.timer.after(SHAKE_MS, (cx) => {
          started.forEach((a) => this.shaking.delete(a));
          cx.notify();
        });
      }
    }
    this.prev = now;
  }

  ticket(u, t, i, isSel) {
    const c = call(t.status);
    const where = t.info?.space.machine ? t.info.space.machine.toUpperCase() : "LOCAL";
    const order = (t.tab_name || "").toUpperCase();
    const title = clean(t.title);
    const stamp =
      t.status === "done"
        ? h_flex().gap(u(4)).items_center().px(u(5)).bg(c.bg).text_color(c.fg).child(bell(u, 13)).child(c.word)
        : c.bg
          ? div().px(u(5)).bg(c.bg).text_color(c.fg).child(c.word)
          : div().text_color(c.fg).child(c.word);

    let body = v_flex()
      .relative()
      .w(u(W))
      .bg(isSel ? "#fff8e6" : C.paper)
      .px(u(9))
      .pt(u(10))
      .pb(u(4))
      .gap(u(1))
      .font_family(TICKET)
      .text_size(u(17))
      .line_height(`${u(16)}px`)
      .text_color(C.ink)
      .when(isSel, (el) => el.border_2().border_color(C.lamp))
      .child(
        h_flex()
          .justify_between()
          .child(div().child(`#${number(t.address)}  ${code(t.space_name)}.${t.tab_index}`))
          .child(div().text_color(C.inkSoft).child(where)),
      )
      .child(div().text_color("#a79f8d").whitespace_nowrap().overflow_hidden().child("- - - - - - - - - - - - - - -"))
      .child(div().h(u(32)).overflow_hidden().text_size(u(19)).line_height(`${u(16)}px`).child(order || "NO ORDER"))
      .child(div().truncate().text_color(C.inkSoft).child(title && title.toUpperCase() !== order ? title.toUpperCase() : (t.program?.name ?? "").toUpperCase()))
      .child(h_flex().mt(u(4)).justify_between().items_center().child(stamp).child(div().text_color(C.inkSoft).child(ago(t.since))));
    if (this.shaking.has(t.address)) body = body.loop("left", { from: -3, to: 3, period: 140, easing: "linear" });

    return v_flex()
      .id(`pass-ticket-${t.address}`)
      .absolute()
      .left(u(16 + i * PITCH))
      .top(u(isSel ? 6 : 12))
      .w(u(W))
      .transition("left", { duration: 700, easing: "ease-out" })
      .transition("top", 160)
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((e, _cx) => {
        if (e.click_count >= 2) run("agent.focus", { terminal: t.address });
        else select(t.address);
      })
      .tooltip("Click: expo station  ·  Double-click: go to the station")
      .child(div().flex().justify_center().child(image("mods/pass/clip.svg").w(u(40)).h(u(18))))
      .child(body)
      .child(image(isSel ? "mods/pass/tear-sel.svg" : "mods/pass/tear.svg").w(u(W)).h(u(8)));
  }

  render(cx) {
    const u = unit();
    const list = tickets();
    setAgentOrder(list.map((t) => t.address));
    this.watch(list, cx);
    const sel = current(list)?.address;
    const inner = Math.max(list.length * PITCH + 32 + PASS_W, 0);

    return root(u, div().id("pass-rail").relative().size_full().bg(C.steelLo).overflow_hidden())
      .child(div().absolute().left(0).top(u(14)).w_full().h(u(9)).bg(C.railLo).border_t(u(3)).border_color(C.railHi))
      .child(
        div()
          .id("pass-rail-scroll")
          .absolute()
          .inset(0)
          .overflow_x_scroll()
          .child(
            div()
              .relative()
              .h_full()
              .w(u(inner))
              .children(list.map((t, i) => this.ticket(u, t, i, t.address === sel)))
              .when(!list.length, (el) =>
                el.child(
                  div()
                    .absolute()
                    .left(u(24))
                    .top(u(44))
                    .text_color(C.muted)
                    .child("NO TICKETS ON THE RAIL. NEW TICKET (TOP RIGHT) FIRES ONE."),
                ),
              ),
          ),
      )
      .child(
        v_flex()
          .absolute()
          .right(0)
          .top(0)
          .h_full()
          .w(u(PASS_W))
          .items_center()
          .bg("#2a1f14ee")
          .border_l(u(1))
          .border_color(C.lampDeep)
          .child(div().w_full().h(u(5)).bg(C.lamp))
          .child(div().mt(u(10)).child(tape(u, "THE PASS", C.tapeRed)))
          .child(div().mt(u(8)).text_color(C.lamp).text_size(u(11)).child("HEAT LAMP"))
          .child(div().mt(u(2)).text_color(C.muted).text_size(u(10)).child("ORDER UP RIDES HERE")),
      );
  }
}
