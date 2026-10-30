// The Desk: a newspaper wire desk at deadline for your agents. One mod in
// roles; the layout gives each copy { role }:
//   masthead  the nameplate, dateline, tonight's tally, ASSIGN and SETTINGS
//   budget    every agent as a story, ranked; the spiked shelf; the editor's note
//   copyhead  the rail naming the story in the copy
//   galley    a pane's header, as a galley proof slug
//   assign    the Assign a Story dialog (an overlay)

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Masthead from "./masthead.js";
import Budget from "./budget.js";
import Galley, { CopyHead } from "./galley.js";
import Assign from "./assign.js";

const ROLES = { masthead: Masthead, budget: Budget, copyhead: CopyHead, galley: Galley, assign: Assign };

export default class Desk extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role] ?? Budget;
    this.role = new R();
    this.role.init?.(pr, cx);
  }

  render(cx) {
    return this.role ? this.role.render(cx) : div();
  }
}
