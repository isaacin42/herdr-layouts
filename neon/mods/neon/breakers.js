// The breaker panel between the wall and the storefront: lamp counts of lit,
// red, warm and dark tubes; one breaker per sign (the shown space's lever is
// thrown up, click another to switch to that space); and, at the right end,
// the SETTINGS switch, which opens Herdr's settings.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, run } from "herdr";
import { C, GAS, TUBE, unit, lamp } from "./kit.js";

function lever(u, id, up, accent) {
  return div()
    .relative()
    .flex_none()
    .w(u(14))
    .h(u(22))
    .rounded(u(3))
    .bg("#0a080c")
    .border_1()
    .border_color("#3a3440")
    .child(
      // Thrown instantly, like a real breaker (a `top` transition here
      // panicked GPUI's element state in `herdr-app check`).
      div()
        .absolute()
        .left(u(2))
        .top(up ? u(2) : u(10))
        .w(u(8))
        .h(u(8))
        .rounded(u(2))
        .bg(up ? accent : "#5c5764"),
    );
}

function breaker(u, id, label, up, accent, onClick, tip) {
  return h_flex()
    .id(id)
    .flex_none()
    .h_full()
    .px(u(8))
    .gap(u(7))
    .items_center()
    .cursor_pointer()
    .hover((s) => s.bg("#ffffff08"))
    .tooltip(tip)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, _cx) => onClick())
    .child(lever(u, id, up, accent))
    .child(div().flex_none().max_w(u(120)).truncate().text_color(up ? C.ink : C.muted).child(label));
}

export default class Breakers {
  init() {}

  render(_cx) {
    const u = unit();
    const list = agents();
    const n = (s) => list.filter((a) => a.status === s).length;
    const counts = [
      ["LIT", GAS.working.glow, n("working")],
      ["RED", GAS.blocked.glow, n("blocked")],
      ["WARM", GAS.done.glow, n("done")],
      ["DARK", C.dim, n("idle")],
    ];
    return h_flex()
      .id("neon-breakers")
      .size_full()
      .px(u(12))
      .gap(u(4))
      .items_center()
      .bg(C.panel)
      .border_t(u(1))
      .border_b(u(1))
      .border_color(C.panelEdge)
      .font_family(TUBE)
      .text_size(u(12))
      .text_color(C.muted)
      .child(div().flex_none().pr(u(10)).text_color(GAS.working.core).child("NEON WORKS"))
      .children(
        counts.map(([word, color, count]) =>
          h_flex()
            .flex_none()
            .px(u(6))
            .gap(u(5))
            .items_center()
            .child(lamp(u, color, count > 0))
            .child(div().text_color(count > 0 ? C.ink : C.dim).child(`${word} ${count}`)),
        ),
      )
      .child(div().flex_none().w(u(1)).h(u(20)).mx(u(8)).bg(C.panelEdge))
      .child(
        h_flex()
          .id("neon-breaker-row")
          .flex_1()
          .min_w(0)
          .h_full()
          .overflow_x_scroll()
          .children(
            spaces().map((s) =>
              breaker(
                u,
                `neon-breaker-${s.id}`,
                (s.name || "~").toUpperCase(),
                s.active,
                (GAS[s.status] ?? GAS.working).glow,
                () => run("space.select", { id: s.id }),
                `${s.name}${s.machine ? ` on ${s.machine}` : ""}: switch to this sign's space`,
              ),
            ),
          ),
      )
      .child(div().flex_none().w(u(1)).h(u(20)).mx(u(6)).bg(C.panelEdge))
      .child(breaker(u, "neon-settings", "SETTINGS", false, C.metal, () => run("app.settings", {}), "Herdr settings"));
  }
}
