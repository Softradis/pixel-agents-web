import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Application, Container, Graphics, Text } from 'pixi.js';
import './style.css';

type TaskStatus = 'esperando' | 'trabajando' | 'bloqueado' | 'resuelto';
type Owner = 'entrada' | 'vera' | 'cris' | 'decision';

type OfficeTask = {
  id: number;
  title: string;
  kind: 'whatsapp' | 'email' | 'bug' | 'decision';
  status: TaskStatus;
  owner: Owner;
  detail: string;
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

const initialTasks: OfficeTask[] = [
  {
    id: 1,
    title: 'WhatsApp nuevo',
    kind: 'whatsapp',
    status: 'esperando',
    owner: 'entrada',
    detail: 'Mensaje entrante en recepción. Vera debe clasificarlo.',
  },
];

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

    const agents = [
      ['Vera', cx - 210, cy - 95, 0x8dd7ff],
      ['Cris', cx + 40, cy - 95, 0xffca7a],
    ] as const;
    agents.forEach(([name, x, y, color]) => {
      const body = new Graphics();
      body.circle(x, y - 15, 16).fill(color);
      body.roundRect(x - 20, y + 2, 40, 34, 10).fill(color).stroke({ width: 2, color: 0xffffff, alpha: 0.45 });
      stage.addChild(body);
      const nameText = new Text({ text: name, style: { fill: '#ffffff', fontSize: 13, fontWeight: '700' } });
      nameText.anchor.set(0.5);
      nameText.position.set(x, y + 55);
      stage.addChild(nameText);
    });

    const positions: Record<Owner, { x: number; y: number }> = {
      entrada: { x: cx - 85, y: cy + 55 },
      vera: { x: cx - 210, y: cy - 65 },
      cris: { x: cx + 40, y: cy - 65 },
      decision: { x: cx + 190, y: cy + 55 },
    };

    tasks.forEach((task, index) => {
      const pos = positions[task.owner];
      const x = pos.x + (index % 3) * 34 - 34;
      const y = pos.y + Math.floor(index / 3) * 32;
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
    });
  });

  return () => {
    destroyed = true;
    app.destroy(true, { children: true });
  };
}

function nextStatus(task: OfficeTask): OfficeTask {
  if (task.owner === 'entrada') return { ...task, owner: 'vera', status: 'trabajando', detail: 'Vera está clasificando el mensaje.' };
  if (task.owner === 'vera') return { ...task, owner: 'cris', status: 'trabajando', detail: 'Cris ejecuta diagnóstico técnico.' };
  if (task.owner === 'cris') {
    const blocked = task.id % 3 === 0;
    return { ...task, owner: blocked ? 'decision' : 'cris', status: blocked ? 'bloqueado' : 'resuelto', detail: blocked ? 'Necesita decisión humana de David.' : 'Cris dejó la tarea resuelta.' };
  }
  return { ...task, status: 'resuelto', detail: 'David tomó la decisión y la tarea queda cerrada.' };
}

function App() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<OfficeTask[]>(initialTasks);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) ?? tasks[0], [tasks, selectedId]);

  useEffect(() => {
    if (!sceneRef.current) return;
    return drawOffice(sceneRef.current, tasks, selectedId, setSelectedId);
  }, [tasks, selectedId]);

  function advance() {
    setTasks((current) => current.map((task) => (task.id === selectedId ? nextStatus(task) : task)));
  }

  function addTask(kind: OfficeTask['kind']) {
    const id = Date.now();
    const title = kind === 'whatsapp' ? 'WhatsApp entrante' : kind === 'email' ? 'Email nuevo' : kind === 'bug' ? 'Bug servidor' : 'Decisión pendiente';
    setTasks((current) => [
      ...current,
      { id, title, kind, status: 'esperando', owner: 'entrada', detail: 'Nueva tarea simulada entrando en la oficina.' },
    ]);
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
              setTasks((current) => current.map((task) => task.id === selectedId ? { ...task, status: 'trabajando', detail: `Instrucción recibida: ${e.currentTarget.value}` } : task));
              e.currentTarget.value = '';
            }
          }} />
          <p className="hint">Primer objetivo: entender la operación en 30 segundos, sin leer logs.</p>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
