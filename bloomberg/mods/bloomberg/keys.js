// The keyboard along the bottom, after the Bloomberg keyboard's color code:
// green action keys (GO, MENU), a yellow market key per space (the shown one
// pressed in, a lit bar under it for its most urgent status), the red BLKD
// key that jumps to an agent waiting on you, and the date.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, run } from "herdr";
import { C, unit, root, keycap, focusCommandLine, openHelp, execute, code, board, status } from "./kit.js";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export default class Keys {
  init(_p, cx) {
    this.now = new Date();
    cx.timer.every(15 * 60 * 1000, (cx) => {
      this.now = new Date();
      cx.notify();
    });
  }

  render(_cx) {
    const u = unit();
    const all = spaces();
    const list = board();
    const blocked = list.filter((a) => a.status === "blocked").length;
    const d = this.now;

    const market = all.map((s, i) => {
      const st = s.status && s.status !== "idle" ? status(s.status).bg : null;
      return keycap(u, `bbg-key-${s.id}`, null, "yellow", () => run("space.select", { id: s.id }), {
        down: s.active,
        tip: `${s.name}${s.machine ? ` on ${s.machine}` : ""}: ${i + 1} <GO>`,
        content: h_flex()
          .gap(u(5))
          .items_center()
          .child(div().text_color("#5c4a00").child(`F${i + 1}`))
          .child(div().child(code(s.name)))
          .when(Boolean(st), (el) => el.child(div().w(u(6)).h(u(6)).bg(st).border_1().border_color(C.keyInk))),
      });
    });

    return root(
      u,
      h_flex()
        .id("bbg-keys")
        .size_full()
        .px(u(8))
        .gap(u(5))
        .items_center()
        .bg("#121212")
        .border_t(u(1))
        .border_color(C.ruleHot),
    )
      .child(keycap(u, "bbg-key-go", "GO", "green", () => focusCommandLine(), { tip: "The command line (cmd-g)" }))
      .child(keycap(u, "bbg-key-menu", "MENU", "green", () => openHelp(), { tip: "Every mnemonic (HELP <GO>)" }))
      .child(div().flex_none().w(u(6)))
      .children(market)
      .child(keycap(u, "bbg-key-new", "NEW", "gray", () => run("space.new", {}), { tip: "A new space (NEW <name> <GO>)" }))
      .child(div().flex_1())
      .child(keycap(u, "bbg-key-next", "NEXT", "green", () => run("agent.next", {}), { tip: "The next agent on the board" }))
      .child(
        keycap(u, "bbg-key-blkd", blocked ? `BLKD ${blocked}` : "BLKD", blocked ? "red" : "gray", () => execute("BLKD"), {
          tip: "Jump to an agent waiting on you",
        }),
      )
      .child(keycap(u, "bbg-key-pref", "PREF", "gray", () => run("app.settings", {}), { tip: "Herdr settings (PREF <GO>)" }))
      .child(div().flex_none().w(u(10)))
      .child(div().flex_none().text_color(C.amber).child(`${DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`));
  }
}
