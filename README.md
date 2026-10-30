# Herdr layouts

Eight whole-window layouts for [Herdr](https://herdr.dev). Each one changes
how you run your agents, not only how the window looks. They were made with
agents for a setup of 5–15 Claude Code agents across this Mac and a remote dev
machine.

Each folder is one layout, laid out like `~/.config/herdr-app`:

```
desk/
├── RECIPE.md          what it is, how it was built, what it assumes
├── preview.png
├── layouts/desk.json  (+ desk.svg, the picture Settings shows)
├── themes/desk.json
└── mods/desk/         the mod, its fonts and art
```

Bloomberg, Pass and Mixtape also have a `keys.json` with their
`layout:<name>` keys. Merge it into yours.

| Layout | |
| --- | --- |
| [Herdr Terminal](bloomberg/) | a Bloomberg terminal: four-letter mnemonics and `<GO>`, a news tape of agent events, a quote-board agent monitor, colored keycaps per space |
| [The Desk](desk/) | a newspaper wire desk: agents are stories on tonight's budget, held stories first; steer any of them from the editor's note |
| [The Pass](pass/) | a restaurant kitchen pass: agents are tickets on the rail; YES CHEF approves, FIRE sends a follow-up, HOLD stops one |
| [Mixtape](mixtape/) | a cassette J-card: each machine is a side, each tab a track; flip sides, REC starts an agent |
| [Orienteering](orienteering/) | an orienteering map: spaces are terrain by machine, agents needing you are controls on the course, in order |
| [Orrery](orrery/) | a brass orrery: agents orbit you, pulled inward the more they need you (showpiece) |
| [Darkroom](darkroom/) | a photo darkroom: agents are prints moving through expose, develop, fix and wash; the light box holds the ones waiting on you (showpiece) |
| [Neon](neon/) | a brick wall of neon signs, one per space; tubes light up for working agents, go red when blocked (showpiece) |

To add one, ask your agent to read its `RECIPE.md` and every file, then copy
`layouts/`, `themes/` and `mods/` into `~/.config/herdr-app`.

Fonts are bundled under their own licenses (SIL OFL), next to each font.
