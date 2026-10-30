// A pane's header in the storefront: a small plaque outlined in its tube's
// gas (cobalt working, red blocked, amber done, glass otherwise), the
// program and what it's on, and three switches: SPLIT, ZOOM, OFF (close).

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run } from "herdr";
import { C, GAS, TUBE, unit, clean } from "./kit.js";

function act(u, id, word, fn) {
  return div()
    .id(id)
    .flex_none()
    .px(u(6))
    .py(u(1))
    .rounded(u(3))
    .text_color(C.dim)
    .cursor_pointer()
    .hover((s) => s.bg("#ffffff10").text_color(C.ink))
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => {
      cx.stop_propagation();
      fn();
    })
    .child(word);
}

export default class Plaque {
  init() {}

  render(_cx) {
    const u = unit();
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    if (!p) return div();
    const gas = GAS[p.status] ?? null;
    const edge = gas ? gas.glow : p.focused ? "#6a6474" : "#2e2934";
    const title = clean(p.title && p.title !== p.program?.name ? p.title : "");
    return h_flex()
      .id(`neon-plaque-${id}`)
      .size_full()
      .px(u(6))
      .items_center()
      .bg(C.room)
      .on_click((e, _cx) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id }))
      .child(
        h_flex()
          .flex_1()
          .min_w(0)
          .h(u(22))
          .px(u(10))
          .gap(u(8))
          .items_center()
          .rounded(u(11))
          .border_1()
          .border_color(edge)
          .bg(p.focused ? "#14101a" : "#0c0a0f")
          .font_family(TUBE)
          .text_size(u(12))
          .child(div().flex_none().text_color(gas ? gas.core : p.focused ? C.ink : C.muted).child(p.program?.name ?? "Shell"))
          .when(Boolean(title), (el) => el.child(div().flex_1().min_w(0).truncate().text_color(C.dim).child(title)))
          .when(!title, (el) => el.child(div().flex_1()))
          .when(Boolean(gas), (el) => el.child(div().flex_none().text_color(gas.glow).child(gas.word)))
          .child(act(u, `neon-split-${id}`, "SPLIT", () => run("pane.split", { direction: "right", pane: id })))
          .child(act(u, `neon-zoom-${id}`, p.zoomed ? "UNZOOM" : "ZOOM", () => run("pane.zoom", { pane: id })))
          .child(act(u, `neon-off-${id}`, "OFF", () => run("pane.close", { pane: id }))),
      );
  }
}
