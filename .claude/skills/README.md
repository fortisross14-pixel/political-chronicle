# Project skills

Agent skills (SKILL.md format) that Claude Code loads for this project. They're vendored copies
of third-party skills, reviewed before being added. Each skill's own text is unchanged.

| Skill | Use it for | Source |
| --- | --- | --- |
| `frontend-design` | Visual direction, type, palette, avoiding templated UI | [anthropics/skills](https://github.com/anthropics/skills) @ `2c5958e` (see its LICENSE.txt) |
| `game-feel` | Juice: easing, pops, shake, flash, reduce-motion toggles | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) @ `c6ca6c4` |
| `game-ui-ux` | HUD and menu layout, safe areas, focus, accessibility minimums | same |
| `card-game` | Cards as data, zones, effect resolution, power budgets | same |
| `roguelike` | Run structure, seeds, meta-progression, run vs profile state | same |
| `audio-design` | Buses, volume sliders, adaptive music, SFX variation | same |
| `create-game-assets` | Art direction briefs, consistent asset families, provenance | same (the `agents/` folder was left out) |

The awesome-gamedev skills are Apache-2.0 (`LICENSE-awesome-gamedev-agent-skills`,
`NOTICE-awesome-gamedev-agent-skills`). Their engine examples are Godot/Unity; for this project,
apply the engine-neutral rules to React, CSS and the Web Animations API.
