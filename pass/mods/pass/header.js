// The pass's header: the name on label tape, the service clock, the call
// tallies across the line, NEW TICKET (fires an agent with its first order)
// and SETTINGS (Herdr's settings window). Leaves room on the left for the
// macOS window buttons; the block drags the window.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, run } from "herdr";
import { C, unit, root, tape, plate } from "./kit.js";
import { openOrder } from "./order.js";

function hhmm(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default class Header {
  init(_p, cx) {
    this.now = new Date();
    const tick = (cx) => {
      this.now = new Date();
      cx.notify();
    };
    cx.timer.after(60000 - (Date.now() % 60000) + 50, (cx) => {
      tick(cx);
      cx.timer.every(60000, tick);
    });
  }

  render(_cx) {
    const u = unit();
    const list = agents();
    const n = (s) => list.filter((a) => a.status === s).length;
    const tally = (label, count, color, ink) =>
      h_flex()
        .flex_none()
        .gap(u(6))
        .items_center()
        .child(div().text_color(C.muted).child(label))
        .child(
          div()
            .flex_none()
            .min_w(u(22))
            .px(u(5))
            .flex()
            .justify_center()
            .rounded(u(2))
            .bg(count ? color : C.steelHi)
            .text_color(count ? ink : C.dim)
            .font_weight(700)
            .child(String(count)),
        );
    return root(
      u,
      h_flex()
        .id("pass-header")
        .size_full()
        .pl(u(82))
        .pr(u(12))
        .gap(u(14))
        .items_center()
        .bg(C.steel)
        .border_b(u(1))
        .border_color(C.brushed),
    )
      .child(tape(u, "THE PASS", C.tapeRed, { h: 24, size: 13, px: 10 }))
      .child(div().flex_none().text_color(C.lamp).child(`SERVICE ${hhmm(this.now)}`))
      .child(div().flex_none().w(u(1)).h(u(20)).bg(C.brushed))
      .child(tally("CALL", n("blocked"), C.call, C.callInk))
      .child(tally("ON THE LINE", n("working"), C.text, C.steel))
      .child(tally("ORDER UP", n("done"), C.up, C.upInk))
      .child(tally("ON HOLD", n("idle"), C.hold, C.steel))
      .child(div().flex_1())
      .child(plate(u, "pass-new", "NEW TICKET", () => openOrder(), { fill: C.lamp, ink: C.lampInk, h: 26, tip: "Start an agent with its first order" }))
      .child(plate(u, "pass-settings", "SETTINGS", () => run("app.settings", {}), { h: 26, tip: "Herdr settings" }));
  }
}
