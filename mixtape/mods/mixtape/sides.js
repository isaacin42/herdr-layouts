// The J-card's inner fold: one side of the tape at a time, its tracks ruled
// on the inlay's printed lines. Tabs across the top pick the side (one per
// machine: A is this Mac, B dev-vm, …); flipping slides the fold once.
// Each track: number, title, running time or a pen mark for its status.
// A track that needs you gets a highlighter swipe; a track that just finished
// gets its tick drawn once. Shelved (settled) tabs sit under BONUS TRACKS.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { focused, run, nextCommand, settings } from "herdr";
import { C, unit, hand, printed, art, programIcon, tape, trackTime, totalTime, play, openRec, openNote, penButton } from "./kit.js";

// on_size_change reports on-screen px (already times the app zoom), while sizes
// set on elements get the zoom applied again, so work in design px throughout.
function designSize(s) {
  const z = Number(settings()?.zoom) || 1;
  return { width: s.width / z, height: s.height / z };
}


const ROW = 30;

export default class Sides {
  init(_p, cx) {
    this.side = null; // index of the side shown; null = follow the active space's machine
    this.followed = undefined; // the machine last followed
    this.width = 0;
    this.prev = new Map(); // tab id -> status
    this.ticks = new Map(); // tab id -> "start" | "drawn"
    this.showBonus = new Set();
    cx.timer.every(60000, (cx) => cx.notify()); // running times are minutes
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        const sides = tape();
        if (c === "flip") this.flip(sides, true);
        else if (c === "rec") openRec(sides[this.side ?? 0]?.name ?? null);
        else if (/^side\d$/.test(c)) this.side = Math.min(sides.length - 1, Number(c.slice(4)));
        cx.notify();
      }
    });
  }

  flip(sides, playIt) {
    const next = ((this.side ?? 0) + 1) % sides.length;
    this.side = next;
    if (playIt) {
      const t = sides[next].groups.flatMap((g) => g.tracks);
      const pick = t.find((x) => x.tab.status === "blocked") ?? t.find((x) => x.tab.status === "done") ?? t.find((x) => x.tab.status === "working") ?? t[0];
      if (pick) play(pick);
    }
  }

  // Remember statuses; a track that turns done gets its tick drawn once.
  watch(sides, cx) {
    let fresh = false;
    for (const side of sides)
      for (const g of side.groups)
        for (const t of g.tracks) {
          const was = this.prev.get(t.tab.id);
          if (was && was !== "done" && t.tab.status === "done") {
            this.ticks.set(t.tab.id, "start");
            fresh = true;
          }
          this.prev.set(t.tab.id, t.tab.status);
        }
    if (fresh)
      cx.timer.after(40, (cx) => {
        for (const [id, s] of this.ticks) if (s === "start") this.ticks.set(id, "drawn");
        cx.notify();
      });
  }

  mark(u, t) {
    const st = t.tab.status;
    if (st === "working")
      return div().flex_none().text_color(C.ink).child(trackTime(t.tab.working_since));
    if (st === "blocked")
      return h_flex().flex_none().gap(u(3)).items_center().child(art("bang", u, 20)).child(div().text_color(C.ink).child("your call"));
    if (st === "done") {
      const phase = this.ticks.get(t.tab.id);
      return div()
        .flex_none()
        .h(u(16))
        .overflow_hidden()
        .w(u(phase === "start" ? 0 : 24))
        .when(phase !== undefined, (el) => el.transition("width", { duration: 520, easing: "ease-out" }))
        .child(art("tick", u, 24));
    }
    return div().flex_none().text_color(C.pencil).child(t.tab.changed_at ? "on hold" : "");
  }

  track(u, side, t, here) {
    const blocked = t.tab.status === "blocked";
    const idle = !t.tab.status || t.tab.status === "idle";
    const row = h_flex()
      .id(`mx-track-${t.tab.id}`)
      .flex_none()
      .h(u(ROW))
      .items_center()
      .border_b(u(1))
      .border_color(C.rule)
      .cursor_pointer()
      .when(blocked, (el) => el.bg(C.highlighter))
      .hover((s) => s.bg(blocked ? C.highlighter : C.cardShade))
      .on_click((_e, _cx) => play(t))
      .child(
        div()
          .flex_none()
          .w(u(34))
          .h_full()
          .flex()
          .items_center()
          .justify_end()
          .pr(u(6))
          .border_r(u(1))
          .border_color(C.margin)
          .text_color(idle ? C.pencil : C.ink)
          .child(String(t.no).padStart(2, "0")),
      )
      .child(div().flex_none().w(u(8)))
      .when(Boolean(programIcon(u, t.agent?.program)), (el) => el.child(programIcon(u, t.agent.program)).child(div().flex_none().w(u(6))))
      .child(
        div()
          .flex_1()
          .min_w(0)
          .truncate()
          .text_color(idle ? C.pencil : C.ink)
          .when(here, (el) => el.underline())
          .child(t.title.toUpperCase()),
      )
      .child(div().flex_none().pl(u(8)).pr(u(10)).child(this.mark(u, t)));
    if (!here) return row;
    // The track playing now: its pen actions, written under it.
    return v_flex()
      .flex_none()
      .child(row)
      .child(
        h_flex()
          .flex_none()
          .h(u(ROW))
          .pl(u(42))
          .gap(u(4))
          .items_center()
          .border_b(u(1))
          .border_color(C.rule)
          .text_size(u(15))
          .child(printed(u, "now playing", C.inkSoft, 8))
          .child(div().flex_1())
          .when(Boolean(t.agent), (el) =>
            el.child(penButton(u, `mx-note-${t.tab.id}`, "liner note", () => openNote(t), { tip: "Send this agent a one-line follow-up" })),
          )
          .child(penButton(u, `mx-shelve-${t.tab.id}`, "shelve", () => run("tab.settle", { id: t.tab.id }), { tip: "Move to bonus tracks (settle the tab)" }))
          .child(div().flex_none().w(u(6))),
      );
  }

  sideFace(u, side, f) {
    const tracks = side.groups.flatMap((g) => g.tracks);
    const runtime = tracks.filter((t) => t.tab.status === "working" && t.tab.working_since).reduce((s, t) => s + (Date.now() - t.tab.working_since), 0);
    const eaten = side.state === "unavailable";
    const body = [];
    for (const g of side.groups) {
      if (!g.tracks.length) continue;
      body.push(
        h_flex()
          .flex_none()
          .h(u(ROW))
          .pl(u(42))
          .pr(u(10))
          .items_end()
          .pb(u(3))
          .border_b(u(1))
          .border_color(C.rule)
          .child(div().flex_1().min_w(0).truncate().text_size(u(19)).text_color(C.ink).child(g.space.name.toUpperCase()))
          .child(div().flex_none().w(u(1)))
          .child(
            penButton(u, `mx-space-${g.space.id}`, "", () => run("space.select", { id: g.space.id }), {
              content: printed(u, g.space.active ? "on deck" : "cue", g.space.active ? C.stripe : C.pencil, 8),
              tip: "Show this space",
            }),
          ),
      );
      for (const t of g.tracks) body.push(this.track(u, side, t, f?.tab === t.tab.id));
    }
    if (!body.length)
      body.push(
        h_flex()
          .flex_none()
          .h(u(ROW))
          .pl(u(42))
          .items_center()
          .border_b(u(1))
          .border_color(C.rule)
          .text_color(C.pencil)
          .child(eaten ? "tape eaten: machine unreachable" : "blank side. press rec to record a track"),
      );
    // BONUS TRACKS: settled tabs, folded.
    if (side.bonus.length) {
      const open = this.showBonus.has(side.letter);
      body.push(
        h_flex()
          .id(`mx-bonus-${side.letter}`)
          .flex_none()
          .h(u(ROW))
          .pl(u(42))
          .gap(u(8))
          .items_end()
          .pb(u(3))
          .border_b(u(1))
          .border_color(C.rule)
          .cursor_pointer()
          .on_click((_e, cx) => {
            open ? this.showBonus.delete(side.letter) : this.showBonus.add(side.letter);
            cx.notify();
          })
          .child(div().text_size(u(17)).text_color(C.inkSoft).child(`bonus tracks (${side.bonus.length})`))
          .child(printed(u, open ? "fold" : "unfold", C.pencil, 8)),
      );
      if (open)
        for (const t of side.bonus)
          body.push(
            h_flex()
              .flex_none()
              .h(u(ROW))
              .pl(u(42))
              .pr(u(10))
              .items_center()
              .border_b(u(1))
              .border_color(C.rule)
              .child(div().flex_1().min_w(0).truncate().text_color(C.pencil).child(t.title.toUpperCase()))
              .child(
                penButton(u, `mx-unshelve-${t.tab.id}`, "play", () => {
                  run("tab.unsettle", { id: t.tab.id });
                  play(t);
                }, { tip: "Bring back from the shelf" }),
              ),
          );
    }
    // Blank ruled lines below, the way an inlay always has some left.
    for (let i = 0; i < 6; i++) body.push(div().flex_none().h(u(ROW)).border_b(u(1)).border_color(C.rule));

    return v_flex()
      .flex_none()
      .w(this.width ? this.width : u(420))
      .h_full()
      .child(
        // The side's heading, printed + written: SIDE A, the machine, its runtime.
        h_flex()
          .flex_none()
          .h(u(44))
          .pl(u(12))
          .pr(u(10))
          .gap(u(10))
          .items_center()
          .border_b(u(2))
          .border_color(C.ink)
          .child(printed(u, "side", C.stripe, 10))
          .child(div().text_size(u(30)).text_color(C.ink).child(side.letter))
          .child(
            v_flex()
              .flex_1()
              .min_w(0)
              .child(div().truncate().text_size(u(17)).text_color(C.ink).child(side.label.toUpperCase()))
              .child(printed(u, eaten ? "tape eaten · unreachable" : side.state === "loading" ? "threading tape…" : `${side.count} tracks`, eaten ? C.stripe : C.pencil, 8)),
          )
          .child(
            v_flex()
              .flex_none()
              .items_end()
              .child(printed(u, "running time", C.pencil, 8))
              .child(div().text_size(u(17)).text_color(C.ink).child(totalTime(runtime))),
          ),
      )
      .child(v_flex().id(`mx-side-${side.letter}`).flex_1().min_h(0).overflow_y_scroll().children(body))
      .child(
        h_flex()
          .flex_none()
          .h(u(40))
          .px(u(10))
          .gap(u(8))
          .items_center()
          .border_t(u(1))
          .border_color(C.rule)
          .child(
            h_flex()
              .id(`mx-rec-${side.letter}`)
              .flex_none()
              .h(u(26))
              .px(u(10))
              .gap(u(6))
              .items_center()
              .rounded(u(13))
              .bg(eaten ? C.cardShade : C.stripe)
              .text_color(eaten ? C.pencil : C.stripeInk)
              .cursor_pointer()
              .on_click((_e, _cx) => !eaten && openRec(side.name))
              .tooltip(eaten ? "This machine is unreachable" : `Record a new track on ${side.label}`)
              .child(div().w(u(8)).h(u(8)).rounded(u(4)).bg(eaten ? C.pencil : C.stripeInk))
              .child(printed(u, "rec", eaten ? C.pencil : C.stripeInk, 10)),
          )
          .child(div().flex_1().text_size(u(15)).text_color(C.pencil).truncate().child(eaten ? "can't record: machine unreachable" : `new track on ${side.label}`)),
      );
  }

  render(cx) {
    const u = unit();
    const sides = tape();
    this.watch(sides, cx);
    const f = focused();
    // Follow the active space's machine until the person flips by hand.
    const active = sides.findIndex((s) => s.groups.some((g) => g.space.id === f?.space));
    const activeName = active >= 0 ? sides[active].name : undefined;
    if (activeName !== this.followed) {
      this.followed = activeName;
      if (active >= 0) this.side = active;
    }
    const idx = Math.min(this.side ?? 0, sides.length - 1);
    const w = this.width;

    const tabs = h_flex()
      .flex_none()
      .h(u(34))
      .px(u(8))
      .gap(u(4))
      .items_end()
      .bg(C.cardShade)
      .border_b(u(1))
      .border_color(C.rule)
      .children(
        sides.map((s, i) => {
          const on = i === idx;
          const need = s.groups.some((g) => g.tracks.some((t) => t.tab.status === "blocked"));
          return h_flex()
            .id(`mx-tab-${s.letter}`)
            .flex_none()
            .h(u(28))
            .px(u(10))
            .gap(u(6))
            .items_center()
            .rounded_t(u(6))
            .when(on, (el) => el.bg(C.card).border_1().border_b(u(0)).border_color(C.rule))
            .cursor_pointer()
            .on_click((_e, cx) => {
              this.side = i;
              cx.notify();
            })
            .child(div().text_size(u(18)).text_color(on ? C.ink : C.inkSoft).child(`side ${s.letter}`))
            .child(printed(u, s.label, s.state === "unavailable" ? C.stripe : C.pencil, 8))
            .when(need, (el) => el.child(art("bang", u, 14)));
        }),
      );

    const strip = w
      ? h_flex()
          .absolute()
          .top(0)
          .bottom(0)
          .left(-idx * w)
          .w(w * sides.length)
          .transition("left", { duration: 380, easing: "ease-in-out" })
          .children(sides.map((s) => this.sideFace(u, s, f)))
      : this.sideFace(u, sides[idx], f);

    return hand(
      u,
      v_flex()
        .id("mx-sides")
        .size_full()
        .bg(C.card),
    )
      .child(tabs)
      .child(
        div()
          .id("mx-fold")
          .relative()
          .flex_1()
          .min_h(0)
          .overflow_hidden()
          .on_size_change((size, cx) => {
        size = designSize(size);
            if (Math.abs(size.width - this.width) > 1) {
              this.width = size.width;
              cx.notify();
            }
          })
          .child(strip),
      );
  }
}
