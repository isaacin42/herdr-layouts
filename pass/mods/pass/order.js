// NEW TICKET: a blank thermal ticket you fill in to start work. Pick the
// station (a space; its machine shows beside it), the cook (Claude Code,
// Codex or a plain shell) and write the order, which becomes the agent's
// first message and names the tab. Up/Down move the station, Tab changes the
// cook, Enter fires, Esc closes.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, run, props, openOverlay, closeOverlay } from "herdr";
import { C, TICKET, unit, root, tape, plate, code, flash } from "./kit.js";

const COOKS = [
  { name: "CLAUDE CODE", argv: ["claude"] },
  { name: "CODEX", argv: ["codex"] },
  { name: "SHELL", argv: null },
];

export function openOrder() {
  openOverlay({ mod: "pass", kind: "dialog", frame: "none", props: { role: "order" }, width: 600, height: 480 });
}

function tabName(text) {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return null;
  if (t.length <= 28) return t;
  const cut = t.slice(0, 28);
  const sp = cut.lastIndexOf(" ");
  return (sp > 12 ? cut.slice(0, sp) : cut).trim();
}

export default class Order {
  init(_p, cx) {
    this.focus = cx.focus_handle();
    this.focus.focus();
    const all = spaces();
    this.station = Math.max(0, all.findIndex((s) => s.active));
    this.cook = 0;
    this.text = "";
    this.err = null;
  }

  close() {
    closeOverlay(props()?.overlay);
  }

  fire() {
    const s = spaces()[this.station];
    if (!s) return (this.err = "NO STATION TO SEND IT TO");
    const cook = COOKS[this.cook];
    const text = this.text.trim();
    if (cook.argv && !text) return (this.err = "WRITE THE ORDER FIRST: IT'S THE AGENT'S FIRST MESSAGE");
    const name = tabName(text);
    run("tab.new", { space: s.id, ...(name ? { name } : {}), ...(cook.argv ? { argv: cook.argv, task: text } : {}) });
    flash(`NEW TICKET → ${code(s.name)}${s.machine ? ` ON ${s.machine.toUpperCase()}` : ""}: ${cook.name}`);
    this.close();
  }

  key(e, cx) {
    const m = e.modifiers;
    const n = spaces().length;
    if (e.key === "escape") this.close();
    else if (e.key === "enter") this.fire();
    else if (e.key === "up") this.station = (this.station - 1 + n) % Math.max(n, 1);
    else if (e.key === "down") this.station = (this.station + 1) % Math.max(n, 1);
    else if (e.key === "tab") this.cook = (this.cook + (m.shift ? COOKS.length - 1 : 1)) % COOKS.length;
    else if (e.key === "backspace") this.text = m.alt || m.platform ? this.text.replace(/\S+\s*$/, "") : this.text.slice(0, -1);
    else if (m.control && e.key === "u") this.text = "";
    else if (e.key_char && !m.control && !m.platform) this.text += e.key_char;
    else return;
    if (e.key !== "enter") this.err = null;
    cx.stop_propagation();
    cx.notify();
  }

  render(_cx) {
    return this.view(unit(), spaces());
  }

  view(u, all) {
    const rows = all.map((s, i) =>
      h_flex()
        .id(`pass-order-station-${s.id}`)
        .flex_none()
        .h(u(22))
        .px(u(8))
        .gap(u(10))
        .items_center()
        .cursor_pointer()
        .when(i === this.station, (el) => el.bg(C.ink).text_color(C.paper))
        .hover((x) => x.bg(i === this.station ? C.ink : C.paperShade))
        .on_click((_e, cx) => {
          this.station = i;
          cx.notify();
        })
        .child(div().flex_none().w(u(44)).child(code(s.name)))
        .child(div().flex_1().min_w(0).truncate().child(s.name.toUpperCase()))
        .child(div().flex_none().child(s.machine ? s.machine.toUpperCase() : "LOCAL")),
    );
    const cooks = COOKS.map((c, i) =>
      div()
        .id(`pass-order-cook-${i}`)
        .flex_none()
        .px(u(10))
        .h(u(24))
        .flex()
        .items_center()
        .cursor_pointer()
        .border_1()
        .border_color(C.ink)
        .when(i === this.cook, (el) => el.bg(C.ink).text_color(C.paper))
        .on_click((_e, cx) => {
          this.cook = i;
          cx.notify();
        })
        .child(c.name),
    );
    const on = this.focus.is_focused();

    return root(
      u,
      v_flex()
        .id("pass-order")
        .track_focus(this.focus)
        .on_key_down((e, cx) => this.key(e, cx))
        .size_full()
        .bg(C.paper)
        .px(u(22))
        .py(u(18))
        .gap(u(10))
        .font_family(TICKET)
        .text_size(u(18))
        .line_height(`${u(18)}px`)
        .text_color(C.ink)
        .border_t(u(6))
        .border_color(C.lamp),
    )
      .child(
        h_flex()
          .flex_none()
          .justify_between()
          .items_center()
          .child(div().text_size(u(30)).line_height(`${u(28)}px`).child("NEW TICKET"))
          .child(tape(u, "FIRE IT TO THE LINE", C.tapeRed)),
      )
      .child(div().flex_none().text_color("#a79f8d").whitespace_nowrap().overflow_hidden().child("- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -"))
      .child(div().flex_none().text_color(C.inkSoft).child("STATION  (UP / DOWN)"))
      .child(v_flex().id("pass-order-stations").flex_none().max_h(u(22 * 6)).overflow_y_scroll().children(rows))
      .child(div().flex_none().text_color(C.inkSoft).child("COOK  (TAB)"))
      .child(h_flex().flex_none().gap(u(6)).children(cooks))
      .child(div().flex_none().text_color(C.inkSoft).child("THE ORDER  (THE AGENT'S FIRST MESSAGE)"))
      .child(
        h_flex()
          .flex_none()
          .min_h(u(30))
          .px(u(8))
          .items_center()
          .border_b(u(2))
          .border_color(on ? C.lampDeep : C.ink)
          .child(div().flex_1().min_w(0).text_color(this.text ? C.ink : "#6f6858").child(this.text || "e.g. fix the flaky login test, then open a PR"))
          .when(on, (el) => el.child(div().flex_none().w(u(2)).h(u(18)).bg(C.ink))),
      )
      .child(div().flex_1())
      .when(Boolean(this.err), (el) => el.child(div().flex_none().text_color(C.call).child(this.err)))
      .child(
        h_flex()
          .flex_none()
          .gap(u(8))
          .justify_end()
          .child(plate(u, "pass-order-cancel", "86 IT  (ESC)", () => this.close(), { fill: "#d9d0b8", ink: C.ink }))
          .child(plate(u, "pass-order-fire", "FIRE  (ENTER)", (_e, cx) => {
            this.fire();
            cx.notify();
          }, { fill: C.lamp, ink: C.lampInk })),
      );
  }
}
