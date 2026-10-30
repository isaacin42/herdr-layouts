// The J-card's outside: the FRONT FLAP across the top (title, the brand
// stripe, the settings button), the SPINE down the left edge (the active
// space hand-lettered; click to flip sides), and each pane's TAPE LABEL
// (the pane header in the deck).

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { panes, props, run, focused, agents } from "herdr";
import { C, unit, hand, printed, art, programIcon, tape, trackTitle, penButton } from "./kit.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export class Flap {
  init(_p, cx) {
    this.now = new Date();
    cx.timer.every(30 * 60 * 1000, (cx) => {
      this.now = new Date();
      cx.notify();
    });
  }

  render(_cx) {
    const u = unit();
    const list = agents();
    const n = (s) => list.filter((a) => a.status === s).length;
    const d = this.now;
    return hand(u, v_flex().id("mx-flap").size_full().bg(C.card))
      .child(
        h_flex()
          .flex_1()
          .pl(u(82))
          .pr(u(14))
          .gap(u(14))
          .items_center()
          .child(div().flex_none().text_size(u(26)).text_color(C.ink).child("herdr mix"))
          .child(printed(u, "c-90 · high position · type ii", C.pencil, 8))
          .child(div().flex_1())
          .child(div().flex_none().text_size(u(16)).text_color(C.ink).child(`${n("working")} playing`))
          .child(div().flex_none().text_size(u(16)).text_color(n("blocked") ? C.stripe : C.pencil).child(`${n("blocked")} your call`))
          .child(div().flex_none().text_size(u(16)).text_color(C.ink).child(`${n("done")} done`))
          .child(div().flex_none().text_size(u(16)).text_color(C.pencil).child(`${d.getDate()} ${MONTHS[d.getMonth()]}`))
          .child(
            penButton(u, "mx-settings", "", () => run("app.settings", {}), {
              tip: "Herdr settings",
              content: h_flex().gap(u(5)).items_center().child(art("gear", u, 15)).child(div().text_size(u(16)).child("settings")),
            }),
          ),
      )
      .child(
        // The printed brand stripe: the card's one printed colour.
        h_flex()
          .flex_none()
          .h(u(10))
          .px(u(14))
          .items_center()
          .bg(C.stripe)
          .child(printed(u, "herdr · mixtape · side a / side b", C.stripeInk, 7)),
      );
  }
}

export class Spine {
  init() {}

  render(_cx) {
    const u = unit();
    const f = focused();
    const sides = tape();
    const side = sides.find((s) => s.groups.some((g) => g.space.id === f?.space));
    const space = side?.groups.find((g) => g.space.id === f?.space)?.space;
    const letters = (space?.name ?? "no space").toUpperCase().replace(/\s+/g, " ").slice(0, 16).split("");
    return hand(
      u,
      v_flex()
        .id("mx-spine")
        .size_full()
        .bg(C.card)
        .border_r(u(1))
        .border_color(C.rule)
        .cursor_pointer()
        .tooltip("Flip to the other side and play its most urgent track")
        .on_click((_e, _cx) => run("mixtape.flip", {})),
    )
      .child(
        div()
          .flex_none()
          .h(u(34))
          .flex()
          .items_center()
          .justify_center()
          .bg(C.stripe)
          .text_color(C.stripeInk)
          .text_size(u(20))
          .child(side?.letter ?? "?"),
      )
      .child(
        v_flex()
          .flex_1()
          .min_h(0)
          .py(u(8))
          .items_center()
          .overflow_hidden()
          .text_size(u(18))
          .line_height(`${u(19)}px`)
          .children(letters.map((ch) => div().flex_none().child(ch === " " ? "·" : ch))),
      )
      .child(
        v_flex()
          .flex_none()
          .pb(u(10))
          .items_center()
          .gap(u(4))
          .child(art("reel", u, 18, C.inkSoft))
          .child(printed(u, "flip", C.pencil, 7)),
      );
  }
}

const SAY = { working: "playing", blocked: "your call", done: "done", idle: "paused" };

export class Label {
  init() {}

  render(_cx) {
    const u = unit();
    const id = props()?.pane;
    const p = panes().find((x) => x.pane === id);
    if (!p) return div();
    let where = "";
    for (const s of tape())
      for (const g of s.groups)
        for (const t of g.tracks) if (t.tab.id === p.tab) where = `${s.letter}${t.no}`;
    const lit = p.focused;
    const name = (p.program?.name ?? "shell").toLowerCase();
    const title = p.title && p.title !== p.program?.name ? trackTitle({ named: false, name: "" }, { title: p.title, program: p.program }) : "";
    return hand(
      u,
      h_flex()
        .id(`mx-label-${id}`)
        .size_full()
        .gap(u(8))
        .items_center()
        .bg(C.label)
        .border_b(u(lit ? 2 : 1))
        .border_color(lit ? C.ink : C.rule)
        .on_click((e, _cx) => run(e.click_count >= 2 ? "pane.zoom" : "pane.focus", { pane: id })),
      15,
    )
      .child(div().flex_none().h_full().px(u(8)).flex().items_center().bg(C.stripe).text_color(C.stripeInk).child(where || "·"))
      .when(Boolean(programIcon(u, p.program, 13)), (el) => el.child(programIcon(u, p.program, 13)))
      .child(div().flex_none().text_color(C.ink).child(name))
      .child(div().flex_1().min_w(0).truncate().text_color(C.inkSoft).child(title.toLowerCase()))
      .when(Boolean(p.status), (el) =>
        el.child(
          h_flex()
            .flex_none()
            .gap(u(3))
            .items_center()
            .when(p.status === "blocked", (x) => x.child(art("bang", u, 15)))
            .when(p.status === "done", (x) => x.child(art("tick", u, 16)))
            .child(div().text_color(p.status === "idle" ? C.pencil : C.ink).child(SAY[p.status] ?? "")),
        ),
      )
      .child(penButton(u, `mx-split-${id}`, "split", () => run("pane.split", { direction: "right", pane: id }), { tip: "Split this pane right" }))
      .child(penButton(u, `mx-zoom-${id}`, p.zoomed ? "unzoom" : "zoom", () => run("pane.zoom", { pane: id }), { tip: "Zoom this pane" }))
      .child(penButton(u, `mx-close-${id}`, "close", () => run("pane.close", { pane: id }), { tip: "Close this pane" }))
      .child(div().flex_none().w(u(4)));
  }
}
