// Herdr Terminal: a Bloomberg-terminal layout for Herdr. Like Herdr 98, the
// whole look is this one mod in roles; the layout gives each copy { role }:
//   cmdline  the command line: mnemonics + <GO>, context, clock
//   tape     the news crawl of agent events
//   panel    a pane's header, as a numbered panel strip
//   monitor  the agent monitor board and the spaces (sectors)
//   keys     the keyboard strip: GO, MENU, a market key per space, BLKD
//   help     HELP <GO>, the mnemonic menu (an overlay)

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Cmdline from "./cmdline.js";
import Tape from "./tape.js";
import Panel from "./panel.js";
import Monitor from "./monitor.js";
import Keys from "./keys.js";
import Help from "./help.js";

const ROLES = { cmdline: Cmdline, tape: Tape, panel: Panel, monitor: Monitor, keys: Keys, help: Help };

export default class Bloomberg extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`bloomberg: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
