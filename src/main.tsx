import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
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

  app.init({ resizeTo: canvas, background: '#10151f', antialias: true }).then(() => {
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
    const cy = app.renderer.height / 2 + 90;

    // Habitación continua, no zonas flotantes.
    const floor = new Graphics();
    floor.poly([
      cx, cy - 245,
      cx + 420, cy - 35,
      cx + 300, cy + 205,
      cx - 420, cy + 205,
      cx - 520, cy - 20,
    ]).fill(0xd8b77b).stroke({ width: 4, color: 0x6c4b2d, alpha: 0.75 });
    stage.addChild(floor);

    // Alfombras/caminos integrados en el suelo.
    addIsoAsset(stage, 'floorCarpet_N.png', cx - 205, cy + 40, 0.85, 0.95);
    addIsoAsset(stage, 'floorCarpet_S.png', cx + 75, cy + 30, 0.85, 0.95);
    addIsoAsset(stage, 'floorCarpet_W.png', cx + 270, cy + 95, 0.72, 0.92);

    // Paredes reales: zócalo + altura visible, antes del mobiliario.
    const backWall = new Graphics();
    backWall.poly([
      cx - 425, cy - 24,
      cx, cy - 245,
      cx + 418, cy - 36,
      cx + 418, cy - 138,
      cx, cy - 348,
      cx - 425, cy - 126,
    ]).fill(0xcaa56c).stroke({ width: 4, color: 0x4f3522, alpha: 0.85 });
    stage.addChild(backWall);

    const leftWall = new Graphics();
    leftWall.poly([
      cx - 520, cy - 20,
      cx - 425, cy - 24,
      cx - 425, cy - 126,
      cx - 520, cy - 122,
    ]).fill(0xb98e58).stroke({ width: 4, color: 0x4f3522, alpha: 0.85 });
    stage.addChild(leftWall);

    const rightWall = new Graphics();
    rightWall.poly([
      cx + 418, cy - 36,
      cx + 300, cy + 205,
      cx + 300, cy + 103,
      cx + 418, cy - 138,
    ]).fill(0xb98e58).stroke({ width: 4, color: 0x4f3522, alpha: 0.85 });
    stage.addChild(rightWall);

    const wallTop = new Graphics();
    wallTop.poly([
      cx - 425, cy - 126,
      cx, cy - 348,
      cx + 418, cy - 138,
      cx, cy - 255,
    ]).fill(0x8f633e).stroke({ width: 3, color: 0x4f3522, alpha: 0.9 });
    stage.addChild(wallTop);

    // Biblioteca/mobiliario pegado a las paredes para que se lean como sala.
    addIsoAsset(stage, 'wallBooks_N.png', cx - 185, cy - 170, 0.95);
    addIsoAsset(stage, 'wallBooks_N.png', cx + 10, cy - 172, 0.95);
    addIsoAsset(stage, 'wallBooks_E.png', cx + 275, cy - 70, 0.95);
    addIsoAsset(stage, 'bookcaseWideBooks_N.png', cx - 305, cy - 104, 0.82);
    addIsoAsset(stage, 'bookcaseWideBooks_E.png', cx + 335, cy - 4, 0.78);

    const positions: Record<Owner, { x: number; y: number }> = {
      entrada: { x: cx - 300, y: cy + 78 },
      vera: { x: cx - 150, y: cy + 8 },
      cris: { x: cx + 95, y: cy + 8 },
      decision: { x: cx + 290, y: cy + 95 },
    };

    // Mobiliario real de cada zona.
    addIsoAsset(stage, 'bookStand_N.png', positions.entrada.x, positions.entrada.y + 25, 0.72);
    addIsoAsset(stage, 'longTableChairs_W.png', positions.vera.x, positions.vera.y + 30, 0.72);
    addIsoAsset(stage, 'longTableDecoratedChairsBooks_N.png', positions.cris.x, positions.cris.y + 30, 0.72);
    addIsoAsset(stage, 'displayCaseOpen_N.png', positions.decision.x, positions.decision.y + 28, 0.7);

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
        positions.decision.x, positions.decision.y - 50,
        positions.decision.x + 105, positions.decision.y,
        positions.decision.x, positions.decision.y + 50,
        positions.decision.x - 105, positions.decision.y,
      ]).stroke({ width: 5, color: 0xff5d5d, alpha: 0.78 });
      stage.addChild(decisionPulse);
    }

    // Etiquetas pequeñas integradas, solo para orientar.
    const smallLabels = [
      ['Entrada', positions.entrada.x, positions.entrada.y - 60, 0xf4c542],
      ['Vera', positions.vera.x, positions.vera.y - 70, 0x8dd7ff],
      ['Cris', positions.cris.x, positions.cris.y - 70, 0xffca7a],
      ['Decisiones', positions.decision.x, positions.decision.y - 62, 0xff5d5d],
    ] as const;
    smallLabels.forEach(([label, x, y, color]) => {
      const tag = new Graphics();
      tag.roundRect(x - 45, y - 14, 90, 28, 10).fill({ color, alpha: 0.68 }).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
      stage.addChild(tag);
      const text = new Text({ text: label, style: { fill: '#ffffff', fontSize: 12, fontWeight: '800' } });
      text.anchor.set(0.5);
      text.position.set(x, y + 1);
      stage.addChild(text);
    });

    const agents = [
      ['Vera', positions.vera.x - 20, positions.vera.y - 10, 0x8dd7ff, 'vera'],
      ['Cris', positions.cris.x + 15, positions.cris.y - 10, 0xffca7a, 'cris'],
    ] as const;
    const agentBodies: { body: Graphics; active: boolean }[] = [];
    agents.forEach(([name, x, y, color, owner]) => {
      const active = activeOwners.has(owner);
      const glow = new Graphics();
      glow.circle(x, y + 12, active ? 34 : 0).fill({ color, alpha: active ? 0.18 : 0 });
      stage.addChild(glow);
      addIsoAsset(stage, owner === 'vera' ? 'libraryChair_N.png' : 'libraryChair_E.png', x + (owner === 'vera' ? -18 : 22), y + 46, 0.38, 0.92);
      const body = new Graphics();
      body.circle(x, y - 18, 17).fill(color);
      body.roundRect(x - 22, y + 1, 44, 36, 12).fill(color).stroke({ width: active ? 4 : 2, color: 0xffffff, alpha: active ? 0.82 : 0.48 });
      body.circle(x + 7, y - 21, 3).fill(0x07111f);
      body.circle(x - 7, y - 21, 3).fill(0x07111f);
      stage.addChild(body);
      agentBodies.push({ body, active });
      const nameText = new Text({ text: name, style: { fill: '#fff7e6', fontSize: 12, fontWeight: '800' } });
      nameText.anchor.set(0.5);
      nameText.position.set(x, y + 55);
      stage.addChild(nameText);
    });

    const movingSprites: { card: Graphics; icon: Text; label: Text; from: { x: number; y: number }; to: { x: number; y: number }; started: number }[] = [];

    tasks.forEach((task, index) => {
      const pos = positions[task.owner];
      const slotX = (index % 3) * 30 - 30;
      const slotY = Math.floor(index / 3) * 28;
      const from = task.fromOwner ? positions[task.fromOwner] : pos;
      const x = (task.fromOwner ? from.x : pos.x) + slotX;
      const y = (task.fromOwner ? from.y : pos.y) + slotY;
      const meta = kindMeta[task.kind];

      const shadow = new Graphics();
      shadow.ellipse(x, y + 18, 36, 9).fill({ color: 0x000000, alpha: 0.22 });
      stage.addChild(shadow);

      // Objeto físico pequeño dentro de la habitación.
      const card = new Graphics();
      if (task.status === 'bloqueado') {
        card.roundRect(x - 44, y - 26, 88, 52, 10).fill(0xd34a3f).stroke({ width: selectedId === task.id ? 4 : 2, color: 0xffe0d6 });
      } else if (task.status === 'resuelto') {
        card.roundRect(x - 42, y - 24, 84, 48, 10).fill(0x56d364).stroke({ width: selectedId === task.id ? 4 : 2, color: 0xe6ffed });
      } else {
        card.roundRect(x - 42, y - 24, 84, 48, 10).fill(0xf0d6a3).stroke({ width: selectedId === task.id ? 4 : 2, color: meta.tint });
      }
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.on('pointertap', () => onSelect(task.id));
      stage.addChild(card);

      const text = new Text({ text: meta.icon, style: { fontSize: 22 } });
      text.anchor.set(0.5);
      text.position.set(x, y - 6);
      stage.addChild(text);

      const label = new Text({ text: task.status === 'bloqueado' ? 'DECISIÓN' : task.status === 'resuelto' ? 'OK' : meta.label, style: { fill: '#33220f', fontSize: 10, fontWeight: '900' } });
      label.anchor.set(0.5);
      label.position.set(x, y + 15);
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
      agentBodies.forEach(({ body, active }, idx) => {
        body.y = active ? Math.sin(t / 115 + idx) * 4 : 0;
      });
      movingSprites.forEach((sprite) => {
        const progress = Math.min(1, (t - sprite.started) / 820);
        const eased = 1 - Math.pow(1 - progress, 3);
        const x = sprite.from.x + (sprite.to.x - sprite.from.x) * eased;
        const y = sprite.from.y + (sprite.to.y - sprite.from.y) * eased + Math.sin(progress * Math.PI) * -18;
        sprite.card.position.set(x - sprite.from.x, y - sprite.from.y);
        sprite.icon.position.set(x, y - 6);
        sprite.label.position.set(x, y + 15);
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
