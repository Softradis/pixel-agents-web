import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
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

type AgentState = 'idle' | 'walk' | 'working' | 'blocked';
type Direction = 'down' | 'up' | 'right' | 'left';
type Point = { x: number; y: number };
type Tile = { col: number; row: number };

const TILE = 32;
const FRAME_W = 16;
const FRAME_H = 32;
const FRAME_SCALE = 2;
const WALK_FRAME_MS = 140;
const WORK_FRAME_MS = 260;

const statusText: Record<TaskStatus, string> = {
  esperando: 'Esperando',
  trabajando: 'Trabajando',
  bloqueado: 'Bloqueado',
  resuelto: 'Resuelto',
};

const statusColor: Record<TaskStatus, string> = {
  esperando: '#f4c542',
  trabajando: '#4fa3ff',
  bloqueado: '#ff5d5d',
  resuelto: '#56d364',
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

const layout = {
  cols: 24,
  rows: 15,
  entrada: { col: 3, row: 11 },
  veraDesk: { col: 5, row: 8 },
  veraSeat: { col: 5, row: 9 },
  corridor: { col: 11, row: 8 },
  crisDesk: { col: 17, row: 8 },
  crisSeat: { col: 17, row: 9 },
  decision: { col: 21, row: 4 },
};

const zones = {
  entrada: layout.entrada,
  vera: layout.veraSeat,
  cris: layout.crisSeat,
  decision: layout.decision,
} satisfies Record<Owner, Tile>;

const blocked = new Set<string>([
  // outer walls only: inner separation is visual, not a hard maze.
  ...Array.from({ length: layout.cols }, (_, col) => `${col}:0`),
  ...Array.from({ length: layout.cols }, (_, col) => `${col}:${layout.rows - 1}`),
  ...Array.from({ length: layout.rows }, (_, row) => `0:${row}`),
  ...Array.from({ length: layout.rows }, (_, row) => `${layout.cols - 1}:${row}`),
  // desks and decision furniture block walking
  `${layout.veraDesk.col}:${layout.veraDesk.row}`,
  `${layout.crisDesk.col}:${layout.crisDesk.row}`,
  `${layout.decision.col}:${layout.decision.row}`,
]);

const tileCenter = (tile: Tile): Point => ({ x: tile.col * TILE + TILE / 2, y: tile.row * TILE + TILE / 2 });
const key = (tile: Tile) => `${tile.col}:${tile.row}`;

function directionBetween(a: Tile, b: Tile): Direction {
  if (b.col > a.col) return 'right';
  if (b.col < a.col) return 'left';
  if (b.row < a.row) return 'up';
  return 'down';
}

function findPath(start: Tile, goal: Tile): Tile[] {
  if (key(start) === key(goal)) return [];
  const queue: Tile[] = [start];
  const cameFrom = new Map<string, string | null>([[key(start), null]]);
  const dirs = [{ col: 1, row: 0 }, { col: -1, row: 0 }, { col: 0, row: 1 }, { col: 0, row: -1 }];

  while (queue.length) {
    const current = queue.shift()!;
    if (key(current) === key(goal)) break;
    for (const dir of dirs) {
      const next = { col: current.col + dir.col, row: current.row + dir.row };
      const nextKey = key(next);
      if (next.col < 0 || next.row < 0 || next.col >= layout.cols || next.row >= layout.rows) continue;
      if (blocked.has(nextKey) && nextKey !== key(goal)) continue;
      if (cameFrom.has(nextKey)) continue;
      cameFrom.set(nextKey, key(current));
      queue.push(next);
    }
  }

  if (!cameFrom.has(key(goal))) return [];
  const path: Tile[] = [];
  let currentKey: string | null = key(goal);
  while (currentKey && currentKey !== key(start)) {
    const [col, row] = currentKey.split(':').map(Number);
    path.unshift({ col, row });
    currentKey = cameFrom.get(currentKey) ?? null;
  }
  return path;
}

function ownerRoute(owner: Owner): Tile {
  return zones[owner];
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
    const blockedTask = task.id % 3 === 0;
    return { ...task, fromOwner: 'cris', reactingOwner: blockedTask ? 'decision' : 'cris', pauseLabel: blockedTask ? 'bloqueado' : 'resuelto', owner: blockedTask ? 'decision' : 'cris', status: blockedTask ? 'bloqueado' : 'resuelto', detail: blockedTask ? 'Necesita decisión humana de David.' : 'Cris dejó la tarea resuelta.' };
  }
  return { ...task, fromOwner: 'decision', reactingOwner: 'decision', pauseLabel: 'cerrado', status: 'resuelto', detail: 'David tomó la decisión y la tarea queda cerrada.' };
}

function drawSprite(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, dir: Direction, frame: number, alpha = 1) {
  const row = dir === 'down' ? 0 : dir === 'up' ? 1 : 2;
  const sourceFrame = frame % 7;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  if (dir === 'left') {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, sourceFrame * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, -FRAME_W * FRAME_SCALE / 2, -FRAME_H * FRAME_SCALE + 12, FRAME_W * FRAME_SCALE, FRAME_H * FRAME_SCALE);
  } else {
    ctx.drawImage(img, sourceFrame * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, Math.round(x - FRAME_W * FRAME_SCALE / 2), Math.round(y - FRAME_H * FRAME_SCALE + 12), FRAME_W * FRAME_SCALE, FRAME_H * FRAME_SCALE);
  }
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function usePixelOffice(canvasRef: React.RefObject<HTMLCanvasElement | null>, tasks: OfficeTask[], selectedId: number | null, onSelect: (id: number) => void) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let raf = 0;

    Promise.all([
      loadImage('/assets/pixel-agents/characters/vera.png'),
      loadImage('/assets/pixel-agents/characters/cris.png'),
      loadImage('/assets/pixel-agents/furniture/desk_front.png'),
      loadImage('/assets/pixel-agents/furniture/pc_on.png'),
      loadImage('/assets/pixel-agents/furniture/chair_front.png'),
      loadImage('/assets/pixel-agents/furniture/plant.png'),
      loadImage('/assets/pixel-agents/furniture/whiteboard.png'),
      loadImage('/assets/pixel-agents/floors/floor_0.png'),
    ]).then(([veraImg, crisImg, deskImg, pcImg, chairImg, plantImg, whiteboardImg, floorImg]) => {
      if (disposed) return;
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      const sceneW = layout.cols * TILE;
      const sceneH = layout.rows * TILE;
      canvas.width = sceneW * dpr;
      canvas.height = sceneH * dpr;
      canvas.style.width = `${sceneW}px`;
      canvas.style.height = `${sceneH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const activeOwners = new Set(tasks.flatMap((task) => [task.reactingOwner, task.status === 'trabajando' || task.status === 'bloqueado' ? task.owner : undefined]).filter(Boolean) as Owner[]);
      const mainTask = tasks.find((task) => task.id === selectedId) ?? tasks[0];
      const veraTarget = mainTask.owner === 'entrada' ? zones.entrada : mainTask.owner === 'vera' ? zones.vera : mainTask.owner === 'cris' || mainTask.owner === 'decision' ? zones.cris : zones.vera;
      const crisTarget = mainTask.owner === 'decision' ? zones.decision : zones.cris;
      const veraPath = findPath(zones.vera, veraTarget);
      const crisPath = findPath(zones.cris, crisTarget);
      const taskPath = mainTask.fromOwner ? findPath(ownerRoute(mainTask.fromOwner), ownerRoute(mainTask.owner)) : [];

      function pointOnPath(start: Tile, path: Tile[], progress: number): { point: Point; dir: Direction; moving: boolean } {
        if (!path.length) return { point: tileCenter(start), dir: 'down', moving: false };
        const total = path.length;
        const exact = Math.min(total - 0.001, Math.max(0, progress * total));
        const index = Math.floor(exact);
        const local = exact - index;
        const fromTile = index === 0 ? start : path[index - 1];
        const toTile = path[index];
        const from = tileCenter(fromTile);
        const to = tileCenter(toTile);
        return {
          point: { x: from.x + (to.x - from.x) * local, y: from.y + (to.y - from.y) * local },
          dir: directionBetween(fromTile, toTile),
          moving: true,
        };
      }

      const draw = (time: number) => {
        ctx.clearRect(0, 0, sceneW, sceneH);
        ctx.fillStyle = '#141b29';
        ctx.fillRect(0, 0, sceneW, sceneH);

        // floors
        for (let row = 0; row < layout.rows; row++) {
          for (let col = 0; col < layout.cols; col++) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(floorImg, col * TILE, row * TILE, TILE, TILE);
            ctx.strokeStyle = 'rgba(255,255,255,.035)';
            ctx.strokeRect(col * TILE, row * TILE, TILE, TILE);
          }
        }

        // room zones: one continuous office with a readable central hallway.
        ctx.fillStyle = 'rgba(47,159,215,.13)';
        ctx.fillRect(TILE, TILE, 8 * TILE, 12 * TILE);
        ctx.fillStyle = 'rgba(255,224,168,.13)';
        ctx.fillRect(9 * TILE, TILE, 4 * TILE, 12 * TILE);
        ctx.fillStyle = 'rgba(255,169,77,.13)';
        ctx.fillRect(13 * TILE, TILE, 10 * TILE, 12 * TILE);
        ctx.fillStyle = 'rgba(255,93,93,.18)';
        ctx.fillRect(19 * TILE, 2 * TILE, 4 * TILE, 4 * TILE);

        // walls: outer shell plus soft glass partitions with real door gaps.
        ctx.fillStyle = '#394a64';
        ctx.fillRect(0, 0, layout.cols * TILE, TILE);
        ctx.fillRect(0, (layout.rows - 1) * TILE, layout.cols * TILE, TILE);
        ctx.fillRect(0, 0, TILE, layout.rows * TILE);
        ctx.fillRect((layout.cols - 1) * TILE, 0, TILE, layout.rows * TILE);
        ctx.fillStyle = 'rgba(96,112,139,.82)';
        ctx.fillRect(9 * TILE - 4, TILE, 8, 5 * TILE);
        ctx.fillRect(9 * TILE - 4, 10 * TILE, 8, 3 * TILE);
        ctx.fillRect(13 * TILE - 4, TILE, 8, 5 * TILE);
        ctx.fillRect(13 * TILE - 4, 10 * TILE, 8, 3 * TILE);
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(9 * TILE - 4, 6 * TILE, 8, 4 * TILE);
        ctx.fillRect(13 * TILE - 4, 6 * TILE, 8, 4 * TILE);

        // labels
        const label = (text: string, x: number, y: number, color: string) => {
          ctx.fillStyle = color;
          ctx.font = '800 13px Inter, system-ui';
          ctx.fillText(text, x, y);
        };
        label('Recepción Vera', TILE * 2.1, TILE * 2.05, '#8dd7ff');
        label('Pasillo de tareas', TILE * 9.25, TILE * 2.05, '#ffe0a8');
        label('Oficina Cris', TILE * 14.1, TILE * 2.05, '#ffca7a');
        label('Decisiones humanas', TILE * 19.1, TILE * 2.05, '#ff8a8a');

        const drawFurniture = (img: HTMLImageElement, tile: Tile, w = TILE * 1.5, h = TILE, yOffset = 0) => {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, tile.col * TILE + TILE / 2 - w / 2, tile.row * TILE + TILE / 2 - h / 2 + yOffset, w, h);
        };
        drawFurniture(whiteboardImg, { col: 4, row: 3 }, TILE * 2, TILE * 1.5);
        drawFurniture(plantImg, { col: 2, row: 4 }, TILE, TILE * 1.5);
        drawFurniture(deskImg, layout.veraDesk, TILE * 2.2, TILE * 1.45);
        drawFurniture(chairImg, layout.veraSeat, TILE, TILE * 1.5, 6);
        drawFurniture(deskImg, layout.crisDesk, TILE * 2.2, TILE * 1.45);
        drawFurniture(pcImg, { col: layout.crisDesk.col + 1, row: layout.crisDesk.row }, TILE, TILE * 1.5, -12);
        drawFurniture(chairImg, layout.crisSeat, TILE, TILE * 1.5, 6);
        drawFurniture(plantImg, { col: 21, row: 11 }, TILE, TILE * 1.5);

        const seconds = time / 1000;
        const flowProgress = (seconds % 6) / 6;
        const veraWalkProgress = activeOwners.has('vera') || mainTask.owner !== 'entrada' ? (seconds % 2.6) / 2.6 : 0;
        const crisWalkProgress = activeOwners.has('decision') ? (seconds % 2.4) / 2.4 : 0;
        const veraAnim = pointOnPath(zones.vera, veraPath, veraWalkProgress);
        const crisAnim = pointOnPath(zones.cris, crisPath, crisWalkProgress);
        const veraState: AgentState = activeOwners.has('vera') ? 'working' : veraAnim.moving ? 'walk' : 'idle';
        const crisState: AgentState = activeOwners.has('decision') ? 'blocked' : activeOwners.has('cris') ? 'working' : crisAnim.moving ? 'walk' : 'idle';

        const veraFrame = veraAnim.moving ? Math.floor(time / WALK_FRAME_MS) % 4 : veraState === 'working' ? 3 + Math.floor(time / WORK_FRAME_MS) % 2 : 1;
        const crisFrame = crisAnim.moving ? Math.floor(time / WALK_FRAME_MS) % 4 : crisState === 'working' ? 3 + Math.floor(time / WORK_FRAME_MS) % 2 : 1;

        // task object moving on path
        tasks.forEach((task, index) => {
          const target = ownerRoute(task.owner);
          const path = task.id === mainTask.id && taskPath.length ? taskPath : [];
          const anim = path.length ? pointOnPath(task.fromOwner ? ownerRoute(task.fromOwner) : target, path, Math.min(1, ((time % 1400) / 1400))) : { point: { x: tileCenter(target).x + (index % 3) * 10 - 10, y: tileCenter(target).y + TILE * 0.45 + Math.floor(index / 3) * 10 }, dir: 'down' as Direction, moving: false };
          ctx.fillStyle = 'rgba(0,0,0,.25)';
          ctx.beginPath();
          ctx.ellipse(anim.point.x, anim.point.y + 13, 18, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = statusColor[task.status];
          ctx.strokeStyle = selectedId === task.id ? '#ffffff' : 'rgba(255,255,255,.55)';
          ctx.lineWidth = selectedId === task.id ? 3 : 1;
          ctx.beginPath();
          ctx.roundRect(anim.point.x - 18, anim.point.y - 12, 36, 24, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#10151f';
          ctx.font = '900 10px Inter, system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(task.status === 'resuelto' ? 'OK' : task.status === 'bloqueado' ? '!' : task.kind === 'bug' ? 'BUG' : 'WA', anim.point.x, anim.point.y + 4);
          ctx.textAlign = 'start';
        });

        // agents
        const agentGlow = (p: Point, color: string, active: boolean) => {
          ctx.fillStyle = color;
          ctx.globalAlpha = active ? 0.25 + Math.sin(time / 120) * 0.08 : 0.12;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 10, 22, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        };
        agentGlow(veraAnim.point, '#2f9fd7', veraState !== 'idle');
        drawSprite(ctx, veraImg, veraAnim.point.x, veraAnim.point.y, veraAnim.dir, veraFrame);
        agentGlow(crisAnim.point, crisState === 'blocked' ? '#ff5d5d' : '#ffca7a', crisState !== 'idle');
        drawSprite(ctx, crisImg, crisAnim.point.x, crisAnim.point.y, crisAnim.dir, crisFrame);

        const nameTag = (name: string, point: Point, color: string, state: AgentState) => {
          ctx.fillStyle = 'rgba(8,12,20,.78)';
          ctx.beginPath();
          ctx.roundRect(point.x - 42, point.y + 18, 84, 24, 8);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.font = '800 11px Inter, system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`${name} · ${state}`, point.x, point.y + 34);
          ctx.textAlign = 'start';
        };
        nameTag('Vera', veraAnim.point, '#8dd7ff', veraState);
        nameTag('Cris', crisAnim.point, crisState === 'blocked' ? '#ff8a8a' : '#ffca7a', crisState);

        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    });

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = tasks.find((task, index) => {
        const point = tileCenter(ownerRoute(task.owner));
        return Math.abs(x - (point.x + (index % 3) * 10 - 10)) < 24 && Math.abs(y - (point.y + TILE * 0.45 + Math.floor(index / 3) * 10)) < 24;
      });
      if (hit) onSelect(hit.id);
    };
    canvas.addEventListener('click', handleClick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('click', handleClick);
    };
  }, [canvasRef, tasks, selectedId, onSelect]);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tasks, setTasks] = useState<OfficeTask[]>(initialTasks);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([
    { id: 1, text: 'Entra WhatsApp en recepción', status: 'esperando' as TaskStatus, at: nowTime() },
    { id: 2, text: 'Cris trabaja en bug técnico', status: 'trabajando' as TaskStatus, at: nowTime() },
    { id: 3, text: 'Una tarea queda resuelta', status: 'resuelto', at: nowTime() },
  ]);
  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) ?? tasks[0], [tasks, selectedId]);

  usePixelOffice(canvasRef, tasks, selectedId, setSelectedId);

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
    }, 1200);
  }

  function startWhatsAppFlow() {
    const id = Date.now();
    const flow: OfficeTask[] = [
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'esperando', owner: 'entrada', detail: 'Entra un WhatsApp nuevo por recepción.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'trabajando', fromOwner: 'entrada', reactingOwner: 'vera', pauseLabel: 'clasificando…', owner: 'vera', detail: 'Vera recoge el WhatsApp y lo clasifica.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'trabajando', fromOwner: 'vera', reactingOwner: 'cris', pauseLabel: 'diagnosticando…', owner: 'cris', detail: 'Vera lo deriva a Cris para resolución técnica.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'resuelto', fromOwner: 'cris', reactingOwner: 'cris', pauseLabel: 'resuelto', owner: 'cris', detail: 'Cris termina la tarea y deja tarjeta verde.' },
    ];
    const notes = ['Entra WhatsApp automático en recepción', 'Vera recoge y clasifica el WhatsApp', 'Vera deriva la tarea a Cris', 'Cris resuelve y deja tarjeta verde'];
    setSelectedId(id);
    flow.forEach((snapshot, step) => {
      window.setTimeout(() => {
        setTasks((current) => current.some((task) => task.id === id) ? current.map((task) => task.id === id ? snapshot : task) : [...current, snapshot]);
        setTimeline((current) => [{ id: Date.now() + step, text: notes[step], status: snapshot.status, at: nowTime() }, ...current].slice(0, 8));
        window.setTimeout(() => {
          setTasks((current) => current.map((task) => task.id === id ? { ...task, fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined } : task));
        }, 1200);
      }, step * 1400);
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
    const notes = ['Entra tarea que puede bloquearse', 'Vera clasifica la tarea', 'Vera deriva a Cris', 'Cris bloquea: necesita decisión de David'];
    setSelectedId(id);
    flow.forEach((snapshot, step) => {
      window.setTimeout(() => {
        setTasks((current) => current.some((task) => task.id === id) ? current.map((task) => task.id === id ? snapshot : task) : [...current, snapshot]);
        setTimeline((current) => [{ id: Date.now() + step, text: notes[step], status: snapshot.status, at: nowTime() }, ...current].slice(0, 8));
        if (step < flow.length - 1) {
          window.setTimeout(() => {
            setTasks((current) => current.map((task) => task.id === id ? { ...task, fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined } : task));
          }, 1200);
        }
      }, step * 1400);
    });
  }

  function addTask(kind: OfficeTask['kind']) {
    const id = Date.now();
    const title = kind === 'whatsapp' ? 'WhatsApp entrante' : kind === 'email' ? 'Email nuevo' : kind === 'bug' ? 'Bug servidor' : 'Decisión pendiente';
    setTasks((current) => [...current, { id, title, kind, status: 'esperando', owner: 'entrada', detail: 'Nueva tarea simulada entrando en la oficina.' }]);
    setTimeline((current) => [{ id, text: `Nueva tarea entra en recepción: ${title}`, status: 'esperando' as TaskStatus, at: nowTime() }, ...current].slice(0, 8));
    setSelectedId(id);
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Preview pixel-agents · 4402</p>
          <h1>Oficina IA · Pixel Agents</h1>
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
        <div className="scene pixel-scene">
          <canvas ref={canvasRef} />
        </div>
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
          <p className="eyebrow">Qué prueba esta rama</p>
          <p>Personajes animados por frames, rutas por tiles y estados visuales separados del flujo verde/rojo.</p>
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
          <p className="hint">MVP separado: no toca main ni visual-room. Sirve para comparar si Pixel Agents gana como dirección.</p>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
