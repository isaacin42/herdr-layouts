// ASSIGN: a new story. Slug (the tab's name), desk (the space it runs in, and
// so its machine), reporter (an agent installed on that machine, or a shell),
// and the brief (the agent's first message). ASSIGN starts it with
// tab.new { space, name, argv, task }. Tab moves between slug and brief,
// Enter assigns, Esc spikes the form.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, props, run, closeOverlay, knownAgents } from "herdr";
import { C, SERIF, unit, root, wire, mark, hair, doubleRule, machineOf } from "./kit.js";

const SHELL = { key: "shell", name: "Shell", run: null, installed: true };

export default class Assign {
  init(_p, cx) {
    this.focus = cx.focus_handle();
    this.focus.focus();
    this.field = "slug";
    this.slug = "";
    this.brief = "";
    this.space = spaces().find((s) => s.active)?.id ?? spaces()[0]?.id ?? null;
    this.reporters = null; // null while asking the machine
    this.reporter = null;
    this.error = null;
    this.ask(cx);
  }

  // Which agents the chosen desk's machine has installed.
  ask(cx) {
    const sp = spaces().find((s) => s.id === this.space);
    const on = machineOf(sp);
    this.reporters = null;
    cx.spawn(async (cx) => {
      let list = [];
      try {
        list = (await knownAgents({ on })).filter((a) => a.installed);
      } catch {}
      this.reporters = [...list, SHELL];
      if (!this.reporters.some((r) => r.key === this.reporter)) this.reporter = this.reporters[0].key;
      cx.notify();
    });
  }

  close() {
    closeOverlay(props()?.overlay);
  }

  assign() {
    if (!this.space) return (this.error = "PICK A DESK FIRST");
    const r = (this.reporters ?? []).find((x) => x.key === this.reporter) ?? SHELL;
    const args = { space: this.space };
    if (this.slug.trim()) args.name = this.slug.trim();
    if (r.run) {
      args.argv = r.run;
      if (this.brief.trim()) args.task = this.brief.trim();
    }
    run("tab.new", args);
    this.close();
  }

  key(e, cx) {
    const m = e.modifiers;
    const k = this.field;
    if (e.key === "escape") this.close();
    else if (e.key === "enter") this.assign();
    else if (e.key === "tab") this.field = k === "slug" ? "brief" : "slug";
    else if (e.key === "backspace") this[k] = m.alt || m.platform ? this[k].replace(/\S+\s*$/, "") : this[k].slice(0, -1);
    else if (m.control && e.key === "u") this[k] = "";
    else if (e.key_char && !m.control && !m.platform) this[k] = (this[k] + e.key_char).slice(0, k === "slug" ? 48 : 2000);
    else return;
    this.error = null;
    cx.stop_propagation();
    cx.notify();
  }

  label(u, text) {
    return div().flex_none().w(u(86)).pt(u(2)).child(wire(u, text, { bold: true, color: C.ink }));
  }

  input(u, name, value, placeholder, tall) {
    const on = this.field === name;
    return div()
      .id(`desk-assign-${name}`)
      .flex_1()
      .min_w(0)
      .min_h(u(tall ? 72 : 28))
      .px(u(8))
      .py(u(5))
      .bg(C.paper)
      .border_1()
      .border_color(on ? C.ink : C.rule)
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => {
        cx.stop_propagation();
        this.field = name;
        this.focus.focus();
        cx.notify();
      })
      .child(
        value
          ? div()
              .when(name === "slug", (el) => el.font_family(SERIF).font_weight(700))
              .when(name === "brief", (el) => el.italic())
              .child(value + (on ? "▏" : ""))
          : div().italic().text_color(C.dim).child(on ? "▏" : placeholder),
      );
  }

  chip(u, id, text, on, fn, sub) {
    return h_flex()
      .id(id)
      .flex_none()
      .px(u(7))
      .py(u(3))
      .gap(u(5))
      .items_center()
      .border_1()
      .border_color(on ? C.ink : C.rule)
      .when(on, (el) => el.bg(C.ink).text_color(C.paper))
      .cursor_pointer()
      .hover((s) => s.bg(on ? C.ink : C.mark))
      .on_click((_e, cx) => {
        fn(cx);
        cx.notify();
      })
      .child(div().child(text))
      .when(Boolean(sub), (el) => el.child(wire(u, sub, { size: 8, color: on ? "#cfc8b8" : C.dim })));
  }

  render(_cx) {
    const u = unit();
    const all = spaces();
    return root(
      u,
      v_flex()
        .id("desk-assign")
        .track_focus(this.focus)
        .on_key_down((e, cx) => this.key(e, cx))
        .size_full()
        .bg(C.sheet)
        .border_1()
        .border_color(C.ink)
        .px(u(18))
        .py(u(14))
        .gap(u(10)),
    )
      .child(
        h_flex()
          .items_baseline()
          .child(div().flex_none().font_weight(700).text_size(u(22)).child("Assign a Story"))
          .child(div().flex_1())
          .child(wire(u, "ENTER ASSIGNS · TAB MOVES · ESC SPIKES THE FORM", { size: 8, color: C.dim })),
      )
      .child(doubleRule(u))
      .child(h_flex().gap(u(10)).child(this.label(u, "SLUG")).child(this.input(u, "slug", this.slug, "What the tab is called, e.g. fix-login")))
      .child(
        h_flex()
          .gap(u(10))
          .child(this.label(u, "DESK"))
          .child(
            div()
              .flex_1()
              .flex()
              .flex_wrap()
              .gap(u(5))
              .children(
                all.map((s) =>
                  this.chip(u, `desk-assign-space-${s.id}`, s.name, s.id === this.space, (cx) => {
                    this.space = s.id;
                    this.ask(cx);
                  }, machineOf(s) ? machineOf(s).toUpperCase() : "HERE"),
                ),
              ),
          ),
      )
      .child(
        h_flex()
          .gap(u(10))
          .child(this.label(u, "REPORTER"))
          .child(
            div()
              .flex_1()
              .flex()
              .flex_wrap()
              .gap(u(5))
              .when(this.reporters === null, (el) => el.child(wire(u, "ASKING THE DESK'S MACHINE WHO'S IN…", { color: C.dim })))
              .when(this.reporters !== null, (el) =>
                el.children(
                  this.reporters.map((r) =>
                    this.chip(u, `desk-assign-rep-${r.key}`, r.name, r.key === this.reporter, () => {
                      this.reporter = r.key;
                    }),
                  ),
                ),
              ),
          ),
      )
      .child(h_flex().gap(u(10)).child(this.label(u, "BRIEF")).child(this.input(u, "brief", this.brief, "The first instruction the reporter gets", true)))
      .child(div().flex_1())
      .child(hair(u))
      .child(
        h_flex()
          .gap(u(8))
          .items_center()
          .when(Boolean(this.error), (el) => el.child(wire(u, this.error, { bold: true, color: C.red })))
          .child(div().flex_1())
          .child(mark(u, "desk-assign-cancel", "CANCEL", () => this.close(), { boxed: true }))
          .child(mark(u, "desk-assign-go", "ASSIGN", (_e, cx) => {
            this.assign();
            cx.notify();
          }, { solid: true })),
      );
  }
}
