// The Pass: a restaurant line at service, for running many agents at once.
// One mod in roles; the layout gives each copy { role }:
//   header   the name, service clock, call tallies, NEW TICKET, SETTINGS
//   rail     every agent as a ticket on the rail (triage)
//   station  a pane's header on the line (label-maker tape)
//   expo     the expo station: read and call the selected ticket (steer)
//   order    NEW TICKET, a dialog (launch)

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Header from "./header.js";
import Rail from "./rail.js";
import Station from "./station.js";
import Expo from "./expo.js";
import Order from "./order.js";

const ROLES = { header: Header, rail: Rail, station: Station, expo: Expo, order: Order };

export default class Pass extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`pass: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
