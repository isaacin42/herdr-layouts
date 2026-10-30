// The copy: the shown tab's live terminals, each set as a galley proof. Its
// header is the galley slug: galley number, the program and what it's on, where
// it runs, its status in desk words, and three proof marks (SPLIT, ZOOM, KILL).
// The galley you're working in is set in reverse, paper on ink.
//
// role "copyhead": the rail above the galleys, naming the story in the copy.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, spaces, props, run } from "herdr";
import { C, SERIF, unit, root, wire, mark, status, shortPath, slugify, clean, machineOf } from "./kit.js";

export class CopyHead {
  init() {}
  render(_cx) {
    const u = unit();
    const sp = spaces().find((s) => s.active);
    const tab = sp?.tabs.find((t) => t.active);
    const count = tab ? panes().filter((p) => p.tab === tab.id).length : 0;
    const m = machineOf(sp);
    return root(u, h_flex().id("desk-copyhead").size_full().px(u(12)).gap(u(10)).items_center().bg(C.desk))
      .child(div().flex_none().font_weight(700).text_size(u(14)).child("The Copy"))
      .child(wire(u, sp ? `${sp.name.toUpperCase()} / ${tab ? (tab.named ? tab.name.toUpperCase() : `TAB ${tab.index}`) : ""}` : "NO STORY IN THE COPY", { color: C.inkSoft }))
      .child(wire(u, m ? `FROM ${m.toUpperCase()}` : "FROM THIS DESK", { size: 8.5, color: C.dim }))
      .child(div().flex_1())
      .child(wire(u, `${count} ${count === 1 ? "GALLEY" : "GALLEYS"}`, { size: 8.5, color: C.dim }));
  }
}

export default class Galley {
  init() {}

  render(_cx) {
    const u = unit();
    const id = props()?.pane;
    const all = panes();
    const p = all.find((x) => x.pane === id);
    if (!p) return div();
    const n = all.filter((x) => x.tab === p.tab).findIndex((x) => x.pane === id) + 1;
    const lit = p.focused;
    const ink = lit ? C.paper : C.ink;
    const soft = lit ? "#cfc8b8" : C.dim;
    const prog = p.program?.name ?? "Shell";
    const title = clean(p.title);
    const st = p.status ? status(p.status) : null;
    const where = shortPath(p.cwd);

    return root(
      u,
      h_flex()
        .id(`desk-galley-${id}`)
        .size_full()
        .px(u(8))
        .gap(u(8))
        .items_center()
        .bg(lit ? C.ink : C.sheet)
        .border_b(u(0.5))
        .border_color(lit ? C.ink : C.rule)
        .on_click((e, _cx) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id })),
    )
      .child(wire(u, `GALLEY ${n}`, { size: 8.5, bold: true, color: lit ? C.paper : C.red }))
      .child(div().flex_none().font_family(SERIF).font_weight(700).text_size(u(13)).text_color(ink).child(prog))
      .when(Boolean(title) && title !== prog, (el) =>
        el.child(div().flex_1().min_w(0).truncate().italic().text_size(u(13)).text_color(ink).child(title)),
      )
      .when(!title || title === prog, (el) => el.child(div().flex_1()))
      .when(Boolean(p.branch), (el) => el.child(wire(u, slugify(p.branch).toLowerCase(), { size: 8.5, color: soft })))
      .when(Boolean(where), (el) => el.child(wire(u, where, { size: 8.5, color: soft })))
      .when(Boolean(st), (el) =>
        el.child(wire(u, st.word, { size: 8.5, bold: true, color: lit ? (p.status === "blocked" ? "#ff9b8f" : C.paper) : st.color })),
      )
      .child(mark(u, `desk-g-split-${id}`, "SPLIT", () => run("pane.split", { direction: "right", pane: id }), { size: 8.5, px: 4, color: ink, dark: lit, tip: "Split this galley to the right" }))
      .child(mark(u, `desk-g-zoom-${id}`, p.zoomed ? "UNZOOM" : "ZOOM", () => run("pane.zoom", { pane: id }), { size: 8.5, px: 4, color: ink, dark: lit }))
      .child(mark(u, `desk-g-kill-${id}`, "KILL", () => run("pane.close", { pane: id }), { size: 8.5, px: 4, color: lit ? "#ff9b8f" : C.red, dark: lit, tip: "Close this galley (ends its terminal)" }));
  }
}
