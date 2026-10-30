// The rail between the map and the terminals: the leg you're running now
// (the shown space and tab, on its machine) and how many terminals are on it.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, focused } from "herdr";
import { C, unit, root, machineName } from "./kit.js";

export default class Rail {
  init() {}

  render(_cx) {
    const u = unit();
    const f = focused();
    const sp = spaces().find((s) => s.id === f?.space);
    const tab = sp?.tabs.find((t) => t.id === f?.tab);
    const count = panes().filter((p) => p.tab === f?.tab).length;
    return root(u, h_flex().id("orient-rail").size_full().items_center().bg(C.paper).border_t(u(2)).border_b(u(1)).border_color(C.black), 13)
      .child(div().flex_none().h_full().px(u(10)).flex().items_center().bg(C.purple).text_color(C.forest).font_weight(700).child("THIS LEG"))
      .child(div().flex_none().px(u(10)).font_weight(700).child(sp ? sp.name.toUpperCase() : "NO SPACE"))
      .child(div().flex_none().text_color(C.gray).child(tab ? `TAB ${tab.name.toUpperCase()}` : ""))
      .child(div().flex_1())
      .child(div().flex_none().px(u(10)).text_color(C.gray).child(`${count} TERMINAL${count === 1 ? "" : "S"} · ${machineName(sp?.machine ?? null)}`));
  }
}
