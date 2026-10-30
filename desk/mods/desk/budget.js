// The budget: every agent as a story on tonight's budget, held stories first.
// Click a story to mark it for the editor's note (it stays where it is; the
// copy doesn't change). OPEN, or a double-click, brings its galleys into the
// copy. SPIKE settles its tab onto the spiked shelf, which folds below the
// budget; RESTORE brings it back. A story that files gets a -30- and one
// ink-stamp wash that fades.
//
// The editor's note sits under the budget: write to the marked story's
// reporter and Enter sends it (hc send), OK TO RUN presses Enter in its
// terminal (answers a waiting prompt), HOLD interrupts it. None of them move
// you off the copy you're reading.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, focused, run, hc, setAgentOrder } from "herdr";
import { C, SERIF, WIRE, unit, root, wire, mark, hair, doubleRule, stories, status, age, slugify, clockTime } from "./kit.js";
import { openAssign } from "./masthead.js";

export default class Budget {
  init(_p, cx) {
    this.picked = null; // address the editor marked
    this.hover = null;
    this.prev = null;
    this.stamped = new Map(); // address -> stamp phase: "in" then "set"
    this.shelfOpen = false;
    this.note = "";
    this.focus = cx.focus_handle();
    this.result = null; // { ok, text, at }
    this.busy = false;
    cx.timer.every(60000, (cx) => cx.notify()); // ages on the budget
  }

  // Stories that just filed get a -30- and a one-time ink-stamp wash.
  watch(list, cx) {
    const cur = new Map(list.map((a) => [a.address, a.status]));
    if (this.prev) {
      const filed = list.filter((a) => a.status === "done" && this.prev.has(a.address) && this.prev.get(a.address) !== "done");
      if (filed.length) {
        filed.forEach((a) => this.stamped.set(a.address, "in"));
        cx.timer.after(60, (cx) => {
          filed.forEach((a) => this.stamped.set(a.address, "set"));
          cx.notify();
          cx.timer.after(2000, (cx) => {
            filed.forEach((a) => this.stamped.delete(a.address));
            cx.notify();
          });
        });
      }
    }
    this.prev = cur;
  }

  target(list) {
    const f = focused();
    return list.find((a) => a.address === this.picked) ?? list.find((a) => a.address === f?.terminal) ?? list[0] ?? null;
  }

  say(ok, text, cx) {
    this.result = { ok, text, at: Date.now() };
    cx.notify();
  }

  act(cx, story, args, okText) {
    if (!story || this.busy) return;
    this.busy = true;
    cx.notify();
    cx.spawn(async (cx) => {
      let r;
      try {
        r = await hc(args);
      } catch (e) {
        r = { code: 1, stderr: String(e) };
      }
      this.busy = false;
      if (r.code === 0) this.say(true, `${okText} · ${clockTime(new Date())}`, cx);
      else this.say(false, `DID NOT REACH ${story.slug}: ${(r.stderr || r.stdout || "no answer").trim().split("\n")[0].slice(0, 90)}`, cx);
    });
  }

  send(cx, story) {
    const text = this.note.trim();
    if (!story || !text) return;
    const args = ["send", story.target, text];
    if (story.status === "blocked") args.splice(1, 0, "--force");
    this.note = "";
    this.act(cx, story, args, `NOTE SENT TO ${story.slug}`);
  }

  key(e, cx, story) {
    const m = e.modifiers;
    if (e.key === "enter") this.send(cx, story);
    else if (e.key === "escape") {
      this.note = "";
      const p = focused()?.pane;
      if (p) run("pane.focus", { pane: p });
    } else if (e.key === "backspace") this.note = m.alt || m.platform ? this.note.replace(/\S+\s*$/, "") : this.note.slice(0, -1);
    else if (m.control && e.key === "u") this.note = "";
    else if (e.key_char && !m.control && !m.platform) this.note += e.key_char;
    else return;
    cx.stop_propagation();
    cx.notify();
  }

  story(u, a, sel, inCopy) {
    const st = status(a.status);
    const stamp = this.stamped.get(a.address);
    const hovered = this.hover === a.address;
    return v_flex()
      .id(`desk-story-${a.address}`)
      .relative()
      .flex_none()
      .px(u(12))
      .py(u(7))
      .gap(u(2))
      .when(sel, (el) => el.bg(C.mark))
      .hover((s) => s.bg(sel ? C.mark : "#1c1b180a"))
      .cursor_pointer()
      .on_hover((h, cx) => {
        this.hover = h ? a.address : this.hover === a.address ? null : this.hover;
        cx.notify();
      })
      .on_click((e, cx) => {
        if (e.click_count >= 2) run("agent.focus", { terminal: a.address });
        else {
          this.picked = a.address;
          cx.notify();
        }
      })
      .when(Boolean(stamp), (el) =>
        el.child(
          div()
            .absolute()
            .inset(0)
            .bg(C.redWash)
            .opacity(stamp === "in" ? 1 : 0)
            .transition("opacity", stamp === "in" ? 60 : { duration: 1900, easing: "ease-out" }),
        ),
      )
      .child(
        h_flex()
          .gap(u(8))
          .items_baseline()
          .child(
            div()
              .flex_1()
              .min_w(0)
              .truncate()
              .font_weight(a.status === "blocked" ? 700 : 400)
              .text_size(u(14))
              .text_color(a.status === "idle" ? C.muted : C.ink)
              .child(a.headline),
          )
          .when(a.status === "done", (el) =>
            el.child(
              div()
                .flex_none()
                .font_family(SERIF)
                .font_weight(700)
                .text_color(C.filed)
                .opacity(stamp === "in" ? 0 : 1)
                .transition("opacity", { duration: 700, easing: "ease-out" })
                .child("-30-"),
            ),
          )
          .child(
            div()
              .flex_none()
              .px(u(a.status === "blocked" ? 4 : 0))
              .when(a.status === "blocked", (el) => el.border_1().border_color(C.red))
              .child(wire(u, st.word, { color: st.color, bold: true, size: 8.5 })),
          ),
      )
      .child(
        h_flex()
          .gap(u(6))
          .items_center()
          .child(wire(u, `SLUG ${a.slug}`, { size: 8.5, color: C.dim }))
          .child(wire(u, `· ${(a.space?.name ?? "?").toUpperCase()}${a.machine ? ` · ${a.machine.toUpperCase()}` : " · HERE"}`, { size: 8.5, color: C.dim }))
          .when(inCopy, (el) => el.child(wire(u, "IN COPY", { size: 8, color: C.ink, bold: true })))
          .child(div().flex_1())
          .when(hovered && !inCopy, (el) =>
            el.child(mark(u, `desk-open-${a.address}`, "OPEN", () => run("agent.focus", { terminal: a.address }), { size: 8.5, px: 4, tip: "Bring its galleys into the copy" })),
          )
          .when(hovered && Boolean(a.tabInfo), (el) =>
            el.child(mark(u, `desk-spike-${a.address}`, "SPIKE", () => run("tab.settle", { id: a.tab }), { size: 8.5, px: 4, color: C.red, tip: "Spike: settle this tab onto the shelf" })),
          )
          .when(!hovered, (el) => el.child(wire(u, age(a.since), { size: 8.5, color: a.status === "working" ? C.ink : C.dim }))),
      );
  }

  shelf(u) {
    const spiked = [];
    for (const s of spaces()) for (const t of s.tabs) if (t.settled) spiked.push({ s, t });
    return v_flex()
      .flex_none()
      .child(hair(u))
      .child(
        h_flex()
          .id("desk-shelf-head")
          .flex_none()
          .h(u(24))
          .px(u(12))
          .gap(u(8))
          .items_center()
          .cursor_pointer()
          .hover((s) => s.bg("#1c1b180a"))
          .on_click((_e, cx) => {
            this.shelfOpen = !this.shelfOpen;
            cx.notify();
          })
          .child(wire(u, `SPIKED · ${spiked.length}`, { bold: true, color: spiked.length ? C.ink : C.dim }))
          .child(div().flex_1())
          .child(wire(u, spiked.length ? (this.shelfOpen ? "FOLD" : "UNFOLD") : "NOTHING SPIKED", { size: 8.5, color: C.dim })),
      )
      .when(this.shelfOpen && spiked.length > 0, (el) =>
        el.child(
          v_flex()
            .id("desk-shelf-list")
            .max_h(u(140))
            .overflow_y_scroll()
            .children(
              spiked.map(({ s, t }) =>
                h_flex()
                  .flex_none()
                  .h(u(24))
                  .px(u(12))
                  .gap(u(8))
                  .items_center()
                  .child(div().flex_1().min_w(0).truncate().text_color(C.muted).italic().child(`${t.named ? t.name : `Tab ${t.index}`}`))
                  .child(wire(u, `${s.name.toUpperCase()}${s.machine ? ` · ${s.machine.toUpperCase()}` : ""}`, { size: 8.5, color: C.dim }))
                  .child(mark(u, `desk-restore-${t.id}`, "RESTORE", () => run("tab.unsettle", { id: t.id }), { size: 8.5, px: 4 })),
              ),
            ),
        ),
      );
  }

  editor(u, story) {
    const on = this.focus.is_focused();
    const st = story ? status(story.status) : null;
    const blocked = story?.status === "blocked";
    const caret = div().flex_none().w(u(1)).h(u(15)).bg(C.red);
    return v_flex()
      .flex_none()
      .bg(C.sheet)
      .child(doubleRule(u))
      .child(
        v_flex()
          .px(u(12))
          .pt(u(8))
          .pb(u(10))
          .gap(u(7))
          .child(
            h_flex()
              .gap(u(8))
              .items_baseline()
              .child(div().flex_none().font_weight(700).text_size(u(15)).child("Editor's Note"))
              .child(div().flex_1())
              .child(wire(u, story ? `TO ${story.slug}` : "NO STORY MARKED", { bold: true, color: story ? C.ink : C.dim })),
          )
          .child(
            story
              ? wire(u, `${(story.space?.name ?? "").toUpperCase()} · ${story.machine ? story.machine.toUpperCase() : "HERE"} · ${st.word}${story.since ? ` · ${age(story.since)}` : ""}`, { size: 8.5, color: blocked ? C.red : C.dim })
              : wire(u, "CLICK A STORY ON THE BUDGET TO MARK IT", { size: 8.5, color: C.dim }),
          )
          .child(
            h_flex()
              .id("desk-note")
              .track_focus(this.focus)
              .on_key_down((e, cx) => this.key(e, cx, story))
              .h(u(30))
              .px(u(8))
              .items_center()
              .bg(C.paper)
              .border_1()
              .border_color(on ? C.ink : C.rule)
              .cursor_pointer()
              .on_mouse_down("left", (_e, cx) => {
                cx.stop_propagation();
                this.focus.focus();
                cx.notify();
              })
              .when(Boolean(this.note), (el) => el.child(div().flex_none().max_w_full().truncate().italic().child(this.note)))
              .when(on, (el) => el.child(caret))
              .when(!this.note && !on, (el) =>
                el.child(div().italic().text_color(C.dim).child(blocked ? "Answer the reporter, then Enter…" : "A note to the reporter. Enter sends…")),
              ),
          )
          .child(
            h_flex()
              .gap(u(6))
              .items_center()
              .child(
                mark(u, "desk-ok", "OK TO RUN", (_e, cx) => this.act(cx, story, ["keys", story.target, "enter"], `OK TO RUN · ${story.slug}`), {
                  boxed: true,
                  disabled: !story || this.busy,
                  tip: "Press Enter in its terminal: accepts the choice it is waiting on",
                }),
              )
              .child(
                mark(u, "desk-hold", "HOLD", (_e, cx) => this.act(cx, story, ["interrupt", story.target], `HELD · ${story.slug}`), {
                  boxed: true,
                  color: C.red,
                  disabled: !story || this.busy,
                  tip: "Interrupt its current turn",
                }),
              )
              .child(div().flex_1())
              .child(
                mark(u, "desk-send", this.busy ? "SENDING…" : "SEND NOTE", (_e, cx) => this.send(cx, story), {
                  solid: true,
                  disabled: !story || !this.note.trim() || this.busy,
                  tip: "Send the note (Enter)",
                }),
              ),
          )
          .when(Boolean(this.result), (el) =>
            el.child(wire(u, this.result.text, { size: 8.5, bold: !this.result.ok, color: this.result.ok ? C.filed : C.red })),
          ),
      );
  }

  render(cx) {
    const u = unit();
    const all = stories();
    this.watch(all, cx);
    const list = all.filter((a) => !a.spiked || a.status === "blocked");
    setAgentOrder(list.map((a) => a.address));
    const f = focused();
    const story = this.target(list);
    const n = list.length;

    return root(u, v_flex().id("desk-budget").size_full().bg(C.paper))
      .child(
        h_flex()
          .flex_none()
          .h(u(32))
          .px(u(12))
          .gap(u(8))
          .items_center()
          .child(div().flex_none().font_weight(700).text_size(u(17)).child("Budget"))
          .child(div().flex_1())
          .child(wire(u, `${n} ${n === 1 ? "STORY" : "STORIES"} · ALL DESKS`, { color: C.dim }))
          .child(mark(u, "desk-assign-2", "+ ASSIGN", () => openAssign(), { size: 8.5, px: 4, tip: "Assign a new story" })),
      )
      .child(hair(u, { color: C.ruleHard }))
      .child(
        v_flex()
          .id("desk-stories")
          .flex_1()
          .min_h(0)
          .overflow_y_scroll()
          .children(
            n
              ? list.flatMap((a, i) => [
                  ...(i ? [div().flex_none().mx(u(12)).child(hair(u))] : []),
                  this.story(u, a, story?.address === a.address, f?.terminal === a.address),
                ])
              : [div().p(u(14)).italic().text_color(C.dim).child("No stories on the budget. ASSIGN one to start an agent.")],
          ),
      )
      .child(this.shelf(u))
      .child(this.editor(u, story));
  }
}
