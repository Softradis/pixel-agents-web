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

  app.init({ resizeTo: canvas, background: '#07111f', antialias: true }).then(() => {
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
    const cy = app.renderer.height / 2 + 40;

    isoTile(root, cx - 210, cy - 90, 220, 120, 0x12334d);
    isoTile(root, cx + 40, cy - 90, 220, 120, 0x17324a);
    isoTile(root, cx - 85, cy + 65, 260, 130, 0x102a3f);
    isoTile(root, cx + 190, cy + 65, 210, 105, 0x2b213d);

    addIsoAsset(stage, 'floorCarpet_N.png', cx - 210, cy - 58, 0.7, 0.9);
    addIsoAsset(stage, 'floorCarpet_S.png', cx + 40, cy - 58, 0.7, 0.9);
    addIsoAsset(stage, 'longTableDecoratedChairsBooks_N.png', cx + 40, cy - 40, 0.62);
    addIsoAsset(stage, 'bookcaseWideBooks_N.png', cx + 42, cy - 124, 0.55);
    addIsoAsset(stage, 'longTableChairs_W.png', cx - 210, cy - 40, 0.58);
    addIsoAsset(stage, 'bookStand_N.png', cx - 116, cy + 80, 0.55);
    addIsoAsset(stage, 'displayCaseOpen_N.png', cx + 190, cy + 74, 0.58);

    const labels = [
      ['Recepción Vera', cx - 210, cy - 165],
      ['Mesa Cris', cx + 40, cy - 165],
      ['Bandeja entrada', cx - 85, cy - 15],
      ['Decisiones David', cx + 190, cy + 5],
    ] as const;
    labels.forEach(([label, x, y]) => {
      const t = new Text({ text: label, style: { fill: '#dbeafe', fontSize: 15, fontWeight: '700' } });
      t.anchor.set(0.5);
      t.position.set(x, y);
      stage.addChild(t);
    });

    const positions: Record<Owner, { x: number; y: number }> = {
      entrada: { x: cx - 85, y: cy + 55 },
      vera: { x: cx - 210, y: cy - 65 },
      cris: { x: cx + 40, y: cy - 65 },
      decision: { x: cx + 190, y: cy + 55 },
    };

    const paths = new Graphics();
    const pathPairs: [Owner, Owner][] = [['entrada', 'vera'], ['vera', 'cris'], ['cris', 'decision']];
    pathPairs.forEach(([from, to]) => {
      paths.moveTo(positions[from].x, positions[from].y);
      paths.lineTo(positions[to].x, positions[to].y);
    });
    paths.stroke({ width: 4, color: 0x8fb5d9, alpha: 0.22 });
    stage.addChild(paths);

    const activeOwners = new Set(tasks.flatMap((task) => [task.reactingOwner, task.status === 'trabajando' || task.status === 'bloqueado' ? task.owner : undefined]).filter(Boolean) as Owner[]);
    const agents = [
      ['Vera', positions.vera.x, positions.vera.y - 30, 0x8dd7ff, 'vera'],
      ['Cris', positions.cris.x, positions.cris.y - 30, 0xffca7a, 'cris'],
    ] as const;
    const agentBodies: { body: Graphics; active: boolean }[] = [];
    agents.forEach(([name, x, y, color, owner]) => {
      const active = activeOwners.has(owner);
      const deskAsset = owner === 'vera' ? 'libraryChair_N.png' : 'libraryChair_E.png';
      addIsoAsset(stage, deskAsset, x + (owner === 'vera' ? -32 : 34), y + 36, 0.42, 0.95);
      const glow = new Graphics();
      glow.circle(x, y + 12, active ? 36 : 0).fill({ color, alpha: active ? 0.16 : 0 });
      stage.addChild(glow);
      const body = new Graphics();
      body.circle(x, y - 15, 16).fill(color);
      body.roundRect(x - 20, y + 2, 40, 34, 10).fill(color).stroke({ width: active ? 4 : 2, color: active ? 0xffffff : 0xffffff, alpha: active ? 0.8 : 0.45 });
      stage.addChild(body);
      agentBodies.push({ body, active });
      const nameText = new Text({ text: active ? `${name} · activo` : name, style: { fill: '#ffffff', fontSize: 13, fontWeight: '700' } });
      nameText.anchor.set(0.5);
      nameText.position.set(x, y + 55);
      stage.addChild(nameText);
    });

    if (activeOwners.has('decision')) {
      const decisionPulse = new Graphics();
      decisionPulse.roundRect(positions.decision.x - 80, positions.decision.y - 44, 160, 88, 18)
        .stroke({ width: 5, color: 0xff5d5d, alpha: 0.75 });
      stage.addChild(decisionPulse);
    }

    const movingSprites: { card: Graphics; icon: Text; from: { x: number; y: number }; to: { x: number; y: number }; started: number }[] = [];

    tasks.forEach((task, index) => {
      const pos = positions[task.owner];
      const slotX = (index % 3) * 34 - 34;
      const slotY = Math.floor(index / 3) * 32;
      const from = task.fromOwner ? positions[task.fromOwner] : pos;
      const x = (task.fromOwner ? from.x : pos.x) + slotX;
      const y = (task.fromOwner ? from.y : pos.y) + slotY;
      const shadow = new Graphics();
      shadow.ellipse(x, y + 18, 42, 10).fill({ color: 0x000000, alpha: 0.18 });
      stage.addChild(shadow);
      const card = new Graphics();
      card.roundRect(x - 42, y - 22, 84, 44, 10).fill(colors[task.status]).stroke({ width: selectedId === task.id ? 4 : 2, color: selectedId === task.id ? 0xffffff : 0x0b1220 });
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.on('pointertap', () => onSelect(task.id));
      stage.addChild(card);

      const icon = task.kind === 'whatsapp' ? '💬' : task.kind === 'email' ? '✉️' : task.kind === 'bug' ? '⚡' : '❔';
      const text = new Text({ text: icon, style: { fontSize: 22 } });
      text.anchor.set(0.5);
      text.position.set(x, y - 2);
      stage.addChild(text);
      if (task.pauseLabel) {
        const pause = new Text({ text: task.pauseLabel, style: { fill: '#ffffff', fontSize: 12, fontWeight: '700', dropShadow: true } });
        pause.anchor.set(0.5);
        pause.position.set(x, y - 38);
        stage.addChild(pause);
      }
      if (task.fromOwner) {
        movingSprites.push({ card, icon: text, from: { x, y }, to: { x: pos.x + slotX, y: pos.y + slotY }, started: performance.now() });
      }
    });

    app.ticker.add(() => {
      const t = performance.now();
      agentBodies.forEach(({ body, active }, idx) => {
        body.y = active ? Math.sin(t / 115 + idx) * 4 : 0;
      });
      movingSprites.forEach((sprite) => {
        const progress = Math.min(1, (t - sprite.started) / 750);
        const eased = 1 - Math.pow(1 - progress, 3);
        const x = sprite.from.x + (sprite.to.x - sprite.from.x) * eased;
        const y = sprite.from.y + (sprite.to.y - sprite.from.y) * eased + Math.sin(progress * Math.PI) * -18;
        sprite.card.position.set(x - sprite.from.x, y - sprite.from.y);
        sprite.icon.position.set(x, y - 2);
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
