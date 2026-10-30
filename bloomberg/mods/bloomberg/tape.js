// The news tape under the command line: every agent's status change becomes
// a headline ("14:32 *WAS.1 BUILD FINISHED"), followed by the board's
// totals. A new headline crawls right to left a character at a time for
// CRAWL_MS, then the tape rests on the latest headline, still. The crawl is a
// native frame sequence, but every frame repaints the whole window, so it
// only runs while there is news.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents } from "herdr";
import { C, unit, root, ticker, status } from "./kit.js";

const GAP = "      ";
const STEP_MS = 140;
const CRAWL_MS = 40000;

function hhmm(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function who(a) {
  const n = (a.title && a.title !== a.program?.name ? a.title : a.program?.name) || "AGENT";
  return n.toUpperCase().replace(/\s+/g, " ").slice(0, 34);
}

const VERB = {
  done: "FINISHED",
  blocked: "NEEDS YOU",
  working: "STARTED WORK",
  idle: "WENT IDLE",
};

export default class Tape {
  init() {
    this.prev = null;
    this.events = [];
    this.chars = 160;
    this.memo = { key: null, frames: [] };
    this.crawlUntil = 0;
  }

  scan() {
    const now = new Date();
    const cur = new Map(agents().map((a) => [a.address, a]));
    if (this.prev) {
      for (const [addr, a] of cur) {
        const was = this.prev.get(addr);
        if (!was) this.push(now, `*${ticker(a.space_name, a.tab_index)} ${who(a)} LISTED`);
        // done -> idle only means someone looked at it: not news.
        else if (was.status !== a.status && VERB[a.status] && !(was.status === "done" && a.status === "idle"))
          this.push(now, `*${ticker(a.space_name, a.tab_index)} ${who(a)} ${VERB[a.status]}`);
      }
      for (const [addr, a] of this.prev) if (!cur.has(addr)) this.push(now, `*${ticker(a.space_name, a.tab_index)} DELISTED`);
    }
    this.prev = new Map([...cur].map(([k, a]) => [k, { status: a.status, space_name: a.space_name, tab_index: a.tab_index }]));
    return [...cur.values()];
  }

  push(when, text) {
    this.events.unshift(`${hhmm(when)} ${text}`);
    this.events = this.events.slice(0, 10);
    this.fresh = true;
  }

  headline(list) {
    const count = (s) => list.filter((a) => a.status === s).length;
    const board = `HERDR BOARD  ${list.length} AGENTS  ${status("working").word} ${count("working")}  ${status("blocked").word} ${count("blocked")}  ${status("done").word} ${count("done")}  ${status("idle").word} ${count("idle")}`;
    const blocked = list.filter((a) => a.status === "blocked").map((a) => `*${ticker(a.space_name, a.tab_index)} WAITING ON YOU`);
    const news = this.events.length ? this.events : ["NO NEW HEADLINES. AGENTS REPORT HERE AS THEY START, FINISH OR BLOCK"];
    return [board, ...blocked, ...news].join(GAP) + GAP;
  }

  frames(text, n) {
    const key = `${n}|${text}`;
    if (this.memo.key === key) return this.memo.frames;
    let loop = text;
    while (loop.length < n) loop += text;
    const twice = loop + loop;
    const frames = [];
    for (let i = 0; i < loop.length; i++) frames.push(twice.slice(i, i + n));
    this.memo = { key, frames };
    return frames;
  }

  render(cx) {
    const u = unit();
    this.fresh = false;
    const list = this.scan();
    if (this.fresh) {
      this.crawlUntil = Date.now() + CRAWL_MS;
      cx.timer.after(CRAWL_MS + 50, (cx) => cx.notify());
    }
    const moving = Date.now() < this.crawlUntil;
    const text = this.headline(list);
    return root(
      u,
      h_flex()
        .id("bbg-tape")
        .size_full()
        .items_center()
        .bg(C.panel)
        .border_b(u(1))
        .border_color(C.rule)
        .on_size_change((size, cx) => {
          // Departure Mono advances ~0.64em; undercount the width so the
          // crawl always overfills and the overflow is clipped.
          const n = Math.ceil(size.width / u(6)) + 4;
          if (Math.abs(n - this.chars) > 2) {
            this.chars = n;
            cx.notify();
          }
        }),
    )
      .child(div().flex_none().h_full().px(u(8)).flex().items_center().bg(C.keyRed).text_color("#fff1f1").child("NEWS"))
      .child(
        div()
          .flex_1()
          .min_w(0)
          .overflow_hidden()
          .pl(u(8))
          .text_color(C.amber)
          .whitespace_nowrap()
          .when(moving, (el) => el.frames(this.frames(text, this.chars), STEP_MS))
          .when(!moving, (el) => el.truncate().child(this.events[0] ?? text)),
      );
  }
}
