// Mixtape: a Herdr layout drawn as a cassette's hand-lettered J-card. Every
// machine is a side of the tape (A is this Mac, B dev-vm, …) and every tab on
// it is a track. One mod in roles; the layout gives each copy { role }:
//   flap    the front flap: title, brand stripe, counts, settings
//   spine   the spine: the active space hand-lettered; click to flip sides
//   sides   the inner fold: tracklists per side, REC, bonus tracks
//   label   a pane's header, as a tape label
//   rec     the REC card (an overlay): record a new track on a machine
//   note    the LINER NOTE card (an overlay): a follow-up via hc send

import { View, div } from "gpui-kit";
import { props } from "herdr";
import { Flap, Spine, Label } from "./chrome.js";
import Sides from "./sides.js";
import { Rec, Note } from "./dialogs.js";

const ROLES = { flap: Flap, spine: Spine, sides: Sides, label: Label, rec: Rec, note: Note };

export default class Mixtape extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`mixtape: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
