// NEW CONTROL: place a new agent on the map. Pick the space (it decides the
// machine), the runner, and the first task; Enter or PLACE CONTROL starts it
// in a new tab there (tab.new {space, argv, task}). Esc closes.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, props, run, closeOverlay } from "herdr";
import { C, unit, root, button, machineName } from "./kit.js";

const RUNNERS = [
  ["claude", "CLAUDE CODE", ["claude"]],
  ["codex", "CODEX", ["codex"]],
  ["shell", "SHELL", null],
];

export default class Launch {
  init(_p, cx) {
    this.focus = cx.focus_handle();
    this.focus.focus();
    this.space = spaces().find((s) => s.active)?.id ?? spaces()[0]?.id ?? null;
    this.runner = 0;
    this.task = "";
    this.err = null;
  }

  close() {
    closeOverlay(props()?.overlay);
  }

  place() {
    const sp = spaces().find((s) => s.id === this.space);
    if (!sp) return (this.err = "PICK A SPACE");
    const [, , argv] = RUNNERS[this.runner];
    const task = this.task.trim();
    run("tab.new", { space: sp.id, ...(argv ? { argv } : {}), ...(argv && task ? { task } : {}) });
    this.close();
  }

  key(e, cx) {
    const m = e.modifiers;
    if (e.key === "escape") this.close();
    else if (e.key === "enter") this.place();
    else if (e.key === "tab") this.runner = (this.runner + 1) % RUNNERS.length;
    else if (e.key === "backspace") this.task = m.alt || m.platform ? this.task.replace(/\S+\s*$/, "") : this.task.slice(0, -1);
    else if (m.control && e.key === "u") this.task = "";
    else if (e.key_char && !m.control && !m.platform) this.task += e.key_char;
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  render(_cx) {
    const u = unit();
    const all = spaces();
    const shell = RUNNERS[this.runner][0] === "shell";
    const label = (t) => div().flex_none().text_size(u(11)).font_weight(600).text_color(C.gray).child(t);
    return root(
      u,
      v_flex()
        .id("orient-launch")
        .track_focus(this.focus)
        .on_key_down((e, cx) => this.key(e, cx))
        .size_full()
        .bg(C.forest)
        .border(u(2))
        .border_color(C.black),
      14,
    )
      .child(
        h_flex().flex_none().h(u(34)).px(u(12)).gap(u(10)).items_center().bg(C.purple).text_color(C.forest)
          .child(div().text_size(u(18)).font_weight(700).child("NEW CONTROL"))
          .child(div().flex_1())
          .child(div().text_color("#f3d6ea").child("ENTER PLACES · TAB SWITCHES RUNNER · ESC")),
      )
      .child(
        h_flex().flex_1().min_h(0).gap(u(12)).p(u(12))
          .child(
            v_flex().w(u(230)).flex_none().gap(u(4)).child(label("SPACE (DECIDES THE MACHINE)"))
              .child(
                v_flex().id("orient-launch-spaces").flex_1().min_h(0).overflow_y_scroll().border(u(1)).border_color(C.black)
                  .children(all.map((s) => {
                    const on = s.id === this.space;
                    return h_flex().id(`orient-ls-${s.id}`).flex_none().h(u(26)).px(u(8)).gap(u(6)).items_center().cursor_pointer()
                      .bg(on ? C.purpleWash : C.forest).border_b(u(1)).border_color(C.hair)
                      .hover((x) => x.bg(C.purpleWash))
                      .on_click((_e, cx) => { this.space = s.id; cx.notify(); })
                      .child(div().flex_none().w(u(8)).h(u(8)).bg(s.machine === null ? C.open : s.machine === "dev-vm" ? C.olive : C.green).border(u(1)).border_color(C.black))
                      .child(div().flex_1().min_w(0).truncate().font_weight(on ? 700 : 500).child(s.name.toUpperCase()))
                      .child(div().flex_none().text_size(u(11)).text_color(C.gray).child(machineName(s.machine)));
                  })),
              ),
          )
          .child(
            v_flex().flex_1().min_w(0).gap(u(10))
              .child(label("RUNNER"))
              .child(h_flex().gap(u(6)).children(RUNNERS.map((r, i) =>
                button(u, `orient-runner-${r[0]}`, r[1], (_e, cx) => { this.runner = i; cx.notify(); }, { primary: i === this.runner }))))
              .child(label(shell ? "TASK (AGENTS ONLY)" : "FIRST TASK"))
              .child(
                div().flex_none().min_h(u(64)).p(u(8)).border(u(1)).border_color(C.purple).bg(C.forest)
                  .text_color(this.task ? C.black : C.dim).whitespace_normal()
                  .child(this.task || (shell ? "A shell opens in the space's folder." : "Type the task this agent starts with.")),
              )
              .when(Boolean(this.err), (e) => e.child(div().text_color(C.red).font_weight(600).child(this.err)))
              .child(div().flex_1())
              .child(h_flex().gap(u(8)).justify_end()
                .child(button(u, "orient-launch-cancel", "CANCEL", () => this.close()))
                .child(button(u, "orient-launch-go", "PLACE CONTROL", (_e, cx) => { this.place(); cx.notify(); }, { primary: true }))),
          ),
      );
  }
}
