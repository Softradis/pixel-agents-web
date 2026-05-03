# Pixel Agents Extension

## Purpose

The pixel-agents prototype explores animated agents inside a visual office without tying the project to a private deployment or a single internal workflow.

## Architecture principle

Separate three responsibilities:

1. **Layout**
   - Defines rooms, walls, furniture, zones, and coordinates.
   - Can be isometric, top-down, pixel art, or another composition style.

2. **Task flow**
   - Keeps a generic flow: intake → agent A → agent B → resolved/blocked.
   - Preserves visual semantics:
     - green = resolved,
     - red/warning = human decision needed.
   - Should not depend on a specific visual style.

3. **Agent renderer**
   - Decides how each agent is drawn.
   - Can use:
     - static sprites,
     - animated spritesheets,
     - placeholders,
     - pixel agents with walking animation.

## Agent states

Minimum states:

- `idle`: available or waiting.
- `walk`: moving toward a destination.
- `working`: processing a task.
- `blocked`: waiting for human input.

Optional future states:

- `talking`,
- `thinking`,
- `handoff`,
- `error`.

## Prototype scope

The prototype should demonstrate only the useful product idea:

1. Two agents are visible as pixel characters.
2. One agent can walk from intake toward a work/handoff point.
3. Another agent can be idle or working.
4. A task can move through the office.
5. Resolved and blocked states remain visually clear.

Avoid adding a full game engine, unrelated asset packs, or unnecessary task logic unless it improves the visual explanation of agent work.

## Reference: pablodelucca/pixel-agents

Reference repository:

```text
https://github.com/pablodelucca/pixel-agents
```

This repository is relevant because it demonstrates:

- animated characters,
- editable office layout,
- visual states tied to activity,
- persistent/exportable layout,
- modular assets,
- canvas rendering,
- pathfinding,
- character state machines.

Observed repository license: MIT. Before reusing code or assets, audit:

1. repository license,
2. included third-party asset licenses,
3. attribution requirements,
4. redistribution/modification permissions,
5. which parts should be reused and which should only be treated as reference.

## Integration criteria

Treat the pixel office as a focused prototype:

- keep rendering decoupled from task semantics,
- keep asset sources documented,
- keep the demo reproducible locally,
- avoid environment-specific deployment assumptions,
- keep public examples neutral and understandable.

## Implemented MVP

Current MVP includes:

- two animated pixel agents,
- walking animation using spritesheet frames,
- a top-down grid office,
- BFS pathfinding between intake, work, handoff, and decision zones,
- task states for resolved and blocked outcomes,
- timeline/panel details as secondary information,
- editable element layout with local persistence,
- exportable JSON for `elements`, `anchors`, and `anchorDirections`.

## Layout editor

The editor supports:

- element placement,
- deletion by cell,
- clearing placed elements,
- local browser persistence,
- layout JSON export,
- grouped asset categories for furniture, electronics, wall pieces, decoration, and miscellaneous objects.

This keeps the project useful as a visual workflow prototype while leaving room for future integrations with real assistant events.
