# Launch Kit

Use this checklist when sharing pixel-agents-web publicly.

## GitHub setup

Recommended repository description:

```text
Visual dashboard for AI agents: arrivals, handoffs, decisions, work states, and real completion events in a pixel-art office.
```

Recommended topics:

```text
ai-agents, ai-dashboard, agent-visualization, workflow-automation, real-time-dashboard, pixel-art, canvas, react, typescript, vite, openclaw, sse
```

Recommended social preview image:

```text
docs/assets/social-preview.svg
```

## Best first promotion target

Do these first:

1. Add a short GIF or video to the README, above the fold.
2. Publish a live demo if possible.
3. Pin a GitHub Discussion asking for feedback on useful integrations.
4. Share one short post with the visual preview.

## Short post

```text
I’m building pixel-agents-web: a visual dashboard where AI agents move through a small pixel office as work happens.

Instead of watching logs, you can see work move through the room: incoming messages, ownership, handoffs, human decisions, and real completion events.

MIT repo: https://github.com/Softradis/pixel-agents-web
```

## LinkedIn post

```text
I’ve started publishing pixel-agents-web, an MIT visual dashboard for AI agent workflows.

The idea is simple: when agents handle real work, logs are not enough. A small pixel office can show what is happening at a glance:

• a message arrives
• an agent picks it up
• work is handed off
• a human decision is needed
• OK appears only after a real `reply_sent`/completed event

It currently runs as a React/Vite prototype with Server-Sent Events and an editable office layout.

Feedback, issues, and contributions are welcome:
https://github.com/Softradis/pixel-agents-web
```

## Hacker News / Show HN draft

```text
Show HN: pixel-agents-web – a pixel-art dashboard for visualizing AI agent workflows

I’m building a small visual dashboard that shows AI agent work as a pixel office. Instead of watching logs, you can see work move through the room: arrivals, ownership, handoffs, human decisions, active work, and completion events. The visual layer should represent reality, not invent resolution.

It is an MIT React/Vite prototype with an event API and Server-Sent Events.

Repo: https://github.com/Softradis/pixel-agents-web
```

## Reddit draft

```text
I made a small MIT prototype for visualizing AI agent workflows as a pixel-art office.

The goal is to make agent activity understandable at a glance: incoming messages, who owns the task, handoffs, blocked states, and real completion events.

It is built with React/Vite and SSE, with a small editable office layout.

Repo: https://github.com/Softradis/pixel-agents-web

I’d love feedback on what integrations would make this useful: OpenClaw events, webhooks, n8n, GitHub issues, queues, etc.
```

## Places to share

- GitHub Discussions in related projects, when relevant and respectful.
- OpenClaw Discord/community.
- LinkedIn from David/Softradis.
- X/Twitter with GIF or short video.
- Reddit: `r/SideProject`, `r/selfhosted`, `r/webdev`, `r/ArtificialInteligence`.
- Hacker News: `Show HN` once there is a live demo or strong GIF.
- Product Hunt later, if the project gets a hosted demo or productized version.

## Asset checklist

- `docs/assets/social-preview.svg` exists.
- Add `docs/assets/demo.gif` when available.
- Add a real hosted demo link when available.
- Keep README first screen focused on what it is, why it matters, and how to try it.
