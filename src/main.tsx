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

const assetBase = '/assets/kenney-isometric/Angle';
const usedIsoAssetFiles = [
  'floorCarpet_N.png', 'floorCarpet_S.png', 'floorCarpetEnd_W.png', 'floorCarpetSmall_N.png',
  'wallBooks_N.png', 'wallDoorway_N.png', 'wallBooks_E.png', 'wallDoorway_E.png', 'wallBooks_W.png',
  'bookcaseWideBooks_N.png', 'bookcaseWideBooks_E.png', 'bookcaseBooksLadder_N.png', 'candleStandDouble_N.png',
  'bookStand_N.png', 'longTableChairs_W.png', 'longTableDecoratedChairsBooks_N.png', 'displayCaseOpen_N.png',
  'libraryChair_N.png', 'libraryChair_E.png',
];

function addIsoAsset(stage: Container, file: string, x: number, y: number, scale = 0.72, alpha = 1) {
  const sprite = Sprite.from(`${assetBase}/${file}`);
  sprite.anchor.set(0.5, 0.82);
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
    const cy = app.renderer.height / 2 + 105;

    // Habitación continua. La geometría manual queda como base/sombra mínima;
    // el peso visual lo ponen los tiles reales del pack Kenney.
    const roomShadow = new Graphics();
    roomShadow.poly([
      cx, cy - 205,
      cx + 360, cy - 24,
      cx + 250, cy + 178,
      cx - 350, cy + 178,
      cx - 430, cy - 12,
    ]).fill({ color: 0x2b1d13, alpha: 0.42 });
    stage.addChild(roomShadow);

    const floor = new Graphics();
    floor.poly([
      cx, cy - 196,
      cx + 333, cy - 28,
      cx + 238, cy + 156,
      cx - 326, cy + 156,
      cx - 402, cy - 10,
    ]).fill(0xcfa56a).stroke({ width: 2, color: 0x6c4b2d, alpha: 0.35 });
    stage.addChild(floor);

    // Suelo/caminos: alfombras Kenney, no badges flotantes.
    addIsoAsset(stage, 'floorCarpet_N.png', cx - 218, cy + 34, 0.54, 0.96);
    addIsoAsset(stage, 'floorCarpet_N.png', cx - 86, cy + 6, 0.54, 0.96);
    addIsoAsset(stage, 'floorCarpet_S.png', cx + 52, cy + 30, 0.56, 0.96);
    addIsoAsset(stage, 'floorCarpet_S.png', cx + 170, cy + 66, 0.5, 0.94);
    addIsoAsset(stage, 'floorCarpetEnd_W.png', cx + 250, cy + 94, 0.46, 0.93);
    addIsoAsset(stage, 'floorCarpetSmall_N.png', cx - 10, cy + 104, 0.5, 0.92);

    // Paredes del pack canónico: wallBooks/wallDoorway sustituyen la pared dibujada.
    addIsoAsset(stage, 'wallBooks_N.png', cx - 238, cy - 92, 0.7);
    addIsoAsset(stage, 'wallBooks_N.png', cx - 92, cy - 126, 0.7);
    addIsoAsset(stage, 'wallDoorway_N.png', cx + 54, cy - 126, 0.7);
    addIsoAsset(stage, 'wallBooks_N.png', cx + 190, cy - 92, 0.7);
    addIsoAsset(stage, 'wallBooks_E.png', cx + 272, cy - 12, 0.68);
    addIsoAsset(stage, 'wallDoorway_E.png', cx + 232, cy + 72, 0.68);
    addIsoAsset(stage, 'wallBooks_W.png', cx - 330, cy - 2, 0.64);

    // Biblioteca/mobiliario pegado a paredes y mesas reales.
    addIsoAsset(stage, 'bookcaseWideBooks_N.png', cx - 236, cy - 58, 0.5);
    addIsoAsset(stage, 'bookcaseWideBooks_E.png', cx + 270, cy + 28, 0.48);
    addIsoAsset(stage, 'bookcaseBooksLadder_N.png', cx - 12, cy - 72, 0.46);
    addIsoAsset(stage, 'candleStandDouble_N.png', cx + 150, cy - 58, 0.42);

    const positions: Record<Owner, { x: number; y: number }> = {
      entrada: { x: cx - 236, y: cy + 66 },
      vera: { x: cx - 112, y: cy + 12 },
      cris: { x: cx + 76, y: cy + 14 },
      decision: { x: cx + 220, y: cy + 84 },
    };

    // Mobiliario real de cada zona.
    addIsoAsset(stage, 'bookStand_N.png', positions.entrada.x, positions.entrada.y + 18, 0.46);
    addIsoAsset(stage, 'longTableChairs_W.png', positions.vera.x, positions.vera.y + 24, 0.48);
    addIsoAsset(stage, 'longTableDecoratedChairsBooks_N.png', positions.cris.x, positions.cris.y + 24, 0.48);
    addIsoAsset(stage, 'displayCaseOpen_N.png', positions.decision.x, positions.decision.y + 20, 0.46);

    // Caminos sutiles: narrativa, no UI de dashboard.
    const paths = new Graphics();
    const pathPairs: [Owner, Owner][] = [['entrada', 'vera'], ['vera', 'cris'], ['cris', 'decision']];
    pathPairs.forEach(([from, to]) => {
      paths.moveTo(positions[from].x, positions[from].y);
      paths.lineTo(positions[to].x, positions[to].y);
    });
    paths.stroke({ width: 4, color: 0x6c4b2d, alpha: 0.25 });
    stage.addChild(paths);

    const activeOwners = new Set(tasks.flatMap((task) => [task.reactingOwner, task.status === 'trabajando' || task.status === 'bloqueado' ? task.owner : undefined]).filter(Boolean) as Owner[]);

    if (activeOwners.has('decision')) {
      const decisionPulse = new Graphics();
      decisionPulse.poly([
        positions.decision.x, positions.decision.y - 38,
        positions.decision.x + 78, positions.decision.y,
        positions.decision.x, positions.decision.y + 38,
        positions.decision.x - 78, positions.decision.y,
      ]).stroke({ width: 5, color: 0xff5d5d, alpha: 0.78 });
      stage.addChild(decisionPulse);
    }

    // Etiquetas pequeñas integradas, solo para orientar.
    const smallLabels = [
      ['Entrada', positions.entrada.x, positions.entrada.y - 46, 0xf4c542],
      ['Vera', positions.vera.x, positions.vera.y - 52, 0x8dd7ff],
      ['Cris', positions.cris.x, positions.cris.y - 52, 0xffca7a],
      ['Decisiones', positions.decision.x, positions.decision.y - 46, 0xff5d5d],
    ] as const;
    smallLabels.forEach(([label, x, y, color]) => {
      const tag = new Graphics();
      tag.roundRect(x - 38, y - 12, 76, 24, 9).fill({ color, alpha: 0.68 }).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
      stage.addChild(tag);
      const text = new Text({ text: label, style: { fill: '#ffffff', fontSize: 10, fontWeight: '800' } });
      text.anchor.set(0.5);
      text.position.set(x, y + 1);
      stage.addChild(text);
    });

    const agents = [
      ['Vera', positions.vera.x - 10, positions.vera.y - 10, 0x2f9fd7, 0xffffff, 'vera'],
      ['Cris', positions.cris.x + 10, positions.cris.y - 10, 0xb66a2c, 0xffe0b2, 'cris'],
    ] as const;
    const agentBodies: { body: Container; active: boolean; baseY: number }[] = [];
    agents.forEach(([name, x, y, color, accent, owner]) => {
      const active = activeOwners.has(owner);
      const glow = new Graphics();
      glow.ellipse(x, y + 12, active ? 26 : 0, active ? 12 : 0).fill({ color, alpha: active ? 0.2 : 0 });
      stage.addChild(glow);
      addIsoAsset(stage, owner === 'vera' ? 'libraryChair_N.png' : 'libraryChair_E.png', x + (owner === 'vera' ? -12 : 16), y + 36, 0.26, 0.92);

      // Fallback documentado: el pack canónico no trae personajes. Evitamos los
      // círculos/rectángulos crudos y usamos una silueta isométrica temporal.
      const body = new Container();
      const shadow = new Graphics();
      shadow.ellipse(0, 38, 22, 8).fill({ color: 0x000000, alpha: 0.28 });
      body.addChild(shadow);
      const legs = new Graphics();
      legs.poly([-13, 24, -2, 30, -7, 46, -20, 39]).fill(0x2b3445);
      legs.poly([7, 26, 19, 31, 13, 47, 1, 39]).fill(0x243044);
      body.addChild(legs);
      const torso = new Graphics();
      torso.poly([-24, 4, 0, -8, 25, 4, 16, 31, -15, 31]).fill(color).stroke({ width: active ? 4 : 2, color: accent, alpha: active ? 0.9 : 0.55 });
      torso.poly([-22, 5, -32, 22, -20, 27, -10, 10]).fill(0x1f2937);
      torso.poly([22, 5, 32, 22, 20, 27, 10, 10]).fill(0x1f2937);
      body.addChild(torso);
      const head = new Graphics();
      head.ellipse(0, -24, 15, 18).fill(0xf3c7a5).stroke({ width: 2, color: 0x5b3526, alpha: 0.55 });
      head.poly([-15, -31, -3, -44, 14, -33, 10, -24, -12, -24]).fill(owner === 'vera' ? 0x153c63 : 0x4a2a16);
      head.circle(-5, -24, 2.2).fill(0x10151f);
      head.circle(6, -24, 2.2).fill(0x10151f);
      body.addChild(head);
      const badge = new Text({ text: owner === 'vera' ? 'V' : 'C', style: { fill: '#ffffff', fontSize: 11, fontWeight: '900' } });
      badge.anchor.set(0.5);
      badge.position.set(0, 13);
      body.addChild(badge);
      body.position.set(x, y);
      body.scale.set(0.72);
      stage.addChild(body);
      agentBodies.push({ body, active, baseY: y });
      const nameText = new Text({ text: name, style: { fill: '#fff7e6', fontSize: 12, fontWeight: '800' } });
      nameText.anchor.set(0.5);
      nameText.position.set(x, y + 44);
      stage.addChild(nameText);
    });

    const movingSprites: { card: Graphics; icon: Text; label: Text; from: { x: number; y: number }; to: { x: number; y: number }; started: number }[] = [];

    tasks.forEach((task, index) => {
      const pos = positions[task.owner];
      const slotX = (index % 3) * 24 - 24;
      const slotY = Math.floor(index / 3) * 22;
      const from = task.fromOwner ? positions[task.fromOwner] : pos;
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

    app.ticker.add(() => {
      const t = performance.now();
      agentBodies.forEach(({ body, active, baseY }, idx) => {
        body.y = baseY + (active ? Math.sin(t / 115 + idx) * 4 : 0);
      });
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
