# Project Notes · pixel-agents-web

## Purpose

pixel-agents-web is a visual prototype for making AI assistant work understandable at a glance. It shows incoming events, task assignment, handoffs, active work, human decisions, and completion states inside a small pixel-art office.

## Product goal

In about 30 seconds, a viewer should understand:

- a new item has arrived,
- an assistant is handling it,
- work can be handed off,
- some tasks need a human decision,
- completed work is visually distinct from blocked work.

## Current direction

- React/Vite app with a canvas-based pixel office.
- Event ingestion through `/api/events` and Server-Sent Events.
- Editable layout for furniture, work anchors, and agent positions.
- Demo flows for resolved and blocked work.
- Public MIT project with documented asset sources and contribution guidelines.

## Contribution priorities

Useful contributions should improve at least one of these areas:

- visual clarity of the office and task states,
- reliability of event ingestion and state transitions,
- layout editing and export/import workflow,
- documentation for setup, usage, and extension,
- maintainability of assets and rendering code.
