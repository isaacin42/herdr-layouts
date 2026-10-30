// The agent monitor: every agent as a row on a quote board (ticker, status
// cell, time in that state, what it's working on), blocked first. A row whose
// status just changed flashes its status color and fades, the way a quote
// cell flashes on a trade. Below it, the sectors: your spaces, each with its
// machine, its tabs and its most urgent status. Click a row to go there.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, focused, run, setAgentOrder } from "herdr";
import { C, unit, root, board, ticker, statusCell, status, ago, code, label } from "./kit.js";

const FLASH = { working: C.amber, blocked: C.red, done: C.green, idle: "#3a3a3a" };

function clean(s) {
  return String(s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

export default class Monitor {
  init() {
    this.prev = null;
    this.hot = new Set();
    // Rows still fading out: address -> when the fade ends. Only these and
    // the hot rows carry a flash layer, so a quiet board draws none.
    this.fading = new Map();
  }

  // Remember statuses; light the rows that changed and schedule their fade.
  watch(list, cx) {
    const cur = new Map(list.map((a) => [a.address, a.status]));
    if (this.prev) {
      const changed = list.filter((a) => this.prev.has(a.address) && this.prev.get(a.address) !== a.status).map((a) => a.address);
      if (changed.length) {
        changed.forEach((a) => this.hot.add(a));
        cx.timer.after(80, (cx) => {
          const until = Date.now() + 1800;
          changed.forEach((a) => {
            this.hot.delete(a);
            this.fading.set(a, until);
          });
          cx.notify();
          cx.timer.after(1850, (cx) => {
            const now = Date.now();
            for (const [a, t] of this.fading) if (t <= now) this.fading.delete(a);
            cx.notify();
          });
        });
      }
    }
    this.prev = cur;
  }

  heading(u, mnemonic, title, right) {
    return h_flex()
      .flex_none()
      .h(u(20))
      .px(u(8))
      .gap(u(8))
      .items_center()
      .bg("#141414")
      .border_b(u(1))
      .border_color(C.rule)
      .child(div().flex_none().px(u(4)).bg(C.amber).text_color(C.amberInk).child(mnemonic))
      .child(div().flex_1().text_color(C.white).child(title))
      .child(right ?? div());
  }

  columns(u, cells) {
    return h_flex()
      .flex_none()
      .h(u(16))
      .px(u(8))
      .gap(u(8))
      .items_center()
      .text_color(C.amberDim)
      .children(cells);
  }

  agentRow(u, a, mine) {
    const info = a.info;
    const since = a.status === "working" ? info?.tab.working_since : info?.tab.changed_at;
    const name = clean(a.title) || a.program?.name || "agent";
    const hot = this.hot.has(a.address);
    const lit = hot || this.fading.has(a.address);
    return h_flex()
      .id(`bbg-agent-${a.address}`)
      .relative()
      .flex_none()
      .h(u(18))
      .px(u(8))
      .gap(u(8))
      .items_center()
      .when(mine, (el) => el.bg(C.rowSel))
      .hover((s) => s.bg(mine ? C.rowSel : "#161616"))
      .cursor_pointer()
      .on_click((_e, _cx) => run("agent.focus", { terminal: a.address }))
      .when(lit, (el) =>
        el.child(
          div()
            .absolute()
            .inset(0)
            .bg(FLASH[a.status] ?? C.amber)
            .opacity(hot ? 0.55 : 0)
            .transition("opacity", hot ? 60 : { duration: 1800, easing: "ease-out" }),
        ),
      )
      .child(div().flex_none().w(u(56)).text_color(C.white).child(ticker(a.space_name, a.tab_index)))
      .child(statusCell(u, a.status))
      .child(div().flex_none().w(u(40)).text_right().text_color(a.status === "working" ? C.white : C.gray).child(ago(since)))
      .child(div().flex_1().min_w(0).truncate().text_color(mine ? C.white : C.gray).child(name.toUpperCase()));
  }

  sectorRow(u, s, active) {
    const tabs = s.tabs.length;
    const st = s.status;
    return h_flex()
      .id(`bbg-sector-${s.id}`)
      .flex_none()
      .h(u(18))
      .px(u(8))
      .gap(u(8))
      .items_center()
      .when(active, (el) => el.bg(C.rowSel))
      .hover((x) => x.bg(active ? C.rowSel : "#161616"))
      .cursor_pointer()
      .on_click((_e, _cx) => run("space.select", { id: s.id }))
      .child(div().flex_none().w(u(18)).text_color(C.amberDim).child(`${s.index})`))
      .child(div().flex_none().w(u(34)).text_color(C.amber).child(code(s.name)))
      .child(div().flex_1().min_w(0).truncate().text_color(active ? C.white : C.gray).child(s.name.toUpperCase()))
      .child(div().flex_none().text_color(C.dim).child(s.machine ? s.machine.toUpperCase() : "LOCAL"))
      .child(div().flex_none().w(u(30)).text_right().text_color(C.gray).child(`${tabs}T`))
      .child(st ? statusCell(u, st) : div().flex_none().w(u(36)));
  }

  render(cx) {
    const u = unit();
    const list = board();
    this.watch(list, cx);
    setAgentOrder(list.map((a) => a.address));
    const f = focused();
    const count = (s) => list.filter((a) => a.status === s).length;
    const tally = h_flex()
      .flex_none()
      .gap(u(8))
      .children(
        ["working", "blocked", "done"].map((s) =>
          h_flex().gap(u(3)).child(div().text_color(status(s).bg).child(status(s).word[0])).child(div().text_color(C.white).child(String(count(s)))),
        ),
      );
    const all = spaces();

    return root(u, v_flex().id("bbg-monitor").size_full().bg(C.glass))
      .child(this.heading(u, "AGNT", "AGENT MONITOR", tally))
      .child(
        this.columns(u, [
          div().flex_none().w(u(56)).child("TICKER"),
          div().flex_none().w(u(36)).child("STAT"),
          div().flex_none().w(u(40)).text_right().child("TIME"),
          div().flex_1().child("WORKING ON"),
        ]),
      )
      .child(
        v_flex()
          .id("bbg-agent-list")
          .flex_1()
          .min_h(0)
          .overflow_y_scroll()
          .children(
            list.length
              ? list.map((a) => this.agentRow(u, a, f?.terminal === a.address))
              : [div().px(u(8)).py(u(10)).text_color(C.dim).child("NO AGENTS LISTED. CLDE <GO> STARTS ONE")],
          ),
      )
      .child(this.heading(u, "SECT", "SPACES", label(`${all.length} LISTED`, C.dim)))
      .child(
        v_flex()
          .id("bbg-sector-list")
          .flex_none()
          .max_h(u(18 * 6))
          .overflow_y_scroll()
          .children(all.map((s) => this.sectorRow(u, s, s.active))),
      );
  }
}
