// The command line across the top: type a mnemonic, press <GO> (Enter).
// Tab completes the first suggestion, Esc cancels back to the panel, a bare
// number picks that space. cmd-g (keys.json, layout:bloomberg) or the GO key
// puts the keyboard here. Right side: the context you're in, and the clock.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, focused, run, nextCommand } from "herdr";
import { C, unit, root, label, execute, suggest, code, openHelp } from "./kit.js";

function clock(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default class Cmdline {
  init(_p, cx) {
    this.focus = cx.focus_handle();
    this.text = "";
    this.msg = null;
    this.now = new Date();
    this.history = [];
    this.back = -1;
    const tick = (cx) => {
      this.now = new Date();
      cx.notify();
    };
    cx.timer.after(60000 - (Date.now() % 60000) + 50, (cx) => {
      tick(cx);
      cx.timer.every(60000, tick);
    });
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "go") this.focus.focus();
        else if (c === "help") openHelp();
        cx.notify();
      }
    });
  }

  say(ok, msg, cx) {
    this.msg = msg ? { ok, msg, at: Date.now() } : null;
    const at = this.msg?.at;
    cx.timer.after(ok ? 2200 : 5000, (cx) => {
      if (this.msg?.at === at) {
        this.msg = null;
        cx.notify();
      }
    });
  }

  leave() {
    const p = focused()?.pane;
    if (p) run("pane.focus", { pane: p });
  }

  key(e, cx) {
    const m = e.modifiers;
    if (e.key === "escape") {
      this.text = "";
      this.msg = null;
      this.leave();
    } else if (e.key === "enter") {
      const line = this.text;
      const r = execute(line);
      if (line.trim()) this.history = [line, ...this.history.filter((h) => h !== line)].slice(0, 30);
      this.back = -1;
      this.text = "";
      this.say(r.ok, r.msg, cx);
      if (r.ok) this.leave();
    } else if (e.key === "tab") {
      const s = suggest(this.text)[0];
      if (s) this.text = s[0] + (s[1] ? " " : "");
    } else if (e.key === "up") {
      if (this.history.length) this.text = this.history[(this.back = Math.min(this.history.length - 1, this.back + 1))];
    } else if (e.key === "down") {
      this.back = Math.max(-1, this.back - 1);
      this.text = this.back < 0 ? "" : this.history[this.back];
    } else if (e.key === "backspace") {
      this.text = m.alt || m.platform ? this.text.replace(/\S+\s*$/, "") : this.text.slice(0, -1);
    } else if (m.control && e.key === "u") {
      this.text = "";
    } else if (e.key_char && !m.control && !m.platform) {
      this.text += e.key_char;
    } else return;
    cx.stop_propagation();
    cx.notify();
  }

  render(cx) {
    const u = unit();
    const on = this.focus.is_focused();
    const f = focused();
    const sp = spaces().find((s) => s.id === f?.space);
    const tab = sp?.tabs.find((t) => t.id === f?.tab);
    const typed = this.text.toUpperCase();
    const sugg = suggest(this.text);

    const caret = div().flex_none().w(u(7)).h(u(13)).bg(C.amber).loop("opacity", { from: 0, to: 1, period: 1000, easing: "linear" });
    const field = h_flex()
      .id("bbg-field")
      .flex_1()
      .min_w(0)
      .h(u(22))
      .px(u(8))
      .items_center()
      .bg(on ? "#140b02" : C.panel)
      .border_1()
      .border_color(on ? C.amber : C.rule)
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => {
        cx.stop_propagation();
        this.focus.focus();
        cx.notify();
      })
      .when(Boolean(typed) || !on, (el) =>
        el.child(div().flex_none().text_color(typed ? C.white : C.amberDim).whitespace_nowrap().child(typed || "TYPE A MNEMONIC  ·  CMD-G  ·  HELP <GO>")),
      )
      .when(on, (el) => el.child(caret))
      .child(div().flex_1())
      .when(on && !this.msg, (el) =>
        el.children(
          sugg.map((s, i) =>
            h_flex()
              .id(`bbg-sugg-${s[0]}`)
              .flex_none()
              .gap(u(6))
              .ml(u(14))
              .on_mouse_down("left", (_e, cx) => {
                cx.stop_propagation();
                this.text = s[0] + (s[1] ? " " : "");
                cx.notify();
              })
              .child(div().text_color(i === 0 ? C.amber : C.amberDim).child(s[0]))
              .child(div().text_color(i === 0 ? C.gray : C.dim).whitespace_nowrap().child(s[2])),
          ),
        ),
      )
      .when(Boolean(this.msg), (el) =>
        el.child(div().flex_none().text_color(this.msg.ok ? C.green : C.red).whitespace_nowrap().child(this.msg.msg)),
      );

    const goKey = div()
      .id("bbg-go")
      .flex_none()
      .h(u(22))
      .px(u(10))
      .flex()
      .items_center()
      .bg(C.keyGreen)
      .text_color("#04140a")
      .border_b(u(2))
      .border_color(C.keyGreenLo)
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        if (this.text.trim()) this.key({ key: "enter", modifiers: {} }, cx);
        else {
          this.focus.focus();
          cx.notify();
        }
      })
      .child("GO");

    return root(
      u,
      h_flex()
        .id("bbg-cmdline")
        .track_focus(this.focus)
        .on_key_down((e, cx) => this.key(e, cx))
        .size_full()
        .pl(u(78))
        .pr(u(10))
        .gap(u(8))
        .items_center()
        .bg(C.glass)
        .border_b(u(1))
        .border_color(C.ruleHot),
    )
      .child(div().flex_none().text_color(C.amber).font_weight(700).child("HERDR"))
      .child(div().flex_none().w(u(1)).h(u(18)).bg(C.rule))
      .child(field)
      .child(goKey)
      .child(
        h_flex()
          .flex_none()
          .gap(u(6))
          .items_center()
          .child(label(sp ? code(sp.name) : "----"))
          .child(div().text_color(C.white).child(sp ? `${sp.name.toUpperCase()}${tab ? ` <${tab.index}>` : ""}` : "NO SPACE"))
          .child(div().text_color(C.dim).child(sp?.machine ? sp.machine.toUpperCase() : "LOCAL")),
      )
      .child(div().flex_none().w(u(1)).h(u(18)).bg(C.rule))
      .child(div().flex_none().text_color(C.amber).child(clock(this.now)));
  }
}
