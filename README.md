# pixel-agents-web

Web visual office prototype for making AI assistant work visible: incoming WhatsApp events, task ownership, handoffs, decisions, and completion states are represented as a small pixel-art office with Vera and Cris moving between work points.

The goal is simple: instead of showing only logs or labels, the scene should make it obvious when something arrives, who is handling it, where they work, when a human decision is needed, and when the real reply has actually been sent.

## Features

- React + Vite canvas-based pixel office.
- Real event ingestion through `/api/events` using Server-Sent Events.
- Editable office layout: furniture, agent positions, work anchors, and orientation arrows.
- Visual work states for Vera and Cris:
  - walk to the WhatsApp arrival point,
  - move to the configured work point,
  - face the configured direction,
  - show typing/activity while waiting,
  - show OK only after a real `whatsapp.reply_sent` event.
- Debug tracing for event boundaries: SSE, mapping, tasks, agents, and rendering.

## Event API

Start the app and POST events to `/api/events`:

```bash
curl -X POST http://localhost:8080/api/events \
  -H 'Content-Type: application/json' \
  --data '{"type":"whatsapp.received","id":1,"text":"hello","target":"vera"}'
```

Useful event types:

- `whatsapp.received` — creates an incoming WhatsApp flow. Use `target: "vera"` or `target: "cris"`.
- `assigned_to_vera` / `task.assigned_to_vera` — maps to the Vera WhatsApp handling flow.
- `assigned_to_cris` / `task.assigned_to_cris` — maps to the Cris WhatsApp handling flow.
- `whatsapp.reply_sent` — marks the current task as really completed/OK.

## Run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Run the small static/SSE server after building:

```bash
PORT=8080 node server.js
```

## Docker

```bash
docker compose -f deploy/backuptools/docker-compose.yml up -d --build
```

The compose file maps the app to port `4400` in the current deployment, but you can adapt it for your own environment.

## Layout editor

Open the app and use **Editor elementos** to edit:

- furniture and decorative elements,
- Vera and Cris starting positions,
- PC assignment for Vera/Cris,
- work anchors:
  - `Llega WhatsApp`,
  - `Leer/teclear WA`,
  - `Trabajo Vera`,
  - `Trabajo Cris`,
  - `Entrega Vera→Cris`,
  - `Decisiones`,
- orientation arrows for each work anchor.

Use **Copiar layout** to export the current `elements`, `anchors`, and `anchorDirections` JSON.

## Community & Contributing

Use [Issues](https://github.com/Softradis/oficinaFamilia/issues) to report bugs or request new features. For open questions, design ideas, implementation tradeoffs, and general conversation, join [Discussions](https://github.com/Softradis/oficinaFamilia/discussions).

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for instructions on how to contribute, open useful bug reports, propose features, and submit pull requests.

Please read our [`Code of Conduct`](./CODE_OF_CONDUCT.md) before participating.

## Supporting the Project

If you find Pixel Agents Web useful, consider supporting its development:

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=githubsponsors)](https://github.com/sponsors/Softradis)
[![Support on Ko-fi](https://img.shields.io/badge/Support-Ko--fi-ff5e5b?logo=kofi)](https://ko-fi.com/softradis)

## Credits

This project uses and adapts pixel-art ideas/assets inspired by Pixel Agents:

- [`pablodelucca/pixel-agents`](https://github.com/pablodelucca/pixel-agents)

Thank you to the original author for making that work available.

Additional local assets may include generated or hand-edited sprites and furniture used for this prototype.

## License

MIT. See [`LICENSE`](./LICENSE).
