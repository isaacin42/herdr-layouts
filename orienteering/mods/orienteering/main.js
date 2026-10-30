// Orienteering: your agents as an orienteering map. One mod, in roles; the
// layout gives each copy { role }:
//   header  the map margin: title, legend with counts, NEW CONTROL, SETTINGS
//   board   the map (spaces as terrain, agents as features, the purple course
//           through everyone who needs you) and the control description sheet
//   rail    the leg you're on: the shown space and tab
//   pane    a pane's header as a legend strip
//   launch  NEW CONTROL, an overlay

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Header from "./header.js";
import Board from "./board.js";
import Rail from "./rail.js";
import Pane from "./pane.js";
import Launch from "./launch.js";

const ROLES = { header: Header, board: Board, rail: Rail, pane: Pane, launch: Launch };

export default class Orienteering extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role] ?? Board;
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`orienteering: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
