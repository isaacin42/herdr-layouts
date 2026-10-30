// Neon: every space is a hand-bent neon sign on a brick wall, every agent a
// tube in it, lit by its status. One mod in roles; the layout gives each copy
// { role }:
//   wall      the signs on the backboard (also the fallback)
//   breakers  the panel strip: tube counts, a breaker per space, SETTINGS
//   plaque    a pane's header in the storefront below

import { View } from "gpui-kit";
import { props } from "herdr";
import Wall from "./wall.js";
import Breakers from "./breakers.js";
import Plaque from "./plaque.js";

const ROLES = { wall: Wall, breakers: Breakers, plaque: Plaque };

export default class Neon extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role] ?? Wall;
    this.role = new R();
    this.role.init?.(pr, cx);
  }

  render(cx) {
    return this.role.render(cx);
  }
}
