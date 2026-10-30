// HELP <GO>: every mnemonic as a numbered Bloomberg menu. Click a line (or
// type its number and Enter) to run it; Esc closes.

import { View, div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { C, unit, root, MNEMONICS, execute , focusCommandLine } from "./kit.js";

export default class Help {
  init(_p, cx) {
    this.focus = cx.focus_handle();
    this.focus.focus();
    this.typed = "";
  }

  pick(i) {
    const m = MNEMONICS[i];
    if (!m) return;
    closeOverlay(props()?.overlay);
    if (m[1].includes("<")) focusCommandLine();
    else if (m[0] !== "HELP") execute(m[0]);
  }

  key(e, cx) {
    if (e.key === "escape") closeOverlay(props()?.overlay);
    else if (e.key === "enter") this.pick(Number(this.typed) - 1);
    else if (e.key === "backspace") this.typed = this.typed.slice(0, -1);
    else if (/^\d$/.test(e.key_char ?? "")) this.typed = (this.typed + e.key_char).slice(-2);
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  render(_cx) {
    const u = unit();
    const rows = MNEMONICS.map((m, i) =>
      h_flex()
        .id(`bbg-help-${m[0]}`)
        .flex_none()
        .h(u(20))
        .px(u(12))
        .gap(u(10))
        .items_center()
        .cursor_pointer()
        .when(this.typed === String(i + 1), (el) => el.bg(C.rowSel))
        .hover((s) => s.bg(C.rowSel))
        .on_click((_e, _cx) => this.pick(i))
        .child(div().flex_none().w(u(28)).text_right().text_color(C.amberDim).child(`${i + 1})`))
        .child(div().flex_none().w(u(40)).text_color(C.amber).child(m[0]))
        .child(div().flex_none().w(u(140)).text_color(C.white).child(m[1]))
        .child(div().flex_1().min_w(0).truncate().text_color(C.gray).child(m[2])),
    );
    return root(
      u,
      v_flex()
        .id("bbg-help")
        .track_focus(this.focus)
        .on_key_down((e, cx) => this.key(e, cx))
        .size_full()
        .bg(C.glass)
        .border_1()
        .border_color(C.amber),
    )
      .child(
        h_flex()
          .flex_none()
          .h(u(24))
          .px(u(12))
          .gap(u(10))
          .items_center()
          .bg(C.amber)
          .text_color(C.amberInk)
          .child(div().child("HELP"))
          .child(div().flex_1().child("HERDR TERMINAL  ·  MNEMONICS"))
          .child(div().child(this.typed ? `${this.typed} <GO>` : "ESC CLOSES")),
      )
      .child(
        div()
          .flex_none()
          .px(u(12))
          .py(u(8))
          .text_color(C.gray)
          .child("TYPE A MNEMONIC ON THE COMMAND LINE (CMD-G), THEN ENTER FOR <GO>. TAB COMPLETES. A BARE NUMBER GOES TO THAT SPACE: 2 <GO>."),
      )
      .child(v_flex().id("bbg-help-rows").flex_1().min_h(0).overflow_y_scroll().children(rows))
      .child(
        h_flex()
          .flex_none()
          .h(u(22))
          .px(u(12))
          .items_center()
          .border_t(u(1))
          .border_color(C.rule)
          .text_color(C.amberDim)
          .child("CLICK A LINE OR TYPE ITS NUMBER, THEN ENTER. MNEMONICS WITH <ARGS> OPEN THE COMMAND LINE."),
      );
  }
}
