// A pane's header, drawn as a Bloomberg panel strip: <n> the panel number,
// the program and what it's doing, where it runs, its status cell, and the
// numbered actions (96 Split, 97 Zoom, 98 Close). The focused panel's strip
// is lit amber; the rest sit dark with amber type.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run } from "herdr";
import { C, unit, root, statusCell, shortPath, tabInfo, ticker } from "./kit.js";

export default class Panel {
  init() {}

  action(u, id, n, word, lit, fn) {
    return h_flex()
      .id(id)
      .flex_none()
      .h_full()
      .px(u(6))
      .gap(u(3))
      .items_center()
      .cursor_pointer()
      .hover((s) => s.bg(lit ? "#00000022" : "#ffffff12"))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        fn();
      })
      .child(div().text_color(lit ? "#5a3006" : C.amberDim).child(`${n})`))
      .child(div().text_color(lit ? C.amberInk : C.gray).child(word));
  }

  render(_cx) {
    const u = unit();
    const id = props()?.pane;
    const all = panes();
    const p = all.find((x) => x.pane === id);
    if (!p) return div();
    const siblings = all.filter((x) => x.tab === p.tab);
    const n = siblings.findIndex((x) => x.pane === id) + 1;
    const lit = p.focused;
    const info = tabInfo(p.tab);
    const prog = (p.program?.name || "SHELL").toUpperCase();
    const title = (p.title && p.title !== p.program?.name ? p.title : "").toUpperCase();
    const where = shortPath(p.cwd);
    const ink = lit ? C.amberInk : C.white;

    return root(
      u,
      h_flex()
        .id(`bbg-panel-${id}`)
        .size_full()
        .items_center()
        .bg(lit ? C.amber : "#111111")
        .border_b(u(1))
        .border_color(lit ? C.amber : C.rule)
        .on_click((e, _cx) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id })),
    )
      .child(
        div()
          .flex_none()
          .h_full()
          .px(u(6))
          .flex()
          .items_center()
          .bg(lit ? C.amberInk : C.amber)
          .text_color(lit ? C.amber : C.amberInk)
          .child(`<${n}>`),
      )
      .child(
        div()
          .flex_none()
          .px(u(8))
          .text_color(lit ? C.amberInk : C.amber)
          .child(info ? ticker(info.space.name, info.tab.index) : ""),
      )
      .child(div().flex_none().text_color(ink).child(prog))
      .when(Boolean(title), (el) =>
        el.child(div().flex_1().min_w(0).pl(u(8)).truncate().text_color(lit ? "#3d2104" : C.gray).child(title)),
      )
      .when(!title, (el) => el.child(div().flex_1()))
      .when(Boolean(where), (el) => el.child(div().flex_none().px(u(8)).text_color(lit ? "#5a3006" : C.dim).child(where)))
      .when(Boolean(p.status), (el) => el.child(div().flex_none().mr(u(6)).child(statusCell(u, p.status))))
      .child(this.action(u, `bbg-split-${id}`, 96, "SPLT", lit, () => run("pane.split", { direction: "right", pane: id })))
      .child(this.action(u, `bbg-zoom-${id}`, 97, p.zoomed ? "UNZM" : "ZOOM", lit, () => run("pane.zoom", { pane: id })))
      .child(this.action(u, `bbg-close-${id}`, 98, "CLSE", lit, () => run("pane.close", { pane: id })));
  }
}
