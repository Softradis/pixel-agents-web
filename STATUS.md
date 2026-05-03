# Status · pixel-agents-web

## Current state

The project is a presentable MVP for visualizing AI assistant work in a pixel-art office.

## Done

- React/Vite app configured and buildable.
- Canvas-based pixel office prototype.
- Event API with `/api/events` and Server-Sent Events.
- Simulated flows for resolved and blocked work.
- Visual task movement between arrival, work, handoff, decision, and completion states.
- Editable layout for furniture, agent positions, work anchors, and orientation arrows.
- Public MIT release preparation:
  - `LICENSE`,
  - `README.md`,
  - `CONTRIBUTING.md`,
  - `CODE_OF_CONDUCT.md`,
  - documented asset sources.

## Demo script

### Resolved flow

Trigger a WhatsApp/event simulation. Expected result: arrival → agent reads/classifies → work is handled → green completed state.

### Blocked flow

Trigger a blocked simulation. Expected result: arrival → agent reads/classifies → work is handled → human decision state.

## Recommended next improvements

- Add import support for exported layouts.
- Make event examples easier to copy into real integrations.
- Improve asset organization and attribution notes.
- Add tests around event-to-task state transitions.

## Verification

Before publishing changes, run:

```bash
npm run build
```

Optional local server check:

```bash
PORT=8080 node server.js
# open http://localhost:8080/
```
