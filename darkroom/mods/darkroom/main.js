// Darkroom: your agents as prints in a darkroom under amber safelight.
// One mod in roles; the layout gives each copy { role }:
//   bay   (default) the timer, light box, drying line and trays
//   rail  what's under the enlarger, station counts, Settings
//   pane  a pane's header: masking tape on the easel

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Bay from "./bay.js";
import Rail from "./rail.js";
import Pane from "./pane.js";

const ROLES = { bay: Bay, rail: Rail, pane: Pane };

export default class Darkroom extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role ?? "bay"];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`darkroom: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
