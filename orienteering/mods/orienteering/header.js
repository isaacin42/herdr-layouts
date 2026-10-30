// The map's top margin, as printed on a real O-map: the title, the legend
// (each status's symbol with its count), the machines on the map, and the
// two actions: NEW CONTROL (start an agent with a task) and SETTINGS.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, spaces } from "herdr";
import { C, unit, root, symbol, state, button, machineName, openLaunch, openSettings } from "./kit.js";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export default class Header {
  init(_p, cx) {
    this.day = new Date();
    cx.timer.every(30 * 60 * 1000, (cx) => {
      this.day = new Date();
      cx.notify();
    });
  }

  render(_cx) {
    const u = unit();
    const all = agents();
    const n = (s) => all.filter((a) => a.status === s).length;
    const ms = [...new Set(spaces().map((s) => s.machine ?? null))].sort((a, b) => (a === null ? -1 : b === null ? 1 : a.localeCompare(b)));
    const d = this.day;
    const legend = ["blocked", "done", "working", "idle"].map((s) =>
      h_flex()
        .flex_none()
        .gap(u(5))
        .items_center()
        .child(symbol(u, s, 13))
        .child(div().text_color(s === "blocked" ? C.purple : C.black).font_weight(s === "blocked" ? 700 : 500).child(`${state(s).word} ${n(s)}`)),
    );

    return root(
      u,
      h_flex()
        .id("orient-header")
        .size_full()
        .pl(u(84))
        .pr(u(10))
        .gap(u(14))
        .items_center()
        .bg(C.paper)
        .border_b(u(2))
        .border_color(C.black),
      14,
    )
      .child(h_flex().flex_none().gap(u(6)).items_baseline().child(div().text_size(u(20)).font_weight(700).child("HERDR")).child(div().text_size(u(20)).font_weight(500).text_color(C.purple).child("O-MAP")))
      .child(div().flex_none().text_color(C.gray).child(`${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`))
      .child(div().flex_none().w(u(1)).h(u(22)).bg(C.black))
      .children(legend)
      .child(div().flex_1())
      .child(div().flex_none().text_color(C.gray).child(ms.map(machineName).join(" · ")))
      .child(button(u, "orient-new", "NEW CONTROL", () => openLaunch(), { primary: true }))
      .child(button(u, "orient-settings", "SETTINGS", () => openSettings()));
  }
}
