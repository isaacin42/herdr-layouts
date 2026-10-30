// The masthead: the nameplate, the dateline with the edition time, the
// right-hand ear with tonight's tally (held, filed, on deadline), and the desk's
// two standing buttons, ASSIGN (a new story) and SETTINGS (Herdr's settings).
// A thick-and-thin double rule closes it, as on a front page.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { run, openOverlay } from "herdr";
import { C, SERIF, unit, root, wire, mark, doubleRule, stories, clockTime } from "./kit.js";

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

export function openAssign() {
  openOverlay({ mod: "desk", kind: "dialog", frame: "none", modal: true, props: { role: "assign" }, width: 560, height: 420 });
}

export default class Masthead {
  init(_p, cx) {
    this.now = new Date();
    cx.timer.after(60000 - (Date.now() % 60000) + 50, (cx) => {
      this.now = new Date();
      cx.notify();
      cx.timer.every(60000, (cx) => {
        this.now = new Date();
        cx.notify();
      });
    });
  }

  render(_cx) {
    const u = unit();
    const d = this.now;
    const list = stories();
    const n = (s) => list.filter((a) => a.status === s && !(a.spiked && s !== "blocked")).length;
    const tally = (count, word, color) =>
      h_flex()
        .flex_none()
        .gap(u(5))
        .items_baseline()
        .child(div().font_family(SERIF).font_weight(700).text_size(u(17)).text_color(color).child(String(count)))
        .child(wire(u, word, { color }));

    return root(u, v_flex().id("desk-masthead").size_full().bg(C.paper).px(u(14)).pt(u(6)))
      .child(
        h_flex()
          .flex_1()
          .min_h(0)
          .items_center()
          .gap(u(14))
          .pl(u(64))
          .child(
            v_flex()
              .flex_none()
              .child(div().font_family(SERIF).font_weight(700).text_size(u(27)).line_height(`${u(28)}px`).child("The Desk"))
              .child(wire(u, `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · LATE CITY · ${clockTime(d)}`, { size: 8.5, color: C.dim })),
          )
          .child(div().flex_1())
          .child(tally(n("blocked"), "HOLD FOR EDITOR", n("blocked") ? C.red : C.dim))
          .child(tally(n("done"), "FILED", C.filed))
          .child(tally(n("working"), "ON DEADLINE", C.ink))
          .child(div().flex_none().w(u(0.5)).h(u(26)).bg(C.rule))
          .child(mark(u, "desk-assign", "ASSIGN", () => openAssign(), { solid: true, tip: "Assign a new story: start an agent with a brief" }))
          .child(mark(u, "desk-settings", "SETTINGS", () => run("app.settings", {}), { boxed: true, tip: "Herdr settings" })),
      )
      .child(div().flex_none().pb(u(4)).child(doubleRule(u)));
  }
}
