import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import './style.css';

type TaskStatus = 'esperando' | 'trabajando' | 'bloqueado' | 'resuelto';
type Owner = 'entrada' | 'vera' | 'cris' | 'decision';
type TimelineEvent = { id: number; text: string; status: TaskStatus; at: string };

type OfficeTask = {
  id: number;
  title: string;
  kind: 'whatsapp' | 'email' | 'bug' | 'decision';
  status: TaskStatus;
  owner: Owner;
  detail: string;
  fromOwner?: Owner;
  reactingOwner?: Owner;
  pauseLabel?: string;
};

const colors: Record<TaskStatus, number> = {
  esperando: 0xf4c542,
  trabajando: 0x4fa3ff,
  bloqueado: 0xff5d5d,
  resuelto: 0x56d364,
};

const statusText: Record<TaskStatus, string> = {
  esperando: 'Esperando',
  trabajando: 'Trabajando',
  bloqueado: 'Bloqueado',
  resuelto: 'Resuelto',
};

const nowTime = () => new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());

const initialTasks: OfficeTask[] = [
  {
    id: 1,
    title: 'WhatsApp entrante',
    kind: 'whatsapp',
    status: 'esperando',
    owner: 'entrada',
    detail: 'Mensaje nuevo entrando por recepción. Vera lo recogerá y clasificará.',
  },
  {
    id: 2,
    title: 'Bug técnico',
    kind: 'bug',
    status: 'trabajando',
    owner: 'cris',
    detail: 'Incidencia técnica ya derivada a Cris. Está diagnosticando el problema.',
  },
  {
    id: 3,
    title: 'Tarea resuelta',
    kind: 'email',
    status: 'resuelto',
    owner: 'cris',
    detail: 'Trabajo terminado: Cris dejó una tarjeta verde de resuelto.',
  },
];



const kindMeta: Record<OfficeTask['kind'], { icon: string; label: string; tint: number }> = {
  whatsapp: { icon: '💬', label: 'WhatsApp', tint: 0x25d366 },
  email: { icon: '✉️', label: 'Resuelto', tint: 0x56d364 },
  bug: { icon: '⚡', label: 'Bug', tint: 0xffb020 },
  decision: { icon: '❗', label: 'Decisión', tint: 0xff5d5d },
};

function addZoneBadge(stage: Container, title: string, subtitle: string, x: number, y: number, color: number) {
  const badge = new Graphics();
  badge.roundRect(x - 76, y - 24, 152, 48, 14).fill({ color, alpha: 0.2 }).stroke({ width: 2, color, alpha: 0.75 });
  stage.addChild(badge);
  const text = new Text({ text: title, style: { fill: '#ffffff', fontSize: 13, fontWeight: '800' } });
  text.anchor.set(0.5);
  text.position.set(x, y - 7);
  stage.addChild(text);
  const sub = new Text({ text: subtitle, style: { fill: '#b9cee5', fontSize: 10, fontWeight: '600' } });
  sub.anchor.set(0.5);
  sub.position.set(x, y + 10);
  stage.addChild(sub);
}

const assetBase = '/assets/essential-isometric';
const usedIsoAssetFiles = [
  'floor01_01.png', 'floor01_02.png', 'floor01_03.png', 'floor01_04.png',
  'wall01_sngl_L.png', 'wall01_sngl_R.png', 'wall01_ent02_L.png', 'wall01_ent02_R.png', 'door_front.png', 'window01.png',
  'officedesk01big.png', 'officedesk02big.png', 'officedesk01norm.png', 'officeChair01.png', 'officeChair01_back.png',
  'computer01.png', 'computer02.png', 'laptop.png', 'bookshelf01.png', 'bookshelf08.png', 'rug01.png', 'rug03.png',
  'armchair.png', 'lamp01.png', 'paper.png', 'telephone.png', 'drawer05.png', 'couch.png', 'tablecenter01.png', 'rack04.png',
  'plant01.png', 'plant04.png', 'pinnednote01.png', 'clock01.png', 'vera_worker.png', 'cris_worker.png',
];

function addIsoAsset(stage: Container, file: string, x: number, y: number, scale = 2.45, alpha = 1, anchorX = 0.5, anchorY = 1) {
  const sprite = Sprite.from(`${assetBase}/${file}`);
  sprite.anchor.set(anchorX, anchorY);
  sprite.position.set(x, y);
  sprite.scale.set(scale);
  sprite.alpha = alpha;
  stage.addChild(sprite);
  return sprite;
}

function isoTile(g: Graphics, x: number, y: number, w: number, h: number, fill: number, stroke = 0x1a2740) {
  g.poly([x, y - h / 2, x + w / 2, y, x, y + h / 2, x - w / 2, y]);
  g.fill(fill);
  g.stroke({ width: 2, color: stroke, alpha: 0.75 });
}

function drawOffice(canvas: HTMLDivElement, tasks: OfficeTask[], selectedId: number | null, onSelect: (id: number) => void) {
  const app = new Application();
  let destroyed = false;

  app.init({ resizeTo: canvas, background: '#10151f', antialias: true }).then(async () => {
    if (destroyed) {
      app.destroy(true);
      return;
    }
    await Assets.load(usedIsoAssetFiles.map((file) => `${assetBase}/${file}`));
    if (destroyed) {
      app.destroy(true);
      return;
    }
    canvas.innerHTML = '';
    canvas.appendChild(app.canvas);

    const stage = new Container();
    app.stage.addChild(stage);

    const root = new Graphics();
    stage.addChild(root);
    const cx = app.renderer.width / 2;
    const cy = app.renderer.height / 2 + 88;

    // Composición base: dos habitaciones conectadas, no una sala única reetiquetada.
    const leftRoom = { x: cx - 235, y: cy + 26 };
    const rightRoom = { x: cx + 205, y: cy + 18 };
    const corridor = { x: cx - 2, y: cy + 40 };

    const roomShadow = new Graphics();
    roomShadow
      .poly([
        leftRoom.x - 262, leftRoom.y - 24,
        leftRoom.x - 10, leftRoom.y - 152,
        leftRoom.x + 244, leftRoom.y - 24,
        leftRoom.x - 10, leftRoom.y + 122,
      ]).fill({ color: 0x05070c, alpha: 0.5 })
      .poly([
        corridor.x - 112, corridor.y - 22,
        corridor.x + 112, corridor.y - 72,
        corridor.x + 186, corridor.y - 18,
        corridor.x - 38, corridor.y + 42,
      ]).fill({ color: 0x05070c, alpha: 0.38 })
      .poly([
        rightRoom.x - 280, rightRoom.y - 34,
        rightRoom.x + 4, rightRoom.y - 178,
        rightRoom.x + 292, rightRoom.y - 34,
        rightRoom.x + 6, rightRoom.y + 136,
      ]).fill({ color: 0x05070c, alpha: 0.52 });
    stage.addChild(roomShadow);

    const leftFloor = new Graphics();
    leftFloor
      .poly([
        leftRoom.x - 236, leftRoom.y - 28,
        leftRoom.x - 8, leftRoom.y - 142,
        leftRoom.x + 220, leftRoom.y - 24,
        leftRoom.x - 6, leftRoom.y + 108,
      ]).fill(0x593f31).stroke({ width: 3, color: 0x7bbce8, alpha: 0.55 })
      .poly([
        leftRoom.x - 8, leftRoom.y - 142,
        leftRoom.x + 220, leftRoom.y - 24,
        leftRoom.x + 220, leftRoom.y - 92,
        leftRoom.x - 8, leftRoom.y - 206,
      ]).fill({ color: 0x2a344a, alpha: 0.72 })
      .poly([
        leftRoom.x - 236, leftRoom.y - 28,
        leftRoom.x - 8, leftRoom.y - 142,
        leftRoom.x - 8, leftRoom.y - 206,
        leftRoom.x - 236, leftRoom.y - 90,
      ]).fill({ color: 0x222b3f, alpha: 0.72 });
    stage.addChild(leftFloor);

    const corridorFloor = new Graphics();
    corridorFloor
      .poly([
        corridor.x - 118, corridor.y - 18,
        corridor.x + 98, corridor.y - 66,
        corridor.x + 172, corridor.y - 14,
        corridor.x - 42, corridor.y + 42,
      ]).fill(0x6a513d).stroke({ width: 3, color: 0xffe0a8, alpha: 0.42 })
      .poly([
        corridor.x - 96, corridor.y - 8,
        corridor.x + 104, corridor.y - 52,
        corridor.x + 140, corridor.y - 22,
        corridor.x - 58, corridor.y + 26,
      ]).fill({ color: 0xffe0a8, alpha: 0.10 });
    stage.addChild(corridorFloor);

    const rightFloor = new Graphics();
    rightFloor
      .poly([
        rightRoom.x - 252, rightRoom.y - 44,
        rightRoom.x + 4, rightRoom.y - 172,
        rightRoom.x + 260, rightRoom.y - 38,
        rightRoom.x + 2, rightRoom.y + 120,
      ]).fill(0x50372f).stroke({ width: 3, color: 0xffca7a, alpha: 0.55 })
      .poly([
        rightRoom.x + 4, rightRoom.y - 172,
        rightRoom.x + 260, rightRoom.y - 38,
        rightRoom.x + 260, rightRoom.y - 106,
        rightRoom.x + 4, rightRoom.y - 236,
      ]).fill({ color: 0x342c3b, alpha: 0.74 })
      .poly([
        rightRoom.x - 252, rightRoom.y - 44,
        rightRoom.x + 4, rightRoom.y - 172,
        rightRoom.x + 4, rightRoom.y - 236,
        rightRoom.x - 252, rightRoom.y - 106,
      ]).fill({ color: 0x2d2738, alpha: 0.74 });
    stage.addChild(rightFloor);

    const receptionTiles = [
      [leftRoom.x - 132, leftRoom.y + 8, 'floor01_01.png'], [leftRoom.x - 32, leftRoom.y - 40, 'floor01_02.png'], [leftRoom.x + 68, leftRoom.y - 88, 'floor01_03.png'],
      [leftRoom.x - 32, leftRoom.y + 62, 'floor01_04.png'], [leftRoom.x + 68, leftRoom.y + 14, 'floor01_01.png'], [leftRoom.x + 168, leftRoom.y - 34, 'floor01_02.png'],
    ] as const;
    receptionTiles.forEach(([x, y, file]) => addIsoAsset(stage, file, x, y, 2.08, 1, 0.5, 0.5));

    const corridorTiles = [
      [corridor.x - 48, corridor.y + 12, 'floor01_04.png'], [corridor.x + 46, corridor.y - 10, 'floor01_02.png'], [corridor.x + 116, corridor.y + 22, 'floor01_03.png'],
    ] as const;
    corridorTiles.forEach(([x, y, file]) => addIsoAsset(stage, file, x, y, 1.78, 0.92, 0.5, 0.5));

    const officeTiles = [
      [rightRoom.x - 144, rightRoom.y - 14, 'floor01_01.png'], [rightRoom.x - 44, rightRoom.y - 62, 'floor01_02.png'], [rightRoom.x + 56, rightRoom.y - 110, 'floor01_03.png'],
      [rightRoom.x - 44, rightRoom.y + 40, 'floor01_04.png'], [rightRoom.x + 56, rightRoom.y - 8, 'floor01_01.png'], [rightRoom.x + 156, rightRoom.y - 56, 'floor01_02.png'],
      [rightRoom.x + 56, rightRoom.y + 92, 'floor01_03.png'], [rightRoom.x + 160, rightRoom.y + 44, 'floor01_04.png'],
    ] as const;
    officeTiles.forEach(([x, y, file]) => addIsoAsset(stage, file, x, y, 2.08, 1, 0.5, 0.5));

    // Paredes separadas: recepción de Vera a la izquierda y oficina técnica de Cris a la derecha.
    addIsoAsset(stage, 'wall01_ent02_L.png', leftRoom.x - 198, leftRoom.y - 26, 2.28);
    addIsoAsset(stage, 'wall01_sngl_L.png', leftRoom.x - 142, leftRoom.y - 74, 2.28);
    addIsoAsset(stage, 'wall01_sngl_L.png', leftRoom.x - 86, leftRoom.y - 122, 2.28);
    addIsoAsset(stage, 'wall01_sngl_R.png', leftRoom.x + 76, leftRoom.y - 132, 2.28);
    addIsoAsset(stage, 'wall01_ent02_R.png', leftRoom.x + 136, leftRoom.y - 98, 2.28);
    addIsoAsset(stage, 'door_front.png', leftRoom.x - 198, leftRoom.y + 82, 2.42);
    addIsoAsset(stage, 'window01.png', leftRoom.x + 62, leftRoom.y - 140, 1.95);
    addIsoAsset(stage, 'clock01.png', leftRoom.x - 92, leftRoom.y - 136, 1.85);

    addIsoAsset(stage, 'wall01_ent02_L.png', rightRoom.x - 198, rightRoom.y - 42, 2.28);
    addIsoAsset(stage, 'wall01_sngl_L.png', rightRoom.x - 142, rightRoom.y - 90, 2.28);
    addIsoAsset(stage, 'wall01_sngl_L.png', rightRoom.x - 86, rightRoom.y - 138, 2.28);
    addIsoAsset(stage, 'wall01_sngl_R.png', rightRoom.x + 82, rightRoom.y - 150, 2.28);
    addIsoAsset(stage, 'wall01_sngl_R.png', rightRoom.x + 146, rightRoom.y - 112, 2.28);
    addIsoAsset(stage, 'wall01_ent02_R.png', rightRoom.x + 210, rightRoom.y - 74, 2.28);
    addIsoAsset(stage, 'window01.png', rightRoom.x + 52, rightRoom.y - 158, 1.95);
    addIsoAsset(stage, 'pinnednote01.png', rightRoom.x + 166, rightRoom.y - 122, 2.0);

    const positions: Record<Owner, { x: number; y: number }> = {
      entrada: { x: leftRoom.x - 176, y: leftRoom.y + 72 },
      vera: { x: leftRoom.x - 18, y: leftRoom.y + 34 },
      cris: { x: rightRoom.x - 30, y: rightRoom.y + 48 },
      decision: { x: rightRoom.x + 150, y: rightRoom.y - 24 },
    };
    const taskPositions: Record<Owner, { x: number; y: number }> = {
      entrada: { x: positions.entrada.x + 16, y: positions.entrada.y + 30 },
      vera: { x: positions.vera.x + 76, y: positions.vera.y + 12 },
      cris: { x: positions.cris.x + 86, y: positions.cris.y + 0 },
      decision: { x: positions.decision.x + 36, y: positions.decision.y + 58 },
    };

    // Muebles propios por habitación: recepción operativa para Vera, oficina técnica para Cris.
    addIsoAsset(stage, 'rug03.png', positions.entrada.x + 22, positions.entrada.y + 18, 2.2, 0.96);
    addIsoAsset(stage, 'rack04.png', positions.entrada.x - 18, positions.entrada.y + 2, 2.15);
    addIsoAsset(stage, 'telephone.png', positions.entrada.x + 44, positions.entrada.y - 20, 2.1);
    addIsoAsset(stage, 'plant01.png', leftRoom.x - 190, leftRoom.y + 122, 2.0);

    addIsoAsset(stage, 'rug01.png', positions.vera.x + 8, positions.vera.y + 62, 2.35, 0.96);
    addIsoAsset(stage, 'officedesk01norm.png', positions.vera.x + 4, positions.vera.y + 30, 2.48);
    addIsoAsset(stage, 'officeChair01_back.png', positions.vera.x - 26, positions.vera.y + 42, 2.28, 0.95);
    addIsoAsset(stage, 'laptop.png', positions.vera.x + 12, positions.vera.y - 4, 2.25);
    addIsoAsset(stage, 'bookshelf08.png', leftRoom.x + 124, leftRoom.y - 44, 2.18);
    addIsoAsset(stage, 'paper.png', leftRoom.x + 96, leftRoom.y + 56, 2.0);

    addIsoAsset(stage, 'officedesk02big.png', positions.cris.x + 18, positions.cris.y + 36, 2.62);
    addIsoAsset(stage, 'computer02.png', positions.cris.x + 20, positions.cris.y - 4, 2.48);
    addIsoAsset(stage, 'officeChair01.png', positions.cris.x - 26, positions.cris.y + 42, 2.28, 0.95);
    addIsoAsset(stage, 'bookshelf01.png', rightRoom.x - 136, rightRoom.y - 64, 2.18);
    addIsoAsset(stage, 'drawer05.png', rightRoom.x + 34, rightRoom.y + 112, 2.25);
    addIsoAsset(stage, 'plant04.png', rightRoom.x + 224, rightRoom.y + 94, 2.0);

    // Zona roja: queda físicamente al fondo/derecha de la oficina técnica, separada de la mesa de Cris.
    const redZone = new Graphics();
    redZone.poly([
      positions.decision.x - 78, positions.decision.y + 18,
      positions.decision.x + 2, positions.decision.y - 24,
      positions.decision.x + 104, positions.decision.y + 26,
      positions.decision.x + 20, positions.decision.y + 82,
    ]).fill({ color: 0x5a1717, alpha: 0.52 }).stroke({ width: 3, color: 0xff5d5d, alpha: 0.65 });
    stage.addChild(redZone);
    addIsoAsset(stage, 'armchair.png', positions.decision.x - 42, positions.decision.y + 66, 2.32);
    addIsoAsset(stage, 'drawer05.png', positions.decision.x + 28, positions.decision.y + 36, 2.35);
    addIsoAsset(stage, 'pinnednote01.png', positions.decision.x + 58, positions.decision.y - 36, 2.1);

    // Caminos en diagonal suave: entrada → Vera → Cris → decisiones, sin tubería recta.
    const paths = new Graphics();
    const pathPairs: [Owner, Owner][] = [['entrada', 'vera'], ['vera', 'cris'], ['cris', 'decision']];
    pathPairs.forEach(([from, to]) => {
      const a = positions[from];
      const b = positions[to];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 - 28;
      paths.moveTo(a.x, a.y + 18);
      paths.quadraticCurveTo(mx, my, b.x, b.y + 18);
    });
    paths.stroke({ width: 4, color: 0xffe0a8, alpha: 0.22 });
    stage.addChild(paths);

    const activeOwners = new Set(tasks.flatMap((task) => [task.reactingOwner, task.status === 'trabajando' || task.status === 'bloqueado' ? task.owner : undefined]).filter(Boolean) as Owner[]);

    if (activeOwners.has('decision')) {
      const decisionPulse = new Graphics();
      decisionPulse.poly([
        positions.decision.x + 26, positions.decision.y + 6,
        positions.decision.x + 90, positions.decision.y + 38,
        positions.decision.x + 28, positions.decision.y + 72,
        positions.decision.x - 38, positions.decision.y + 38,
      ]).stroke({ width: 5, color: 0xff5d5d, alpha: 0.8 });
      stage.addChild(decisionPulse);
    }

    // Etiquetas pequeñas integradas, solo para orientar.
    const smallLabels = [
      ['Recepción Vera', leftRoom.x - 40, leftRoom.y - 112, 0x2f9fd7, 118],
      ['Pasillo tareas', corridor.x + 26, corridor.y - 54, 0xffe0a8, 110],
      ['Oficina Cris', rightRoom.x + 8, rightRoom.y - 142, 0xffa94d, 112],
      ['Decisiones humanas', positions.decision.x + 18, positions.decision.y - 48, 0xff5d5d, 138],
    ] as const;
    smallLabels.forEach(([label, x, y, color, width]) => {
      const tag = new Graphics();
      tag.roundRect(x - width / 2, y - 13, width, 26, 9).fill({ color, alpha: 0.72 }).stroke({ width: 1, color: 0xffffff, alpha: 0.38 });
      stage.addChild(tag);
      const text = new Text({ text: label, style: { fill: '#ffffff', fontSize: 10, fontWeight: '900' } });
      text.anchor.set(0.5);
      text.position.set(x, y + 1);
      stage.addChild(text);
    });

    const agents = [
      ['Vera', 'vera_worker.png', positions.vera.x - 18, positions.vera.y + 34, 'vera'],
      ['Cris', 'cris_worker.png', positions.cris.x - 10, positions.cris.y + 38, 'cris'],
    ] as const;
    const agentBodies: { body: Container; glow: Graphics; active: boolean; baseX: number; baseY: number; baseScale: number; phase: number }[] = [];
    agents.forEach(([name, file, x, y, owner], idx) => {
      const active = activeOwners.has(owner);
      const glow = new Graphics();
      glow.ellipse(x, y + 4, active ? 36 : 26, active ? 14 : 8).fill({ color: owner === 'vera' ? 0x2f9fd7 : 0xffca7a, alpha: active ? 0.28 : 0.12 });
      stage.addChild(glow);
      const body = new Container();
      const sprite = Sprite.from(`${assetBase}/${file}`);
      sprite.anchor.set(0.5, 1);
      const baseScale = owner === 'vera' ? 2.75 : 2.55;
      sprite.scale.set(baseScale);
      body.addChild(sprite);
      body.position.set(x, y);
      stage.addChild(body);
      agentBodies.push({ body, glow, active, baseX: x, baseY: y, baseScale, phase: idx * 1.7 });
      const nameText = new Text({ text: name, style: { fill: '#fff7e6', fontSize: 12, fontWeight: '800' } });
      nameText.anchor.set(0.5);
      nameText.position.set(x, y + 18);
      stage.addChild(nameText);
    });

    const movingSprites: { card: Graphics; icon: Text; label: Text; from: { x: number; y: number }; to: { x: number; y: number }; started: number }[] = [];

    tasks.forEach((task, index) => {
      const pos = taskPositions[task.owner];
      const slotX = (index % 3) * 20 - 20;
      const slotY = Math.floor(index / 3) * 18;
      const from = task.fromOwner ? taskPositions[task.fromOwner] : pos;
      const x = (task.fromOwner ? from.x : pos.x) + slotX;
      const y = (task.fromOwner ? from.y : pos.y) + slotY;
      const meta = kindMeta[task.kind];

      const shadow = new Graphics();
      shadow.ellipse(x, y + 14, 26, 7).fill({ color: 0x000000, alpha: 0.22 });
      stage.addChild(shadow);

      // Objeto físico pequeño dentro de la habitación.
      const card = new Graphics();
      if (task.status === 'bloqueado') {
        card.roundRect(x - 34, y - 20, 68, 40, 8).fill(0xd34a3f).stroke({ width: selectedId === task.id ? 3 : 2, color: 0xffe0d6 });
      } else if (task.status === 'resuelto') {
        card.roundRect(x - 33, y - 19, 66, 38, 8).fill(0x56d364).stroke({ width: selectedId === task.id ? 3 : 2, color: 0xe6ffed });
      } else {
        card.roundRect(x - 33, y - 19, 66, 38, 8).fill(0xf0d6a3).stroke({ width: selectedId === task.id ? 3 : 2, color: meta.tint });
      }
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.on('pointertap', () => onSelect(task.id));
      stage.addChild(card);

      const text = new Text({ text: meta.icon, style: { fontSize: 16 } });
      text.anchor.set(0.5);
      text.position.set(x, y - 6);
      stage.addChild(text);

      const label = new Text({ text: task.status === 'bloqueado' ? 'DECISIÓN' : task.status === 'resuelto' ? 'OK' : meta.label, style: { fill: '#33220f', fontSize: 8, fontWeight: '900' } });
      label.anchor.set(0.5);
      label.position.set(x, y + 11);
      stage.addChild(label);

      if (task.pauseLabel) {
        const pause = new Text({ text: task.pauseLabel, style: { fill: '#fff4d6', fontSize: 12, fontWeight: '800', dropShadow: true } });
        pause.anchor.set(0.5);
        pause.position.set(x, y - 42);
        stage.addChild(pause);
      }
      if (task.fromOwner) {
        movingSprites.push({ card, icon: text, label, from: { x, y }, to: { x: pos.x + slotX, y: pos.y + slotY }, started: performance.now() });
      }
    });

    const flowDot = new Graphics();
    flowDot.circle(0, 0, 6).fill({ color: 0xfff0be, alpha: 0.9 }).stroke({ width: 2, color: 0xffffff, alpha: 0.8 });
    stage.addChild(flowDot);

    app.ticker.add(() => {
      const t = performance.now();
      agentBodies.forEach(({ body, glow, active, baseX, baseY, baseScale, phase }) => {
        const idle = Math.sin(t / 260 + phase);
        const work = Math.sin(t / 95 + phase);
        body.x = baseX + idle * 1.2;
        body.y = baseY + idle * 3.2 + (active ? work * 3.8 : 0);
        body.rotation = Math.sin(t / 360 + phase) * 0.025 + (active ? Math.sin(t / 140 + phase) * 0.018 : 0);
        body.scale.set(1 + Math.sin(t / 310 + phase) * 0.025);
        glow.alpha = active ? 0.85 + Math.sin(t / 120 + phase) * 0.15 : 0.48 + Math.sin(t / 420 + phase) * 0.12;
        glow.scale.set(active ? 1.08 + Math.sin(t / 150 + phase) * 0.08 : 1 + Math.sin(t / 520 + phase) * 0.05);
      });
      const route = [positions.entrada, positions.vera, positions.cris, positions.decision];
      const loop = (t / 1800) % 3;
      const seg = Math.floor(loop);
      const local = loop - seg;
      const a = route[seg];
      const b = route[seg + 1];
      const eased = 0.5 - Math.cos(local * Math.PI) / 2;
      flowDot.position.set(a.x + (b.x - a.x) * eased, a.y + 18 + (b.y - a.y) * eased + Math.sin(local * Math.PI) * -22);
      flowDot.alpha = 0.35 + Math.sin(t / 180) * 0.25;
      movingSprites.forEach((sprite) => {
        const progress = Math.min(1, (t - sprite.started) / 820);
        const eased = 1 - Math.pow(1 - progress, 3);
        const x = sprite.from.x + (sprite.to.x - sprite.from.x) * eased;
        const y = sprite.from.y + (sprite.to.y - sprite.from.y) * eased + Math.sin(progress * Math.PI) * -18;
        sprite.card.position.set(x - sprite.from.x, y - sprite.from.y);
        sprite.icon.position.set(x, y - 6);
        sprite.label.position.set(x, y + 11);
      });
    });
  });

  return () => {
    destroyed = true;
    app.destroy(true, { children: true });
  };
}

function describeEvent(task: OfficeTask) {
  if (task.owner === 'entrada') return `Vera recoge y clasifica: ${task.title}`;
  if (task.owner === 'vera') return `Vera deriva a Cris: ${task.title}`;
  if (task.owner === 'cris') return task.id % 3 === 0 ? `Cris se bloquea y pide decisión: ${task.title}` : `Cris resuelve: ${task.title}`;
  return `David desbloquea y cierra: ${task.title}`;
}

function nextStatus(task: OfficeTask): OfficeTask {
  if (task.owner === 'entrada') return { ...task, fromOwner: 'entrada', reactingOwner: 'vera', pauseLabel: 'clasificando…', owner: 'vera', status: 'trabajando', detail: 'Vera está clasificando el mensaje.' };
  if (task.owner === 'vera') return { ...task, fromOwner: 'vera', reactingOwner: 'cris', pauseLabel: 'derivando…', owner: 'cris', status: 'trabajando', detail: 'Cris ejecuta diagnóstico técnico.' };
  if (task.owner === 'cris') {
    const blocked = task.id % 3 === 0;
    return { ...task, fromOwner: 'cris', reactingOwner: blocked ? 'decision' : 'cris', pauseLabel: blocked ? 'bloqueado' : 'resuelto', owner: blocked ? 'decision' : 'cris', status: blocked ? 'bloqueado' : 'resuelto', detail: blocked ? 'Necesita decisión humana de David.' : 'Cris dejó la tarea resuelta.' };
  }
  return { ...task, fromOwner: 'decision', reactingOwner: 'decision', pauseLabel: 'cerrado', status: 'resuelto', detail: 'David tomó la decisión y la tarea queda cerrada.' };
}

function App() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<OfficeTask[]>(initialTasks);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    { id: 1, text: 'Entra WhatsApp en recepción', status: 'esperando' as TaskStatus, at: nowTime() },
    { id: 2, text: 'Cris trabaja en bug técnico', status: 'trabajando' as TaskStatus, at: nowTime() },
    { id: 3, text: 'Una tarea queda resuelta', status: 'resuelto', at: nowTime() },
  ]);
  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) ?? tasks[0], [tasks, selectedId]);

  useEffect(() => {
    if (!sceneRef.current) return;
    return drawOffice(sceneRef.current, tasks, selectedId, setSelectedId);
  }, [tasks, selectedId]);

  function advance() {
    const task = tasks.find((item) => item.id === selectedId);
    if (!task) return;
    const next = nextStatus(task);
    setTasks((current) => current.map((item) => (item.id === task.id ? next : item)));
    setTimeline((current) => [
      { id: Date.now(), text: describeEvent(task), status: next.status, at: nowTime() },
      ...current,
    ].slice(0, 8));
    window.setTimeout(() => {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined } : item));
    }, 900);
  }


  function startWhatsAppFlow() {
    const id = Date.now();
    const flow: OfficeTask[] = [
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'esperando', owner: 'entrada', detail: 'Entra un WhatsApp nuevo por recepción.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'trabajando', fromOwner: 'entrada', reactingOwner: 'vera', pauseLabel: 'clasificando…', owner: 'vera', detail: 'Vera recoge el WhatsApp y lo clasifica.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'trabajando', fromOwner: 'vera', reactingOwner: 'cris', pauseLabel: 'diagnosticando…', owner: 'cris', detail: 'Vera lo deriva a Cris para resolución técnica.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'resuelto', fromOwner: 'cris', reactingOwner: 'cris', pauseLabel: 'resuelto', owner: 'cris', detail: 'Cris termina la tarea y deja tarjeta verde.' },
    ];
    const notes = [
      'Entra WhatsApp automático en recepción',
      'Vera recoge y clasifica el WhatsApp',
      'Vera deriva la tarea a Cris',
      'Cris resuelve y deja tarjeta verde',
    ];
    setSelectedId(id);
    flow.forEach((snapshot, step) => {
      window.setTimeout(() => {
        setTasks((current) => {
          const exists = current.some((task) => task.id === id);
          return exists ? current.map((task) => task.id === id ? snapshot : task) : [...current, snapshot];
        });
        setTimeline((current) => [
          { id: Date.now() + step, text: notes[step], status: snapshot.status, at: nowTime() },
          ...current,
        ].slice(0, 8));
        window.setTimeout(() => {
          setTasks((current) => current.map((task) => task.id === id ? { ...task, fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined } : task));
        }, 950);
      }, step * 1250);
    });
  }


  function startBlockedFlow() {
    const id = Date.now();
    const flow: OfficeTask[] = [
      { id, title: 'WhatsApp bloqueado', kind: 'whatsapp', status: 'esperando', owner: 'entrada', detail: 'Entra un WhatsApp que acabará necesitando decisión humana.' },
      { id, title: 'WhatsApp bloqueado', kind: 'whatsapp', status: 'trabajando', fromOwner: 'entrada', reactingOwner: 'vera', pauseLabel: 'clasificando…', owner: 'vera', detail: 'Vera clasifica el mensaje y detecta que es técnico.' },
      { id, title: 'WhatsApp bloqueado', kind: 'whatsapp', status: 'trabajando', fromOwner: 'vera', reactingOwner: 'cris', pauseLabel: 'diagnosticando…', owner: 'cris', detail: 'Cris analiza la tarea, pero falta una decisión de David.' },
      { id, title: 'Necesita decisión', kind: 'decision', status: 'bloqueado', fromOwner: 'cris', reactingOwner: 'decision', pauseLabel: 'necesita decisión', owner: 'decision', detail: 'Bloqueado: necesita decisión de David antes de continuar.' },
    ];
    const notes = [
      'Entra tarea que puede bloquearse',
      'Vera clasifica la tarea',
      'Vera deriva a Cris',
      'Cris bloquea: necesita decisión de David',
    ];
    setSelectedId(id);
    flow.forEach((snapshot, step) => {
      window.setTimeout(() => {
        setTasks((current) => {
          const exists = current.some((task) => task.id === id);
          return exists ? current.map((task) => task.id === id ? snapshot : task) : [...current, snapshot];
        });
        setTimeline((current) => [
          { id: Date.now() + step, text: notes[step], status: snapshot.status, at: nowTime() },
          ...current,
        ].slice(0, 8));
        if (step < flow.length - 1) {
          window.setTimeout(() => {
            setTasks((current) => current.map((task) => task.id === id ? { ...task, fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined } : task));
          }, 950);
        }
      }, step * 1250);
    });
  }

  function addTask(kind: OfficeTask['kind']) {
    const id = Date.now();
    const title = kind === 'whatsapp' ? 'WhatsApp entrante' : kind === 'email' ? 'Email nuevo' : kind === 'bug' ? 'Bug servidor' : 'Decisión pendiente';
    setTasks((current) => [
      ...current,
      { id, title, kind, status: 'esperando', owner: 'entrada', detail: 'Nueva tarea simulada entrando en la oficina.' },
    ]);
    setTimeline((current) => [
      { id, text: `Nueva tarea entra en recepción: ${title}`, status: 'esperando' as TaskStatus, at: nowTime() },
      ...current,
    ].slice(0, 8));
    setSelectedId(id);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Demo operativa</p>
          <h1>Oficina IA · Vera & Cris</h1>
        </div>
        <div className="actions">
          <button onClick={() => addTask('whatsapp')}>+ WhatsApp</button>
          <button onClick={() => addTask('email')}>+ Email</button>
          <button onClick={() => addTask('bug')}>+ Bug</button>
          <button className="primary small" onClick={startWhatsAppFlow}>Simular flujo WhatsApp</button>
          <button className="danger small" onClick={startBlockedFlow}>Simular flujo bloqueado</button>
        </div>
      </header>
      <section className="layout">
        <div className="scene" ref={sceneRef} />
        <aside className="panel">
          <p className="eyebrow">Tarea seleccionada</p>
          <h2>{selected?.title ?? 'Sin tarea'}</h2>
          {selected && (
            <>
              <div className={`pill ${selected.status}`}>{statusText[selected.status]}</div>
              <p>{selected.detail}</p>
              <dl>
                <dt>Responsable</dt><dd>{selected.owner}</dd>
                <dt>Tipo</dt><dd>{selected.kind}</dd>
              </dl>
              <button className="primary" onClick={advance}>Avanzar evento</button>
            </>
          )}
          <hr />
          <p className="eyebrow">Consola natural</p>
          <input placeholder="Ej: Cris, prioriza esto" onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const instruction = e.currentTarget.value;
              setTasks((current) => current.map((task) => task.id === selectedId ? { ...task, status: 'trabajando', detail: `Instrucción recibida: ${instruction}` } : task));
              setTimeline((current) => [
                { id: Date.now(), text: `Instrucción: ${instruction}`, status: 'trabajando' as TaskStatus, at: nowTime() },
                ...current,
              ].slice(0, 8));
              e.currentTarget.value = '';
            }
          }} />
          <section className="legend">
            <p className="eyebrow">Leyenda</p>
            {(['esperando', 'trabajando', 'bloqueado', 'resuelto'] as TaskStatus[]).map((status) => (
              <span key={status}><i className={status} />{statusText[status]}</span>
            ))}
          </section>
          <section className="timeline">
            <p className="eyebrow">Timeline</p>
            {timeline.map((event) => (
              <article key={event.id}>
                <i className={event.status} />
                <div><strong>{event.at}</strong><p>{event.text}</p></div>
              </article>
            ))}
          </section>
          <p className="hint">Primer objetivo: entender la operación en 30 segundos, sin leer logs.</p>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
