// The rail between the bay and the enlarger: which tab is under the
// enlarger, the station counts as a stepped test strip (light to dark in
// process order), and the Settings tag.

import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, spaces, run } from "herdr";
import { C, TONES, unit, hand, printed } from "./kit.js";

export default class Rail {
  init() {}

  render(_cx) {
    const u = unit();
    const list = agents();
    const n = (s) => list.filter((a) => a.status === s).length;
    const sp = spaces().find((s) => s.active);
    const tab = sp?.tabs.find((t) => t.active);
    const steps = [
      ["test", n("blocked"), TONES[0]],
      ["develop", n("working"), TONES[1]],
      ["wash", n("idle"), TONES[2]],
      ["dry", n("done"), TONES[3]],
    ];
    return h_flex()
      .id("darkroom-rail")
      .size_full()
      .px(u(16))
      .gap(u(10))
      .items_center()
      .bg(C.bench)
      .border_t(u(1))
      .border_b(u(1))
      .border_color("#3a2614")
      .child(image("mods/darkroom/enlarger.svg").flex_none().w(u(22)).h(u(19)))
      .child(printed(u, "UNDER THE ENLARGER", 14, C.amber, { bold: true }))
      .child(hand(u, sp ? `${sp.name}  /  ${tab?.name ?? ""}` : "no space", 16, C.muted))
      .child(div().flex_1())
      .child(
        h_flex()
          .flex_none()
          .h(u(22))
          .children(
            steps.map(([name, count, tone], i) =>
              h_flex()
                .h_full()
                .px(u(9))
                .gap(u(5))
                .items_center()
                .bg(tone)
                .child(hand(u, name, 14, i < 2 ? C.ink : C.paper))
                .child(printed(u, String(count), 13, i < 2 ? C.ink : C.paper, { bold: true })),
            ),
          ),
      )
      .child(
        div()
          .id("darkroom-settings")
          .flex_none()
          .h(u(22))
          .px(u(10))
          .flex()
          .items_center()
          .bg(C.tape)
          .cursor_pointer()
          .hover((s) => s.bg(C.tapeHot))
          .tooltip("Herdr settings")
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => {
            cx.stop_propagation();
            run("app.settings", {});
          })
          .child(hand(u, "settings", 15, C.ink)),
      );
  }
}
