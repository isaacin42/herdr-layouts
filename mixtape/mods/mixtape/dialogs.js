// The two cards you write on: REC (record a new track on one side's machine:
// which space, which agent, the track's name and its first task) and a
// LINER NOTE (a one-line follow-up sent to a playing agent with `hc send`).
// Both are blank inlay cards; Tab moves between written fields, Enter
// records or sends, Esc puts the card down.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props, closeOverlay, run, spaces, knownAgents, hc } from "herdr";
import { C, unit, hand, printed, penButton } from "./kit.js";

function field(u, label, value, on, hint) {
  return v_flex()
    .flex_none()
    .gap(u(2))
    .child(printed(u, label, on ? C.stripe : C.pencil, 8))
    .child(
      h_flex()
        .flex_none()
        .h(u(30))
        .items_end()
        .pb(u(3))
        .border_b(u(on ? 2 : 1))
        .border_color(on ? C.ink : C.rule)
        .child(div().flex_none().text_color(value ? C.ink : C.pencil).whitespace_nowrap().child(value || hint))
        .when(on, (el) => el.child(div().flex_none().ml(u(1)).w(u(2)).h(u(18)).bg(C.ink))),
    );
}

function chip(u, id, text, on, fn) {
  return div()
    .id(id)
    .flex_none()
    .px(u(10))
    .h(u(26))
    .flex()
    .items_center()
    .rounded(u(13))
    .border_1()
    .border_color(on ? C.ink : C.rule)
    .when(on, (el) => el.bg(C.ink).text_color(C.card))
    .when(!on, (el) => el.text_color(C.ink))
    .cursor_pointer()
    .on_click((_e, cx) => {
      fn();
      cx.notify();
    })
    .child(text);
}

function typing(e, text) {
  const m = e.modifiers;
  if (e.key === "backspace") return m.alt || m.platform ? text.replace(/\S+\s*$/, "") : text.slice(0, -1);
  if (m.control && e.key === "u") return "";
  if (e.key_char && !m.control && !m.platform) return text + e.key_char;
  return null;
}

function card(u, el, title, sub) {
  return hand(u, el.size_full().bg(C.card).border_1().border_color(C.shellLine).rounded(u(4)))
    .child(
      h_flex()
        .flex_none()
        .h(u(10))
        .bg(C.stripe),
    )
    .child(
      h_flex()
        .flex_none()
        .px(u(22))
        .pt(u(14))
        .gap(u(10))
        .items_end()
        .child(div().text_size(u(26)).child(title))
        .child(div().pb(u(4)).child(printed(u, sub, C.pencil, 8))),
    );
}

export class Rec {
  init(p, cx) {
    this.machine = p.machine ?? null;
    this.focus = cx.focus_handle();
    this.focus.focus();
    const mine = spaces().filter((s) => (s.machine ?? null) === this.machine);
    this.space = (mine.find((s) => s.active) ?? mine[0])?.id ?? "new";
    this.agents = [
      { key: "claude", name: "claude", run: ["claude"] },
      { key: "codex", name: "codex", run: ["codex"] },
      { key: "shell", name: "shell", run: null },
    ];
    this.agent = "claude";
    this.name = "";
    this.spaceName = "";
    this.task = "";
    this.at = "name";
    this.err = "";
    // The agents that machine actually has, most picked first.
    cx.spawn(async (cx) => {
      try {
        const list = (await knownAgents({ on: this.machine })).filter((a) => a.installed).slice(0, 5);
        if (list.length) {
          this.agents = [...list.map((a) => ({ key: a.key, name: a.name.toLowerCase(), run: a.run })), { key: "shell", name: "shell", run: null }];
          if (!this.agents.some((a) => a.key === this.agent)) this.agent = this.agents[0].key;
        }
      } catch {}
      cx.notify();
    });
  }

  fields() {
    const f = ["name"];
    if (this.space === "new") f.push("spaceName");
    if (this.agent !== "shell") f.push("task");
    return f;
  }

  record() {
    const a = this.agents.find((x) => x.key === this.agent);
    const argv = a?.run ?? undefined;
    const name = this.name.trim();
    const task = this.agent !== "shell" ? this.task.trim() : "";
    const extra = { ...(argv ? { argv } : {}), ...(task ? { task } : {}) };
    if (this.space === "new") {
      run("space.new", {
        ...(this.spaceName.trim() ? { name: this.spaceName.trim() } : {}),
        ...(name ? { tab: name } : {}),
        ...(this.machine ? { machine: this.machine } : {}),
        ...extra,
      });
    } else {
      run("tab.new", { space: this.space, ...(name ? { name } : {}), ...extra });
    }
    closeOverlay(props()?.overlay);
  }

  key(e, cx) {
    if (e.key === "escape") closeOverlay(props()?.overlay);
    else if (e.key === "enter") this.record();
    else if (e.key === "tab") {
      const f = this.fields();
      this.at = f[(f.indexOf(this.at) + (e.modifiers.shift ? f.length - 1 : 1)) % f.length];
    } else {
      const next = typing(e, this[this.at]);
      if (next === null) return;
      this[this.at] = next;
    }
    cx.stop_propagation();
    cx.notify();
  }

  render(_cx) {
    const u = unit();
    const mine = spaces().filter((s) => (s.machine ?? null) === this.machine);
    if (!this.fields().includes(this.at)) this.at = "name";
    const where = this.machine ?? "this mac";
    return card(u, v_flex().id("mx-rec").track_focus(this.focus).on_key_down((e, cx) => this.key(e, cx)), "record a track", `on ${where}`)
      .child(
        v_flex()
          .flex_1()
          .min_h(0)
          .px(u(22))
          .pt(u(10))
          .gap(u(12))
          .child(
            v_flex()
              .gap(u(4))
              .child(printed(u, "space", C.pencil, 8))
              .child(
                h_flex()
                  .flex_wrap()
                  .gap(u(6))
                  .children([
                    ...mine.map((s) => chip(u, `mx-rec-sp-${s.id}`, s.name, this.space === s.id, () => (this.space = s.id))),
                    chip(u, "mx-rec-sp-new", "+ new space", this.space === "new", () => {
                      this.space = "new";
                      this.at = "spaceName";
                    }),
                  ]),
              ),
          )
          .child(
            v_flex()
              .gap(u(4))
              .child(printed(u, "artist", C.pencil, 8))
              .child(h_flex().flex_wrap().gap(u(6)).children(this.agents.map((a) => chip(u, `mx-rec-ag-${a.key}`, a.name, this.agent === a.key, () => (this.agent = a.key))))),
          )
          .child(
            h_flex()
              .gap(u(16))
              .child(div().flex_1().on_mouse_down("left", (_e, cx) => ((this.at = "name"), cx.notify())).child(field(u, "track name", this.name, this.at === "name", "optional")))
              .when(this.space === "new", (el) =>
                el.child(
                  div().flex_1().on_mouse_down("left", (_e, cx) => ((this.at = "spaceName"), cx.notify())).child(field(u, "new space name", this.spaceName, this.at === "spaceName", "optional")),
                ),
              ),
          )
          .when(this.agent !== "shell", (el) =>
            el.child(div().on_mouse_down("left", (_e, cx) => ((this.at = "task"), cx.notify())).child(field(u, "first task", this.task, this.at === "task", "what should it do first? (optional)"))),
          ),
      )
      .child(
        h_flex()
          .flex_none()
          .h(u(52))
          .px(u(22))
          .gap(u(10))
          .items_center()
          .border_t(u(1))
          .border_color(C.rule)
          .child(div().flex_1().text_size(u(14)).text_color(C.pencil).child("tab: next field · enter: record · esc: cancel"))
          .child(penButton(u, "mx-rec-cancel", "cancel", () => closeOverlay(props()?.overlay)))
          .child(
            h_flex()
              .id("mx-rec-go")
              .flex_none()
              .h(u(30))
              .px(u(14))
              .gap(u(6))
              .items_center()
              .rounded(u(15))
              .bg(C.stripe)
              .text_color(C.stripeInk)
              .cursor_pointer()
              .on_click((_e, _cx) => this.record())
              .child(div().w(u(9)).h(u(9)).rounded(u(5)).bg(C.stripeInk))
              .child(printed(u, "rec", C.stripeInk, 11)),
          ),
      );
  }
}

export class Note {
  init(p, cx) {
    this.address = p.address;
    this.title = p.title ?? p.address;
    this.focus = cx.focus_handle();
    this.focus.focus();
    this.text = "";
    this.err = "";
    this.sending = false;
  }

  send(cx) {
    const text = this.text.trim();
    if (!text || this.sending) return;
    this.sending = true;
    this.err = "";
    cx.spawn(async (cx) => {
      try {
        const r = await hc(["send", this.address, text]);
        if (r.code === 0) {
          closeOverlay(props()?.overlay);
          return;
        }
        this.err = (r.stderr || r.stdout || `hc send failed (${r.code})`).trim().split("\n")[0];
      } catch (e) {
        this.err = `couldn't reach hc: ${e}`;
      }
      this.sending = false;
      cx.notify();
    });
  }

  key(e, cx) {
    if (e.key === "escape") closeOverlay(props()?.overlay);
    else if (e.key === "enter") this.send(cx);
    else {
      const next = typing(e, this.text);
      if (next === null) return;
      this.text = next;
    }
    cx.stop_propagation();
    cx.notify();
  }

  render(cx) {
    const u = unit();
    return card(u, v_flex().id("mx-note").track_focus(this.focus).on_key_down((e, cx) => this.key(e, cx)), "liner note", `to ${this.title} · ${this.address}`)
      .child(v_flex().flex_1().px(u(22)).pt(u(10)).gap(u(6)).child(field(u, "note", this.text, true, "a one-line follow-up for this agent")).when(Boolean(this.err), (el) => el.child(div().text_size(u(15)).text_color(C.stripe).child(this.err))))
      .child(
        h_flex()
          .flex_none()
          .h(u(48))
          .px(u(22))
          .gap(u(10))
          .items_center()
          .child(div().flex_1().text_size(u(14)).text_color(C.pencil).child(this.sending ? "sending…" : "enter: send · esc: cancel"))
          .child(penButton(u, "mx-note-cancel", "cancel", () => closeOverlay(props()?.overlay)))
          .child(penButton(u, "mx-note-send", "send", (cx) => this.send(cx), { tip: "Type it into the agent and press enter" })),
      );
  }
}
