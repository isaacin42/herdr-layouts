// A pane's header on the line: a label-maker strip naming the station (the
// program, its ticket and folder), its call on the right, and SPLIT / ZOOM /
// CLOSE. The focused station sits under the heat lamp (an amber edge).
// Click focuses the pane; double-click zooms it.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run } from "herdr";
import { C, unit, root, tape, call, code, tabInfo, shortPath } from "./kit.js";

const TAPE_FOR = { blocked: C.tapeRed, done: C.tapeBlue, working: C.tapeBlack, idle: C.tapeBlack };

export default class Station {
  init() {}

  action(u, id, word, fn) {
    return div()
      .id(id)
      .flex_none()
      .px(u(6))
      .h_full()
      .flex()
      .items_center()
      .text_color(C.muted)
      .cursor_pointer()
      .hover((s) => s.text_color(C.lamp))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        fn();
      })
      .child(word);
  }

  render(_cx) {
    const u = unit();
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    if (!p) return div();
    return this.view(u, p, tabInfo(p.tab));
  }

  view(u, p, info) {
    const id = p.pane;
    const prog = (p.program?.name || "SHELL").toUpperCase();
    const c = p.status ? call(p.status) : null;
    return root(
      u,
      h_flex()
        .id(`pass-station-${id}`)
        .size_full()
        .px(u(8))
        .gap(u(10))
        .items_center()
        .bg(C.steelHi)
        .border_b(u(2))
        .border_color(p.focused ? C.lamp : C.steelLo)
        .on_click((e, _cx) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id })),
      11,
    )
      .child(tape(u, prog, TAPE_FOR[p.status] ?? C.tapeBlack, { h: 18, size: 10 }))
      .child(div().flex_none().text_color(C.text).child(info ? `${code(info.space.name)}.${info.tab.index}` : ""))
      .child(div().flex_1().min_w(0).truncate().text_color(C.dim).child(shortPath(p.cwd)))
      .when(Boolean(c), (el) =>
        el.child(
          c.bg
            ? div().flex_none().px(u(5)).rounded(u(2)).bg(c.bg).text_color(c.fg).font_weight(700).child(c.word)
            : div().flex_none().text_color(p.status === "working" ? C.line : C.muted).child(c.word),
        ),
      )
      .child(this.action(u, `pass-split-${id}`, "SPLIT", () => run("pane.split", { direction: "right", pane: id })))
      .child(this.action(u, `pass-zoom-${id}`, p.zoomed ? "UNZOOM" : "ZOOM", () => run("pane.zoom", { pane: id })))
      .child(this.action(u, `pass-close-${id}`, "CLOSE", () => run("pane.close", { pane: id })));
  }
}
