// The expo station: where the chef calls the line without leaving the pass.
// It works on the SELECTED ticket (picked on the rail), not the focused pane:
//   - the station's last lines, read with `hc read` when the ticket is picked,
//     when its status changes and after every call (never polled fast);
//   - YES CHEF answers a waiting prompt (hc keys enter), 1 / 2 / 3 pick a
//     numbered choice, HOLD stops the turn (hc interrupt), FIRE sends a
//     typed follow-up (hc send; forced past a waiting prompt on a CALL);
//   - GO TO STATION focuses it.
// Addresses are machine-qualified (dev-vm/t12), so every call reaches the
// agent on its own machine. Key commands ("pass.<command>" in keys.json):
// yes, hold, fire (the order line), next, prev, go, new.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { hc, run, focused, nextCommand } from "herdr";
import { C, TICKET, unit, root, tickets, current, select, changed, call, code, number, clean, ago, tape, plate, flash, lastFlash, bell } from "./kit.js";
import { openOrder } from "./order.js";

const ANSI = /\x1b\[[0-9;?]*[ -\/]*[@-~]/g;
const LINES = 9;

function firstLine(s) {
  return String(s ?? "").trim().split("\n")[0].slice(0, 120);
}

export default class Expo {
  init(_p, cx) {
    this.focus = cx.focus_handle();
    this.text = "";
    this.lines = [];
    this.readFor = null;
    this.readStatus = null;
    this.readAt = null;
    this.reading = false;
    this.busy = null;
    cx.spawn(async (cx) => {
      for (;;) {
        await changed();
        cx.notify();
      }
    });
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        this.command(c, cx);
        cx.notify();
      }
    });
  }

  command(c, cx) {
    const list = tickets();
    const t = current(list);
    const i = list.findIndex((x) => x.address === t?.address);
    if (c === "next" && list.length) select(list[(i + 1) % list.length].address);
    else if (c === "prev" && list.length) select(list[(i - 1 + list.length) % list.length].address);
    else if (c === "fire") this.focus.focus();
    else if (c === "new") openOrder();
    else if (c === "go" && t) run("agent.focus", { terminal: t.address });
    else if (c === "yes" && t) this.call(cx, t, "YES CHEF", ["keys", t.address, "enter"]);
    else if (c === "hold" && t) this.call(cx, t, "HOLD", ["interrupt", "--timeout", "3", t.address]);
  }

  read(cx, t) {
    if (this.reading) return;
    this.reading = true;
    const addr = t.address;
    cx.spawn(async (cx) => {
      try {
        const r = await hc(["read", addr]);
        if (r.code === 0) {
          const all = r.stdout.replace(ANSI, "").split("\n").map((l) => l.replace(/\s+$/, ""));
          this.lines = all.filter((l) => l.trim()).slice(-LINES);
        } else this.lines = [`COULD NOT READ ${addr}: ${firstLine(r.stderr)}`];
      } catch (e) {
        this.lines = [`COULD NOT READ ${addr}: ${String(e)}`];
      }
      this.readFor = addr;
      this.readAt = new Date();
      this.reading = false;
      cx.notify();
    });
  }

  call(cx, t, label, args) {
    if (this.busy) return;
    this.busy = label;
    flash(`${label} → #${number(t.address)} …`);
    cx.spawn(async (cx) => {
      try {
        const r = await hc(args);
        if (r.code === 0) flash(`${label} → #${number(t.address)} ${code(t.space_name)}.${t.tab_index}: HEARD`, true);
        else flash(`${label} FAILED: ${firstLine(r.stderr || r.stdout)}`, false);
      } catch (e) {
        flash(`${label} FAILED: ${String(e)}`, false);
      }
      this.busy = null;
      cx.notify();
      cx.timer.after(1200, (cx) => {
        this.readStatus = null; // force a fresh read
        cx.notify();
      });
    });
  }

  fire(cx, t) {
    const text = this.text.trim();
    if (!text || !t) return;
    this.text = "";
    const args = ["send", ...(t.status === "blocked" ? ["--force"] : []), t.address, text];
    this.call(cx, t, "FIRE", args);
  }

  key(e, cx, t) {
    const m = e.modifiers;
    if (e.key === "escape") {
      this.text = "";
      const p = focused()?.pane;
      if (p) run("pane.focus", { pane: p });
    } else if (e.key === "enter") this.fire(cx, t);
    else if (e.key === "backspace") this.text = m.alt || m.platform ? this.text.replace(/\S+\s*$/, "") : this.text.slice(0, -1);
    else if (m.control && e.key === "u") this.text = "";
    else if (e.key_char && !m.control && !m.platform) this.text += e.key_char;
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  render(cx) {
    const u = unit();
    const list = tickets();
    const t = current(list);
    if (t && (t.address !== this.readFor || t.status !== this.readStatus)) {
      this.readStatus = t.status;
      if (t.address !== this.readFor) this.lines = [];
      this.read(cx, t);
    }
    return this.view(u, t);
  }

  /** The station for ticket `t` (null: the rail is empty). */
  view(u, t) {
    const on = this.focus.is_focused();
    const f = lastFlash();
    const blocked = t?.status === "blocked";
    const live = t && (t.status === "working" || blocked);

    const panel = root(u, v_flex().id("pass-expo").size_full().bg(C.steel).px(u(14)).py(u(12)).gap(u(10)));
    const head = h_flex()
      .flex_none()
      .gap(u(8))
      .items_center()
      .child(tape(u, "EXPO", C.tapeBlue))
      .child(div().flex_1().text_color(C.muted).child(t ? `#${number(t.address)}  ${code(t.space_name)}.${t.tab_index}  ·  ${t.info?.space.machine ? t.info.space.machine.toUpperCase() : "LOCAL"}` : "NO TICKET"));
    if (!t)
      return panel
        .child(head)
        .child(div().text_color(C.muted).child("The rail is empty. NEW TICKET fires an agent with its first order."))
        .child(plate(u, "pass-expo-new", "NEW TICKET", () => openOrder(), { fill: C.lamp, ink: C.lampInk }));

    const c = call(t.status);
    const order = (t.tab_name || "").toUpperCase();
    const title = clean(t.title);

    const strip = v_flex()
      .flex_1()
      .min_h(u(120))
      .bg(C.paper)
      .px(u(10))
      .py(u(8))
      .font_family(TICKET)
      .text_size(u(16))
      .line_height(`${u(15)}px`)
      .text_color(C.ink)
      .overflow_hidden()
      .child(
        h_flex()
          .flex_none()
          .justify_between()
          .gap(u(8))
          .text_color(C.inkSoft)
          .child(div().flex_1().min_w(0).truncate().child(`FROM THE STATION${this.readAt ? `  ·  ${String(this.readAt.getHours()).padStart(2, "0")}:${String(this.readAt.getMinutes()).padStart(2, "0")}` : ""}`))
          .child(
            div()
              .id("pass-reread")
              .flex_none()
              .cursor_pointer()
              .text_color(C.ink)
              .hover((s) => s.text_color(C.call))
              .on_click((_e, cx) => {
                this.readStatus = null;
                cx.notify();
              })
              .child(this.reading ? "READING…" : "READ AGAIN"),
          ),
      )
      .child(div().flex_none().text_color("#a79f8d").whitespace_nowrap().overflow_hidden().child("- - - - - - - - - - - - - - - - - - - - - - - -"))
      .children((this.lines.length ? this.lines : [this.reading ? "READING THE STATION…" : "NOTHING ON SCREEN YET"]).map((l) => div().flex_none().whitespace_nowrap().overflow_hidden().child(l)));

    const gate = (ok, el) => (ok ? el : el.opacity(0.35));
    const yes = gate(
      blocked,
      plate(u, "pass-yes", "YES CHEF", (_e, cx) => blocked && this.call(cx, t, "YES CHEF", ["keys", t.address, "enter"]), {
        fill: C.lamp,
        ink: C.lampInk,
        h: 40,
        size: 15,
        tip: blocked ? "Answer the waiting prompt: Enter" : "Only for a CALL: the agent is waiting on you",
      }),
    ).flex_1();
    const pick = (n) =>
      gate(
        blocked,
        plate(u, `pass-pick-${n}`, String(n), (_e, cx) => blocked && this.call(cx, t, `PICK ${n}`, ["keys", t.address, String(n)]), {
          h: 40,
          px: 14,
          size: 15,
          tip: `Choose option ${n} on the waiting prompt`,
        }),
      );
    const hold = gate(
      live,
      plate(u, "pass-hold", "HOLD", (_e, cx) => live && this.call(cx, t, "HOLD", ["interrupt", "--timeout", "3", t.address]), {
        fill: C.call,
        ink: C.callInk,
        h: 40,
        size: 15,
        tip: "Stop this turn (hc interrupt)",
      }),
    );

    const field = h_flex()
      .id("pass-fire-field")
      .flex_1()
      .min_w(0)
      .h(u(34))
      .px(u(10))
      .items_center()
      .bg(on ? "#2b2116" : C.steelLo)
      .border_1()
      .border_color(on ? C.lamp : C.brushed)
      .rounded(u(3))
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => {
        cx.stop_propagation();
        this.focus.focus();
        cx.notify();
      })
      .child(div().flex_none().whitespace_nowrap().text_color(this.text ? C.text : C.dim).child(this.text || (on ? "" : "Order a follow-up for this station…")))
      .when(on, (el) => el.child(div().flex_none().w(u(2)).h(u(16)).bg(C.lamp)));

    return panel
      .track_focus(this.focus)
      .on_key_down((e, cx) => this.key(e, cx, t))
      .child(head)
      .child(
        v_flex()
          .flex_none()
          .gap(u(4))
          .child(div().font_family(TICKET).text_size(u(26)).line_height(`${u(24)}px`).text_color(C.text).child(order || "NO ORDER"))
          .child(div().truncate().text_color(C.muted).child(title || t.program?.name || ""))
          .child(
            h_flex()
              .gap(u(8))
              .items_center()
              .child(
                t.status === "done"
                  ? h_flex().gap(u(4)).items_center().px(u(6)).bg(c.bg).text_color(c.fg).child(bell(u, 14)).child(c.word)
                  : c.bg
                    ? div().px(u(6)).bg(c.bg).text_color(c.fg).child(c.word)
                    : div().text_color(t.status === "working" ? C.line : C.muted).child(c.word),
              )
              .child(div().flex_1().min_w(0).truncate().text_color(C.dim).child(`${ago(t.since)} ON THE RAIL  ·  ${(t.program?.name ?? "").toUpperCase()}`)),
          ),
      )
      .child(strip)
      .child(h_flex().flex_none().gap(u(6)).child(yes).child(pick(1)).child(pick(2)).child(pick(3)))
      .child(h_flex().flex_none().gap(u(6)).child(field).child(plate(u, "pass-fire", "FIRE", (_e, cx) => this.fire(cx, t), { fill: C.lampDeep, ink: C.lampInk, h: 34, tip: "Send the follow-up (Enter)" })))
      .child(h_flex().flex_none().gap(u(6)).child(hold).child(div().flex_1()).child(plate(u, "pass-go", "GO TO STATION", () => run("agent.focus", { terminal: t.address }), { h: 40, tip: "Focus this agent's terminal" })))
      .child(div().flex_none().h(u(18)).truncate().text_color(f ? (f.ok ? C.line : C.call) : C.dim).child(f ? f.msg : "Calls go to the selected ticket, on its own machine."));
  }
}
