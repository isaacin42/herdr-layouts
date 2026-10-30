// A pane's header under the enlarger: a strip of masking tape on the easel,
// grease-penciled with the program and what it's doing; the agent's state
// in red pencil when it needs you. Click focuses, double-click zooms.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run } from "herdr";
import { C, unit, hand, programIcon, STATUS_WORD } from "./kit.js";

export default class Pane {
  init() {}

  render(_cx) {
    const u = unit();
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    if (!p) return div();
    const prog = p.program?.name || "shell";
    const title = p.title && p.title !== p.program?.name ? p.title : "";
    const word = p.status ? STATUS_WORD[p.status] : "";
    return h_flex()
      .id(`darkroom-pane-${id}`)
      .size_full()
      .px(u(8))
      .gap(u(8))
      .items_center()
      .bg(C.enamel)
      .on_click((e, _cx) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id }))
      .child(
        h_flex()
          .flex_none()
          .max_w(u(520))
          .h(u(20))
          .px(u(8))
          .gap(u(6))
          .items_center()
          .overflow_hidden()
          .bg(p.focused ? C.tapeHot : C.tape)
          .child(programIcon(p.program, u(14), C.ink))
          .child(hand(u, prog, 15))
          .when(Boolean(title), (el) => el.child(div().min_w(0).overflow_hidden().child(hand(u, title, 14, "#5a4127").truncate()))),
      )
      .child(div().flex_1())
      .when(Boolean(word), (el) => el.child(hand(u, word, 15, p.status === "blocked" ? C.redDeep : "#5a4127")));
  }
}
