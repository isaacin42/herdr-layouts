// A pane's header as a legend strip: the status symbol, the program, what
// it's doing, where it runs, and the state word. The focused pane is ruled
// in course purple. Click focuses; double-click zooms; the small actions
// split, zoom and close.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home } from "herdr";
import { C, unit, root, symbol, state, clean } from "./kit.js";

function where(cwd) {
  if (!cwd) return "";
  const h = home();
  const p = cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
  const parts = p.split("/").filter(Boolean);
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : p;
}

export default class Pane {
  init() {}

  act(u, id, label, fn) {
    return div()
      .id(id)
      .flex_none()
      .px(u(5))
      .text_color(C.gray)
      .cursor_pointer()
      .hover((s) => s.text_color(C.purple))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        cx.stop_propagation();
        fn();
      })
      .child(label);
  }

  render(_cx) {
    const u = unit();
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    if (!p) return div();
    const lit = p.focused;
    const title = clean(p.title && p.title !== p.program?.name ? p.title : "");
    return root(
      u,
      h_flex()
        .id(`orient-pane-${id}`)
        .size_full()
        .px(u(8))
        .gap(u(8))
        .items_center()
        .bg(C.paper)
        .border_b(u(lit ? 2 : 1))
        .border_color(lit ? C.purple : C.black)
        .on_click((e, _cx) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id })),
      13,
    )
      .child(p.status ? symbol(u, p.status, 12) : div().flex_none().w(u(9)).h(u(9)).bg(C.black))
      .child(div().flex_none().font_weight(700).text_color(lit ? C.purple : C.black).child((p.program?.name || "Shell").toUpperCase()))
      .child(div().flex_1().min_w(0).truncate().text_color(C.gray).child(title))
      .child(div().flex_none().text_color(C.dim).child(where(p.cwd)))
      .when(Boolean(p.status), (e) => e.child(div().flex_none().font_weight(600).text_color(p.status === "blocked" ? C.purple : C.black).child(state(p.status).word)))
      .child(this.act(u, `orient-split-${id}`, "SPLIT", () => run("pane.split", { direction: "right", pane: id })))
      .child(this.act(u, `orient-zoom-${id}`, p.zoomed ? "UNZOOM" : "ZOOM", () => run("pane.zoom", { pane: id })))
      .child(this.act(u, `orient-close-${id}`, "CLOSE", () => run("pane.close", { pane: id })));
  }
}
