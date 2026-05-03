import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

type TaskStatus = 'esperando' | 'trabajando' | 'bloqueado' | 'resuelto';
type Owner = 'entrada' | 'vera' | 'cris' | 'decision';
type TimelineEvent = { id: number; text: string; status: TaskStatus; at: string };
type OfficeEventType = 'task.created' | 'task.assigned_to_vera' | 'task.assigned_to_cris' | 'task.working' | 'task.blocked' | 'task.resolved';
type OfficeEvent = { type: OfficeEventType; taskId: number; title: string; kind: OfficeTask['kind']; detail?: string; eventId?: number | string };
type OfficeEventSource = 'simulator' | 'websocket' | 'sse';
type InboundOfficeEvent = { id?: number; type: string; from?: string; text?: string; target?: string; outcome?: 'ok' | 'decide' };

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
  updatedAt?: number;
  visualPhase?: 'toWhatsappArrival' | 'veraToEntrada' | 'entradaWork' | 'veraToDesk' | 'veraToCris' | 'transferToCris' | 'crisWork';
};

type AgentState = 'idle' | 'walk' | 'working' | 'blocked';
type Direction = 'down' | 'up' | 'right' | 'left';
type Point = { x: number; y: number };
type Tile = { col: number; row: number };
type ElementType = string;
type AgentId = 'vera' | 'cris';
type AnchorId = 'whatsappArrival' | 'entradaWork' | 'veraWork' | 'crisWork' | 'veraToCris' | 'decision';
type EditorTool = ElementType | 'erase' | 'move' | `assign:${AgentId}` | `anchor:${AnchorId}`;
type PlacedElement = { id: string; type: ElementType; col: number; row: number; assignedTo?: AgentId };
type AgentTiles = Record<AgentId, Tile>;
type OfficeAnchors = Record<AnchorId, Tile>;
type OfficeAnchorDirections = Record<AnchorId, Direction>;
type CatalogItem = { type: ElementType; label: string; category: string; src: string; w: number; h: number; yOffset?: number };
type AgentMotion = { tile: Tile; point: Point; target: Tile; path: Tile[]; dir: Direction; moving: boolean; currentTaskId?: number };
type AgentMotionMap = Record<AgentId, AgentMotion>;
type TaskMotion = { point: Point; target: Point; moving: boolean };
type TaskMotionMap = Record<number, TaskMotion>;
type VisualPhase = NonNullable<OfficeTask['visualPhase']>;
type DemoStep = { task: OfficeTask; waitFor?: VisualPhase; durationMs?: number };

const TILE = 32;
const FRAME_W = 16;
const FRAME_H = 32;
const FRAME_SCALE = 2;
const WALK_FRAME_MS = 140;
const WORK_FRAME_MS = 260;
const AGENT_SPEED_PX_PER_SEC = 92;
const TASK_SPEED_PX_PER_SEC = 150;
const TASK_TRANSFER_CLEAR_MS = 4200;
const DEMO_FLOW_STEP_MS = 4200;

const elementCatalog: CatalogItem[] = [
  { type: 'BIN', label: 'Papelera', category: 'Varios', src: '/assets/pixel-agents/furniture-full/BIN/BIN.png', w: 1, h: 1 },
  { type: 'BOOKSHELF', label: 'Estantería', category: 'Pared', src: '/assets/pixel-agents/furniture-full/BOOKSHELF/BOOKSHELF.png', w: 2, h: 1 },
  { type: 'DOUBLE_BOOKSHELF', label: 'Estantería doble', category: 'Pared', src: '/assets/pixel-agents/furniture-full/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png', w: 2, h: 2 },
  { type: 'CLOCK', label: 'Reloj', category: 'Pared', src: '/assets/pixel-agents/furniture-full/CLOCK/CLOCK.png', w: 1, h: 2 },
  { type: 'WHITEBOARD', label: 'Pizarra', category: 'Pared', src: '/assets/pixel-agents/furniture-full/WHITEBOARD/WHITEBOARD.png', w: 2, h: 1.4 },
  { type: 'LARGE_PAINTING', label: 'Cuadro grande', category: 'Pared', src: '/assets/pixel-agents/furniture-full/LARGE_PAINTING/LARGE_PAINTING.png', w: 2, h: 2 },
  { type: 'SMALL_PAINTING', label: 'Cuadro', category: 'Pared', src: '/assets/pixel-agents/furniture-full/SMALL_PAINTING/SMALL_PAINTING.png', w: 1, h: 1 },
  { type: 'SMALL_PAINTING_2', label: 'Cuadro 2', category: 'Pared', src: '/assets/pixel-agents/furniture-full/SMALL_PAINTING_2/SMALL_PAINTING_2.png', w: 1, h: 1 },
  { type: 'DESK_FRONT', label: 'Mesa frontal', category: 'Mesas', src: '/assets/pixel-agents/furniture-full/DESK/DESK_FRONT.png', w: 2.2, h: 1.45 },
  { type: 'DESK_SIDE', label: 'Mesa lateral', category: 'Mesas', src: '/assets/pixel-agents/furniture-full/DESK/DESK_SIDE.png', w: 1, h: 3.2 },
  { type: 'SMALL_TABLE_FRONT', label: 'Mesa pequeña', category: 'Mesas', src: '/assets/pixel-agents/furniture-full/SMALL_TABLE/SMALL_TABLE_FRONT.png', w: 1.6, h: 1 },
  { type: 'SMALL_TABLE_SIDE', label: 'Mesa pequeña lateral', category: 'Mesas', src: '/assets/pixel-agents/furniture-full/SMALL_TABLE/SMALL_TABLE_SIDE.png', w: 1, h: 1.6 },
  { type: 'TABLE_FRONT', label: 'Mesa', category: 'Mesas', src: '/assets/pixel-agents/furniture-full/TABLE_FRONT/TABLE_FRONT.png', w: 2, h: 1 },
  { type: 'COFFEE_TABLE', label: 'Mesa café', category: 'Mesas', src: '/assets/pixel-agents/furniture-full/COFFEE_TABLE/COFFEE_TABLE.png', w: 2, h: 2 },
  { type: 'WOODEN_CHAIR_FRONT', label: 'Silla madera', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png', w: 1, h: 1.5, yOffset: 6 },
  { type: 'WOODEN_CHAIR_BACK', label: 'Silla madera trasera', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/WOODEN_CHAIR/WOODEN_CHAIR_BACK.png', w: 1, h: 1.5, yOffset: 6 },
  { type: 'WOODEN_CHAIR_SIDE', label: 'Silla madera lateral', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/WOODEN_CHAIR/WOODEN_CHAIR_SIDE.png', w: 1, h: 1.5, yOffset: 6 },
  { type: 'CUSHIONED_CHAIR_FRONT', label: 'Silla acolchada', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/CUSHIONED_CHAIR/CUSHIONED_CHAIR_FRONT.png', w: 1, h: 1 },
  { type: 'CUSHIONED_CHAIR_BACK', label: 'Silla acolchada trasera', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/CUSHIONED_CHAIR/CUSHIONED_CHAIR_BACK.png', w: 1, h: 1 },
  { type: 'CUSHIONED_CHAIR_SIDE', label: 'Silla acolchada lateral', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/CUSHIONED_CHAIR/CUSHIONED_CHAIR_SIDE.png', w: 1, h: 1 },
  { type: 'WOODEN_BENCH', label: 'Banco madera', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/WOODEN_BENCH/WOODEN_BENCH.png', w: 2, h: 1 },
  { type: 'CUSHIONED_BENCH', label: 'Banco acolchado', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/CUSHIONED_BENCH/CUSHIONED_BENCH.png', w: 1, h: 1 },
  { type: 'SOFA_FRONT', label: 'Sofá', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/SOFA/SOFA_FRONT.png', w: 2, h: 1 },
  { type: 'SOFA_BACK', label: 'Sofá trasero', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/SOFA/SOFA_BACK.png', w: 2, h: 1 },
  { type: 'SOFA_SIDE', label: 'Sofá lateral', category: 'Sillas', src: '/assets/pixel-agents/furniture-full/SOFA/SOFA_SIDE.png', w: 1, h: 2 },
  { type: 'PC_ON', label: 'PC encendido', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/PC/PC_FRONT_ON_1.png', w: 1, h: 1.5, yOffset: -8 },
  { type: 'PC_ON_2', label: 'PC encendido 2', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/PC/PC_FRONT_ON_2.png', w: 1, h: 1.5, yOffset: -8 },
  { type: 'PC_ON_3', label: 'PC encendido 3', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/PC/PC_FRONT_ON_3.png', w: 1, h: 1.5, yOffset: -8 },
  { type: 'PC_OFF', label: 'PC apagado', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/PC/PC_FRONT_OFF.png', w: 1, h: 1.5, yOffset: -8 },
  { type: 'PC_SIDE', label: 'PC lateral', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/PC/PC_SIDE.png', w: 1, h: 1.5, yOffset: -8 },
  { type: 'PC_BACK', label: 'PC trasero', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/PC/PC_BACK.png', w: 1, h: 1.5, yOffset: -8 },
  { type: 'LAPTOP_OPEN', label: 'Portátil abierto', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/LAPTOP_OPEN.svg', w: 1.4, h: 1.4, yOffset: -8 },
  { type: 'LAPTOP_CLOSED', label: 'Portátil cerrado', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/LAPTOP_CLOSED.svg', w: 1.3, h: 1, yOffset: -2 },
  { type: 'MONITOR', label: 'Monitor', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/MONITOR.svg', w: 1.25, h: 1.35, yOffset: -8 },
  { type: 'DUAL_MONITOR', label: 'Monitor doble', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/DUAL_MONITOR.svg', w: 1.7, h: 1.35, yOffset: -8 },
  { type: 'KEYBOARD', label: 'Teclado', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/KEYBOARD.svg', w: 1.3, h: 1, yOffset: -2 },
  { type: 'MOUSE', label: 'Ratón', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/MOUSE.svg', w: 1, h: 1, yOffset: -2 },
  { type: 'PC_TOWER', label: 'Torre PC', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/PC_TOWER.svg', w: 1, h: 1.45, yOffset: -5 },
  { type: 'IMAC', label: 'iMac', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/IMAC.svg', w: 1.35, h: 1.35, yOffset: -8 },
  { type: 'TABLET', label: 'Tablet', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/TABLET.svg', w: 1, h: 1.35, yOffset: -5 },
  { type: 'PHONE', label: 'Móvil', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/PHONE.svg', w: 0.8, h: 1.25, yOffset: -3 },
  { type: 'DESK_LAMP', label: 'Lámpara escritorio', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/DESK_LAMP.svg', w: 1, h: 1.35, yOffset: -6 },
  { type: 'SPEAKER', label: 'Altavoz', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/SPEAKER.svg', w: 1, h: 1.35, yOffset: -4 },
  { type: 'ROUTER', label: 'Router', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/ROUTER.svg', w: 1.2, h: 1.2, yOffset: -3 },
  { type: 'WEBCAM', label: 'Webcam', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/WEBCAM.svg', w: 1, h: 1.1, yOffset: -5 },
  { type: 'HEADPHONES', label: 'Auriculares', category: 'Electrónica', src: '/assets/pixel-agents/furniture-full/TECH/HEADPHONES.svg', w: 1.15, h: 1.15, yOffset: -4 },
  { type: 'COFFEE', label: 'Café', category: 'Varios', src: '/assets/pixel-agents/furniture-full/COFFEE/COFFEE.png', w: 1, h: 1 },
  { type: 'PLANT', label: 'Planta', category: 'Decoración', src: '/assets/pixel-agents/furniture-full/PLANT/PLANT.png', w: 1, h: 1.5 },
  { type: 'PLANT_2', label: 'Planta 2', category: 'Decoración', src: '/assets/pixel-agents/furniture-full/PLANT_2/PLANT_2.png', w: 1, h: 1.5 },
  { type: 'LARGE_PLANT', label: 'Planta grande', category: 'Decoración', src: '/assets/pixel-agents/furniture-full/LARGE_PLANT/LARGE_PLANT.png', w: 2, h: 2.4 },
  { type: 'HANGING_PLANT', label: 'Planta colgante', category: 'Pared', src: '/assets/pixel-agents/furniture-full/HANGING_PLANT/HANGING_PLANT.png', w: 1, h: 2 },
  { type: 'CACTUS', label: 'Cactus', category: 'Decoración', src: '/assets/pixel-agents/furniture-full/CACTUS/CACTUS.png', w: 1, h: 1.7 },
  { type: 'POT', label: 'Maceta', category: 'Decoración', src: '/assets/pixel-agents/furniture-full/POT/POT.png', w: 1, h: 1 },
];
const catalogByType = Object.fromEntries(elementCatalog.map((item) => [item.type, item])) as Record<string, CatalogItem>;
const catalogCategories = Array.from(new Set(elementCatalog.map((item) => item.category)));

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

const officeDebugLog = (enabled: boolean, boundary: string, payload: Record<string, unknown>) => {
  if (!enabled) return;
  const parts = Object.entries(payload).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  console.info(`[office:${boundary}] ${parts.join(' ')}`);
};

const initialTasks: OfficeTask[] = [
  {
    id: 1,
    title: 'WhatsApp entrante',
    kind: 'whatsapp',
    status: 'esperando',
    owner: 'entrada',
    detail: 'Mensaje nuevo entrando por recepción. El agente A lo recogerá y clasificará.',
  },
  {
    id: 2,
    title: 'Bug técnico',
    kind: 'bug',
    status: 'trabajando',
    owner: 'cris',
    detail: 'Incidencia técnica ya derivada al agente B. Está diagnosticando el problema.',
  },
  {
    id: 3,
    title: 'Tarea resuelta',
    kind: 'email',
    status: 'resuelto',
    owner: 'cris',
    detail: 'Trabajo terminado: el agente B dejó una tarjeta verde de resuelto.',
  },
];

const layout = {
  cols: 24,
  rows: 15,
  entrada: { col: 17, row: 3 },
  veraDesk: { col: 6, row: 8 },
  veraSeat: { col: 6, row: 9 },
  corridor: { col: 11, row: 7 },
  crisDesk: { col: 17, row: 10 },
  crisSeat: { col: 17, row: 11 },
  decision: { col: 21, row: 10 },
};

const zones = {
  entrada: layout.entrada,
  vera: layout.veraSeat,
  cris: layout.crisSeat,
  decision: layout.decision,
} satisfies Record<Owner, Tile>;

const initialAgentTiles: AgentTiles = {
  vera: { col: 6, row: 10 },
  cris: { col: 16, row: 11 },
};

const defaultComputerAssignments: Record<AgentId, string> = {
  vera: 'PC_BACK-1777796494933',
  cris: 'PC_BACK-1777795417077',
};

const initialAnchors: OfficeAnchors = {
  whatsappArrival: { col: 16, row: 2 },
  entradaWork: { col: 6, row: 10 },
  veraWork: { col: 6, row: 10 },
  crisWork: { col: 16, row: 11 },
  veraToCris: { col: 15, row: 11 },
  decision: { col: 21, row: 10 },
};

const initialAnchorDirections: OfficeAnchorDirections = {
  whatsappArrival: 'up',
  entradaWork: 'down',
  veraWork: 'down',
  crisWork: 'down',
  veraToCris: 'right',
  decision: 'right',
};

const initialPlacedElements: PlacedElement[] = [
  { id: 'DESK_FRONT-1777793900926', type: 'DESK_FRONT', col: 3, row: 3 },
  { id: 'KEYBOARD-1777793707216', type: 'KEYBOARD', col: 3, row: 3 },
  { id: 'LAPTOP_OPEN-1777793854527', type: 'LAPTOP_OPEN', col: 3, row: 3 },
  { id: 'DESK_FRONT-1777793928293', type: 'DESK_FRONT', col: 7, row: 3 },
  { id: 'LAPTOP_OPEN-1777793938407', type: 'LAPTOP_OPEN', col: 7, row: 3 },
  { id: 'PC_TOWER-1777793970461', type: 'PC_TOWER', col: 8, row: 3 },
  { id: 'PC_TOWER-1777793975142', type: 'PC_TOWER', col: 4, row: 3 },
  { id: 'DESK_FRONT-1777793998645', type: 'DESK_FRONT', col: 3, row: 6 },
  { id: 'DESK_FRONT-1777794000381', type: 'DESK_FRONT', col: 7, row: 6 },
  { id: 'PLANT-1777794012868', type: 'PLANT', col: 5, row: 3 },
  { id: 'PLANT-1777794014365', type: 'PLANT', col: 9, row: 3 },
  { id: 'PLANT_2-1777794023685', type: 'PLANT_2', col: 5, row: 6 },
  { id: 'PLANT_2-1777794025038', type: 'PLANT_2', col: 9, row: 6 },
  { id: 'DOUBLE_BOOKSHELF-1777794034916', type: 'DOUBLE_BOOKSHELF', col: 9, row: 1 },
  { id: 'COFFEE_TABLE-1777794064920', type: 'COFFEE_TABLE', col: 2, row: 9 },
  { id: 'COFFEE-1777794074213', type: 'COFFEE', col: 2, row: 9 },
  { id: 'COFFEE-1777794075349', type: 'COFFEE', col: 2, row: 9 },
  { id: 'DUAL_MONITOR-1777794120565', type: 'DUAL_MONITOR', col: 3, row: 6 },
  { id: 'DUAL_MONITOR-1777794121670', type: 'DUAL_MONITOR', col: 7, row: 6 },
  { id: 'KEYBOARD-1777794126597', type: 'KEYBOARD', col: 3, row: 6 },
  { id: 'KEYBOARD-1777794127422', type: 'KEYBOARD', col: 7, row: 6 },
  { id: 'PC_TOWER-1777794156660', type: 'PC_TOWER', col: 8, row: 6 },
  { id: 'PC_TOWER-1777794157846', type: 'PC_TOWER', col: 4, row: 6 },
  { id: 'DESK_SIDE-1777794197605', type: 'DESK_SIDE', col: 21, row: 2 },
  { id: 'LARGE_PLANT-1777794206476', type: 'LARGE_PLANT', col: 21, row: 4 },
  { id: 'PC_SIDE-1777794225540', type: 'PC_SIDE', col: 21, row: 2 },
  { id: 'HANGING_PLANT-1777794240766', type: 'HANGING_PLANT', col: 11, row: 1 },
  { id: 'HANGING_PLANT-1777794244253', type: 'HANGING_PLANT', col: 1, row: 1 },
  { id: 'DESK_LAMP-1777794296646', type: 'DESK_LAMP', col: 21, row: 3 },
  { id: 'PC_TOWER-1777794303005', type: 'PC_TOWER', col: 21, row: 1 },
  { id: 'CUSHIONED_CHAIR_SIDE-1777794366973', type: 'CUSHIONED_CHAIR_SIDE', col: 13, row: 3 },
  { id: 'CUSHIONED_CHAIR_SIDE-1777794398797', type: 'CUSHIONED_CHAIR_SIDE', col: 20, row: 2 },
  { id: 'BIN-1777794430517', type: 'BIN', col: 13, row: 5 },
  { id: 'SOFA_BACK-1777794474542', type: 'SOFA_BACK', col: 9, row: 13 },
  { id: 'SOFA_BACK-1777794476338', type: 'SOFA_BACK', col: 3, row: 13 },
  { id: 'SOFA_BACK-1777794479406', type: 'SOFA_BACK', col: 19, row: 5 },
  { id: 'BIN-1777794490549', type: 'BIN', col: 22, row: 5 },
  { id: 'DESK_SIDE-1777794531845', type: 'DESK_SIDE', col: 22, row: 10 },
  { id: 'CUSHIONED_CHAIR_BACK-1777794547933', type: 'CUSHIONED_CHAIR_BACK', col: 22, row: 12 },
  { id: 'CUSHIONED_CHAIR_SIDE-1777794552213', type: 'CUSHIONED_CHAIR_SIDE', col: 21, row: 10 },
  { id: 'PC_SIDE-1777794563437', type: 'PC_SIDE', col: 22, row: 10 },
  { id: 'BIN-1777794692583', type: 'BIN', col: 11, row: 6 },
  { id: 'BIN-1777794693351', type: 'BIN', col: 11, row: 3 },
  { id: 'BIN-1777794696489', type: 'BIN', col: 6, row: 6 },
  { id: 'BIN-1777794698045', type: 'BIN', col: 6, row: 3 },
  { id: 'BIN-1777794044488', type: 'BIN', col: 2, row: 3 },
  { id: 'BIN-1777794047317', type: 'BIN', col: 2, row: 6 },
  { id: 'DOUBLE_BOOKSHELF-1777794750848', type: 'DOUBLE_BOOKSHELF', col: 22, row: 6 },
  { id: 'DOUBLE_BOOKSHELF-1777794753622', type: 'DOUBLE_BOOKSHELF', col: 20, row: 6 },
  { id: 'DOUBLE_BOOKSHELF-1777794754871', type: 'DOUBLE_BOOKSHELF', col: 18, row: 6 },
  { id: 'WOODEN_CHAIR_BACK-1777794907197', type: 'WOODEN_CHAIR_BACK', col: 3, row: 3 },
  { id: 'WOODEN_CHAIR_BACK-1777794922718', type: 'WOODEN_CHAIR_BACK', col: 7, row: 3 },
  { id: 'WOODEN_CHAIR_BACK-1777794924485', type: 'WOODEN_CHAIR_BACK', col: 3, row: 6 },
  { id: 'WOODEN_CHAIR_BACK-1777794925493', type: 'WOODEN_CHAIR_BACK', col: 7, row: 6 },
  { id: 'WOODEN_CHAIR_BACK-1777794928077', type: 'WOODEN_CHAIR_BACK', col: 2, row: 9 },
  { id: 'DOUBLE_BOOKSHELF-1777795036054', type: 'DOUBLE_BOOKSHELF', col: 15, row: 9 },
  { id: 'DOUBLE_BOOKSHELF-1777795036894', type: 'DOUBLE_BOOKSHELF', col: 17, row: 9 },
  { id: 'HANGING_PLANT-1777795068998', type: 'HANGING_PLANT', col: 22, row: 1 },
  { id: 'BIN-1777795085726', type: 'BIN', col: 22, row: 9 },
  { id: 'WOODEN_CHAIR_FRONT-1777795098937', type: 'WOODEN_CHAIR_FRONT', col: 2, row: 8 },
  { id: 'SOFA_SIDE-1777795329191', type: 'SOFA_SIDE', col: 1, row: 12 },
  { id: 'DESK_FRONT-1777795377869', type: 'DESK_FRONT', col: 16, row: 12 },
  { id: 'PC_BACK-1777795417077', type: 'PC_BACK', col: 16, row: 12, assignedTo: 'cris' },
  { id: 'BIN-1777795425008', type: 'BIN', col: 15, row: 12 },
  { id: 'LARGE_PLANT-1777795434181', type: 'LARGE_PLANT', col: 18, row: 12 },
  { id: 'LARGE_PLANT-1777795436469', type: 'LARGE_PLANT', col: 14, row: 12 },
  { id: 'SOFA_BACK-1777795470694', type: 'SOFA_BACK', col: 6, row: 13 },
  { id: 'COFFEE_TABLE-1777795655960', type: 'COFFEE_TABLE', col: 5, row: 9 },
  { id: 'WOODEN_CHAIR_BACK-1777795681389', type: 'WOODEN_CHAIR_BACK', col: 5, row: 9 },
  { id: 'WOODEN_CHAIR_FRONT-1777795696682', type: 'WOODEN_CHAIR_FRONT', col: 5, row: 8 },
  { id: 'COFFEE-1777795703432', type: 'COFFEE', col: 5, row: 9 },
  { id: 'CUSHIONED_CHAIR_SIDE-1777795740301', type: 'CUSHIONED_CHAIR_SIDE', col: 4, row: 9 },
  { id: 'CLOCK-1777795813713', type: 'CLOCK', col: 20, row: 1 },
  { id: 'CLOCK-1777795826253', type: 'CLOCK', col: 6, row: 1 },
  { id: 'DESK_FRONT-1777796477901', type: 'DESK_FRONT', col: 6, row: 11 },
  { id: 'PC_BACK-1777796494933', type: 'PC_BACK', col: 6, row: 11, assignedTo: 'vera' },
  { id: 'CUSHIONED_CHAIR_SIDE-1777796517693', type: 'CUSHIONED_CHAIR_SIDE', col: 5, row: 11 },
  { id: 'BIN-1777796633909', type: 'BIN', col: 1, row: 9 },
  { id: 'SOFA_SIDE-1777801283262', type: 'SOFA_SIDE', col: 1, row: 4 },
  { id: 'SOFA_SIDE-1777801285719', type: 'SOFA_SIDE', col: 1, row: 7 },
  { id: 'SOFA_FRONT-1777801302334', type: 'SOFA_FRONT', col: 18, row: 1 },
  { id: 'SOFA_BACK-1777801325088', type: 'SOFA_BACK', col: 21, row: 13 },
  { id: 'SOFA_SIDE-1777801350872', type: 'SOFA_SIDE', col: 13, row: 11 },
  { id: 'WOODEN_CHAIR_FRONT-1777795096952', type: 'WOODEN_CHAIR_FRONT', col: 10, row: 8 },
  { id: 'COFFEE-1777795299839', type: 'COFFEE', col: 10, row: 9 },
  { id: 'COFFEE_TABLE-1777794716423', type: 'COFFEE_TABLE', col: 10, row: 9 },
  { id: 'WOODEN_CHAIR_BACK-1777794954558', type: 'WOODEN_CHAIR_BACK', col: 10, row: 9 },
  { id: 'CUSHIONED_CHAIR_SIDE-1777795111008', type: 'CUSHIONED_CHAIR_SIDE', col: 9, row: 9 },
  { id: 'BIN-1777796629000', type: 'BIN', col: 11, row: 13 },
  { id: 'DESK_FRONT-1777803682942', type: 'DESK_FRONT', col: 16, row: 2 },
  { id: 'PC_ON_2-1777803693326', type: 'PC_ON_2', col: 16, row: 2 },
  { id: 'KEYBOARD-1777803702689', type: 'KEYBOARD', col: 16, row: 2 },
  { id: 'BIN-1777803713672', type: 'BIN', col: 15, row: 2 },
  { id: 'PLANT_2-1777803729022', type: 'PLANT_2', col: 18, row: 3 },
  { id: 'WOODEN_CHAIR_BACK-1777803815649', type: 'WOODEN_CHAIR_BACK', col: 16, row: 2 },
];

function applyDefaultComputerAssignments(elements: PlacedElement[]): PlacedElement[] {
  return elements.map((item) => {
    if (!Object.values(defaultComputerAssignments).includes(item.id)) return item;
    const assignedTo = Object.entries(defaultComputerAssignments).find(([, elementId]) => elementId === item.id)?.[0] as AgentId | undefined;
    if (!assignedTo || elements.some((candidate) => candidate.assignedTo === assignedTo)) return item;
    return { ...item, assignedTo };
  });
}

const blocked = new Set<string>([
  // outer walls
  ...Array.from({ length: layout.cols }, (_, col) => `${col}:0`),
  ...Array.from({ length: layout.cols }, (_, col) => `${col}:${layout.rows - 1}`),
  ...Array.from({ length: layout.rows }, (_, row) => `0:${row}`),
  ...Array.from({ length: layout.rows }, (_, row) => `${layout.cols - 1}:${row}`),
  // room partitions: right side split into system room and agent B/decision room, with open door gaps.
  ...Array.from({ length: 3 }, (_, i) => `${15 + i}:6`),
  ...Array.from({ length: 3 }, (_, i) => `${20 + i}:6`),
  '12:1', '12:2', '12:3', '12:4', '12:5', '12:10', '12:11', '12:12', '12:13',
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

function nearestTechDirection(from: Tile, items: PlacedElement[], fallback: Direction): Direction {
  const techTypes = new Set(['KEYBOARD', 'LAPTOP_OPEN', 'LAPTOP_CLOSED', 'DUAL_MONITOR', 'MONITOR', 'IMAC', 'PC_ON', 'PC_ON_2', 'PC_ON_3', 'PC_OFF', 'PC_SIDE', 'PC_BACK']);
  const nearest = items
    .filter((item) => techTypes.has(item.type))
    .map((item) => ({ item, distance: Math.abs(item.col - from.col) + Math.abs(item.row - from.row) }))
    .filter(({ distance }) => distance <= 3)
    .sort((a, b) => a.distance - b.distance)[0]?.item;
  return nearest ? directionBetween(from, nearest) : fallback;
}

function findPath(start: Tile, goal: Tile, blockedTiles: Set<string> = blocked): Tile[] {
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
      if (blockedTiles.has(nextKey) && nextKey !== key(goal)) continue;
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
  if (task.owner === 'entrada') return `Agente A recoge y clasifica: ${task.title}`;
  if (task.owner === 'vera') return `Agente A deriva a agente B: ${task.title}`;
  if (task.owner === 'cris') return task.id % 3 === 0 ? `Agente B se bloquea y pide decisión: ${task.title}` : `Agente B resuelve: ${task.title}`;
  return `La decisión humana desbloquea y cierra: ${task.title}`;
}

function nextStatus(task: OfficeTask): OfficeTask {
  if (task.owner === 'entrada') return { ...task, fromOwner: 'entrada', reactingOwner: 'vera', pauseLabel: 'clasificando…', owner: 'vera', status: 'trabajando', detail: 'El agente A está clasificando el mensaje.' };
  if (task.owner === 'vera') return { ...task, fromOwner: 'vera', reactingOwner: 'cris', pauseLabel: 'derivando…', owner: 'cris', status: 'trabajando', detail: 'El agente B ejecuta diagnóstico técnico.' };
  if (task.owner === 'cris') {
    const blockedTask = task.id % 3 === 0;
    return { ...task, fromOwner: 'cris', reactingOwner: blockedTask ? 'decision' : 'cris', pauseLabel: blockedTask ? 'bloqueado' : 'resuelto', owner: blockedTask ? 'decision' : 'cris', status: blockedTask ? 'bloqueado' : 'resuelto', detail: blockedTask ? 'Necesita decisión humana.' : 'El agente B dejó la tarea resuelta.' };
  }
  return { ...task, fromOwner: 'decision', reactingOwner: 'decision', pauseLabel: 'cerrado', status: 'resuelto', detail: 'La decisión humana se tomó y la tarea queda cerrada.' };
}

function taskFromEvent(event: OfficeEvent, current?: OfficeTask): OfficeTask {
  const base: OfficeTask = current ?? {
    id: event.taskId,
    title: event.title,
    kind: event.kind,
    status: 'esperando',
    owner: 'entrada',
    detail: event.detail ?? 'Nueva tarea entrando en la oficina.',
  };
  if (event.type === 'task.created') return { ...base, title: event.title, kind: event.kind, owner: 'entrada', status: 'esperando', detail: event.detail ?? 'Nueva tarea entrando por recepción.', fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined };
  if (event.type === 'task.assigned_to_vera') return { ...base, title: event.title, kind: event.kind, fromOwner: base.owner, reactingOwner: 'vera', owner: 'vera', status: 'trabajando', pauseLabel: base.owner === 'entrada' ? 'leyendo / tecleando…' : 'clasificando…', visualPhase: base.owner === 'entrada' ? 'entradaWork' : base.visualPhase, detail: event.detail ?? 'El agente A se sienta en el puesto de entrada y lee/teclea la tarea.' };
  if (event.type === 'task.assigned_to_cris') return { ...base, title: event.title, kind: event.kind, fromOwner: base.owner, reactingOwner: 'cris', owner: 'cris', status: 'trabajando', pauseLabel: base.owner === 'entrada' ? 'leyendo / tecleando…' : 'diagnosticando…', visualPhase: base.owner === 'entrada' ? 'entradaWork' : base.visualPhase, detail: event.detail ?? 'El agente B se sienta en el puesto de entrada y lee/teclea la tarea.' };
  if (event.type === 'task.working') return { ...base, title: event.title, kind: event.kind, reactingOwner: base.owner, status: 'trabajando', pauseLabel: 'trabajando…', detail: event.detail ?? 'La tarea está en curso.' };
  if (event.type === 'task.blocked') return { ...base, title: event.title, kind: 'decision', fromOwner: base.owner, reactingOwner: 'decision', owner: 'decision', status: 'bloqueado', pauseLabel: 'necesita decisión', detail: event.detail ?? 'Bloqueado: necesita decisión humana.' };
  return { ...base, title: event.title, kind: event.kind, reactingOwner: base.owner, status: 'resuelto', pauseLabel: 'resuelto', detail: event.detail ?? 'Tarea resuelta.' };
}

function describeOfficeEvent(event: OfficeEvent, source: OfficeEventSource) {
  const prefix = source === 'simulator' ? 'Sim' : source.toUpperCase();
  const labels: Record<OfficeEventType, string> = {
    'task.created': 'entra tarea',
    'task.assigned_to_vera': 'Agente A clasifica',
    'task.assigned_to_cris': 'Agente B trabaja',
    'task.working': 'trabajo en curso',
    'task.blocked': 'necesita decisión',
    'task.resolved': 'resuelta',
  };
  return `${prefix}: ${labels[event.type]} · ${event.title}`;
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

function usePixelOffice(canvasRef: React.RefObject<HTMLCanvasElement | null>, tasks: OfficeTask[], selectedId: number | null, onSelect: (id: number) => void, runtimeResetKey: number, viewScale: number, editorMode: boolean, selectedElement: EditorTool | null, placedElements: PlacedElement[], agentTiles: AgentTiles, anchors: OfficeAnchors, anchorDirections: OfficeAnchorDirections, debugLogs: boolean, onPlaceElement: (type: ElementType, tile: Tile) => void, onEraseElement: (id: string) => void, onMoveElement: (id: string, tile: Tile) => void, onMoveAgent: (id: AgentId, tile: Tile) => void, onAssignComputer: (agent: AgentId, id: string) => void, onMoveAnchor: (id: AnchorId, tile: Tile) => void, onVisualPhaseComplete?: (phase: VisualPhase, taskId: number) => void) {
  const dragStateRef = useRef<{ kind: 'element' | 'agent' | null; id: string | null; pointerId: number | null; lastTile: string | null }>({ kind: null, id: null, pointerId: null, lastTile: null });
  const agentMotionRef = useRef<AgentMotionMap>({
    vera: { tile: agentTiles.vera, point: tileCenter(agentTiles.vera), target: agentTiles.vera, path: [], dir: 'down', moving: false },
    cris: { tile: agentTiles.cris, point: tileCenter(agentTiles.cris), target: agentTiles.cris, path: [], dir: 'down', moving: false },
  });
  const lastFrameRef = useRef<number | null>(null);
  const taskMotionRef = useRef<TaskMotionMap>({});
  const completedVisualPhasesRef = useRef<Set<string>>(new Set());
  const lastRenderLogRef = useRef<Record<AgentId, string>>({ vera: '', cris: '' });

  useEffect(() => {
    agentMotionRef.current = {
      vera: { tile: agentTiles.vera, point: tileCenter(agentTiles.vera), target: agentTiles.vera, path: [], dir: 'down', moving: false },
      cris: { tile: agentTiles.cris, point: tileCenter(agentTiles.cris), target: agentTiles.cris, path: [], dir: 'down', moving: false },
    };
    taskMotionRef.current = {};
    completedVisualPhasesRef.current.clear();
    lastFrameRef.current = null;
  }, [runtimeResetKey, agentTiles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let raf = 0;
    const routeForOwner = (owner: Owner): Tile => owner === 'vera' ? anchors.veraWork : owner === 'cris' ? anchors.crisWork : owner === 'entrada' ? anchors.whatsappArrival : anchors.decision;
    const techTypes = new Set(['KEYBOARD', 'LAPTOP_OPEN', 'LAPTOP_CLOSED', 'DUAL_MONITOR', 'MONITOR', 'IMAC', 'PC_ON', 'PC_ON_2', 'PC_ON_3', 'PC_OFF', 'PC_SIDE', 'PC_BACK']);
    const passThroughTypes = new Set(['KEYBOARD', 'MOUSE', 'LAPTOP_OPEN', 'LAPTOP_CLOSED', 'DUAL_MONITOR', 'MONITOR', 'IMAC', 'PC_ON', 'PC_ON_2', 'PC_ON_3', 'PC_OFF', 'PC_SIDE', 'PC_BACK', 'PC_TOWER', 'TABLET', 'PHONE', 'DESK_LAMP', 'SPEAKER', 'ROUTER', 'WEBCAM', 'HEADPHONES', 'COFFEE']);
    const dynamicBlocked = new Set(blocked);
    placedElements.forEach((item) => {
      if (passThroughTypes.has(item.type)) return;
      const meta = catalogByType[item.type];
      const width = Math.max(1, Math.ceil(meta?.w ?? 1));
      const height = Math.max(1, Math.ceil(meta?.h ?? 1));
      for (let dc = 0; dc < width; dc++) {
        for (let dr = 0; dr < height; dr++) {
          const tile = { col: item.col + dc, row: item.row + dr };
          if (tile.col > 0 && tile.row > 0 && tile.col < layout.cols - 1 && tile.row < layout.rows - 1) dynamicBlocked.add(key(tile));
        }
      }
    });
    // Person anchors must remain reachable even if a chair/table sprite visually overlaps the tile.
    [agentTiles.vera, agentTiles.cris, anchors.veraWork, anchors.crisWork, anchors.veraToCris, anchors.whatsappArrival, anchors.entradaWork, anchors.decision].forEach((tile) => dynamicBlocked.delete(key(tile)));
    const isWalkableTile = (tile: Tile) => tile.col > 0 && tile.row > 0 && tile.col < layout.cols - 1 && tile.row < layout.rows - 1 && !dynamicBlocked.has(key(tile));
    const findVisualPath = (start: Tile, goal: Tile): Tile[] => {
      const strictPath = findPath(start, goal, dynamicBlocked);
      if (strictPath.length || key(start) === key(goal)) return strictPath;
      // Furniture is a preference, walls are a hard limit. If the edited layout blocks every route,
      // keep agents moving instead of silently completing phases in place.
      return findPath(start, goal, blocked);
    };
    const workAnchorFromComputer = (id: AgentId): { tile: Tile; dir: Direction } => {
      const tech = placedElements.find((item) => item.assignedTo === id && techTypes.has(item.type));
      const fallbackTile = id === 'vera' ? anchors.veraWork : anchors.crisWork;
      if (!tech) return { tile: fallbackTile, dir: id === 'vera' ? 'up' : 'right' };
      const candidatesByAsset: Array<{ tile: Tile; dir: Direction }> = tech.type === 'PC_BACK'
        ? [
          { tile: { col: tech.col, row: tech.row - 1 }, dir: 'down' },
          { tile: { col: tech.col - 1, row: tech.row }, dir: 'right' },
          { tile: { col: tech.col + 1, row: tech.row }, dir: 'left' },
          { tile: { col: tech.col, row: tech.row + 1 }, dir: 'up' },
        ]
        : tech.type === 'PC_SIDE'
          ? [
            { tile: { col: tech.col - 1, row: tech.row }, dir: 'right' },
            { tile: { col: tech.col + 1, row: tech.row }, dir: 'left' },
            { tile: { col: tech.col, row: tech.row - 1 }, dir: 'down' },
            { tile: { col: tech.col, row: tech.row + 1 }, dir: 'up' },
          ]
          : [
            { tile: { col: tech.col, row: tech.row + 1 }, dir: 'up' },
            { tile: { col: tech.col - 1, row: tech.row }, dir: 'right' },
            { tile: { col: tech.col + 1, row: tech.row }, dir: 'left' },
            { tile: { col: tech.col, row: tech.row - 1 }, dir: 'down' },
          ];
      return candidatesByAsset.find((candidate) => isWalkableTile(candidate.tile)) ?? { tile: fallbackTile, dir: id === 'vera' ? 'down' : 'right' };
    };
    const talkAnchorNear = (target: Tile, from: Tile): { tile: Tile; dir: Direction } => {
      const candidates: Array<{ tile: Tile; dir: Direction }> = from.col <= target.col
        ? [
          { tile: { col: target.col - 1, row: target.row }, dir: 'right' },
          { tile: { col: target.col, row: target.row - 1 }, dir: 'down' },
          { tile: { col: target.col, row: target.row + 1 }, dir: 'up' },
          { tile: { col: target.col + 1, row: target.row }, dir: 'left' },
        ]
        : [
          { tile: { col: target.col + 1, row: target.row }, dir: 'left' },
          { tile: { col: target.col, row: target.row - 1 }, dir: 'down' },
          { tile: { col: target.col, row: target.row + 1 }, dir: 'up' },
          { tile: { col: target.col - 1, row: target.row }, dir: 'right' },
        ];
      return candidates.find((candidate) => isWalkableTile(candidate.tile)) ?? { tile: target, dir: directionBetween(from, target) };
    };

    Promise.all([
      loadImage('/assets/pixel-agents/characters/vera.png?v=female-keep-vera-4'),
      loadImage('/assets/pixel-agents/characters/cris.png?v=female-keep-vera-4'),
      loadImage('/assets/pixel-agents/floors/floor_0.png'),
    ]).then(async ([veraImg, crisImg, floorImg]) => {
      const loadedCatalogImages = new Map<string, HTMLImageElement>();
      await Promise.all(elementCatalog.map(async (item) => {
        try { loadedCatalogImages.set(item.type, await loadImage(item.src)); } catch { /* ignore broken optional assets */ }
      }));
      if (disposed) return;
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      const sceneW = layout.cols * TILE;
      const sceneH = layout.rows * TILE;
      canvas.width = sceneW * dpr;
      canvas.height = sceneH * dpr;
      canvas.style.width = `${sceneW * viewScale}px`;
      canvas.style.height = `${sceneH * viewScale}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const activeOwners = new Set(tasks.flatMap((task) => [task.reactingOwner, task.status === 'trabajando' || task.status === 'bloqueado' ? task.owner : undefined]).filter(Boolean) as Owner[]);
      const mainTask = tasks.find((task) => task.id === selectedId) ?? tasks[0] ?? { id: 0, title: 'Sin tarea', kind: 'whatsapp' as const, status: 'esperando' as const, owner: 'entrada' as const, detail: 'Esperando eventos reales.' };
      const veraWorkAnchor = workAnchorFromComputer('vera');
      const crisWorkAnchor = workAnchorFromComputer('cris');
      const veraConfiguredWorkAnchor = { tile: anchors.veraWork, dir: anchorDirections.veraWork ?? nearestTechDirection(anchors.veraWork, placedElements, veraWorkAnchor.dir) };
      const crisConfiguredWorkAnchor = { tile: anchors.crisWork, dir: anchorDirections.crisWork ?? nearestTechDirection(anchors.crisWork, placedElements, crisWorkAnchor.dir) };
      const veraTalkToCris = { tile: anchors.veraToCris, dir: anchorDirections.veraToCris ?? directionBetween(anchors.veraToCris, agentTiles.cris) };
      const entradaWorkAnchor = { tile: anchors.entradaWork, dir: anchorDirections.entradaWork ?? nearestTechDirection(anchors.entradaWork, placedElements, 'left') };
      const veraShouldWalk = (mainTask.visualPhase === 'toWhatsappArrival' && mainTask.reactingOwner === 'vera') || mainTask.visualPhase === 'veraToEntrada' || (mainTask.visualPhase === 'entradaWork' && mainTask.owner === 'vera') || mainTask.visualPhase === 'veraToDesk' || mainTask.visualPhase === 'veraToCris' || mainTask.reactingOwner === 'vera' || mainTask.fromOwner === 'entrada' || mainTask.fromOwner === 'vera';
      const crisShouldWalk = (mainTask.visualPhase === 'toWhatsappArrival' && mainTask.reactingOwner === 'cris') || (mainTask.visualPhase === 'entradaWork' && mainTask.owner === 'cris') || mainTask.visualPhase === 'crisWork' || mainTask.visualPhase === 'transferToCris' || mainTask.reactingOwner === 'cris' || mainTask.reactingOwner === 'decision' || mainTask.fromOwner === 'cris';
      const veraTargetAnchor = mainTask.visualPhase === 'toWhatsappArrival' && mainTask.reactingOwner === 'vera'
        ? { tile: anchors.whatsappArrival, dir: anchorDirections.whatsappArrival ?? 'right' as Direction }
        : mainTask.visualPhase === 'veraToEntrada' || (mainTask.visualPhase === 'entradaWork' && mainTask.owner === 'vera')
        ? entradaWorkAnchor
        : mainTask.visualPhase === 'veraToDesk'
          ? veraConfiguredWorkAnchor
          : mainTask.visualPhase === 'veraToCris' || mainTask.visualPhase === 'transferToCris'
            ? veraTalkToCris
            : veraShouldWalk
              ? (mainTask.owner === 'entrada' ? { tile: anchors.whatsappArrival, dir: anchorDirections.whatsappArrival ?? 'right' as Direction } : mainTask.owner === 'vera' ? veraConfiguredWorkAnchor : veraTalkToCris)
              : veraConfiguredWorkAnchor;
      const crisTargetAnchor = mainTask.visualPhase === 'toWhatsappArrival' && mainTask.reactingOwner === 'cris'
        ? { tile: anchors.whatsappArrival, dir: anchorDirections.whatsappArrival ?? 'right' as Direction }
        : mainTask.visualPhase === 'entradaWork' && mainTask.owner === 'cris'
        ? crisConfiguredWorkAnchor
        : crisShouldWalk && mainTask.owner === 'decision'
        ? { tile: anchors.decision, dir: 'right' as Direction }
        : crisShouldWalk && mainTask.fromOwner === 'entrada' && mainTask.reactingOwner === 'cris'
          ? entradaWorkAnchor
          : crisConfiguredWorkAnchor;
      const veraTarget = veraTargetAnchor.tile;
      const crisTarget = crisTargetAnchor.tile;
      const veraPath = veraShouldWalk ? findVisualPath(agentTiles.vera, veraTarget) : [];
      const crisPath = crisShouldWalk ? findVisualPath(agentTiles.cris, crisTarget) : [];
      const taskPath = mainTask.fromOwner ? findVisualPath(routeForOwner(mainTask.fromOwner), routeForOwner(mainTask.owner)) : [];

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

      const updateAgentMotion = (id: AgentId, target: Tile, taskId: number | undefined, dt: number): AgentMotion => {
        const motion = agentMotionRef.current[id];
        if (key(motion.target) !== key(target) || motion.currentTaskId !== taskId) {
          const start = { col: Math.max(0, Math.min(layout.cols - 1, Math.round((motion.point.x - TILE / 2) / TILE))), row: Math.max(0, Math.min(layout.rows - 1, Math.round((motion.point.y - TILE / 2) / TILE))) };
          motion.tile = start;
          motion.target = target;
          motion.path = findVisualPath(start, target);
          motion.currentTaskId = taskId;
          motion.moving = motion.path.length > 0;
          officeDebugLog(debugLogs, 'agent', { agent: id, taskId: taskId ?? '-', target: `${target.col},${target.row}`, pathLen: motion.path.length });
        }
        let remaining = AGENT_SPEED_PX_PER_SEC * dt;
        while (remaining > 0 && motion.path.length) {
          const nextTile = motion.path[0];
          const nextPoint = tileCenter(nextTile);
          const dx = nextPoint.x - motion.point.x;
          const dy = nextPoint.y - motion.point.y;
          const dist = Math.hypot(dx, dy);
          motion.dir = directionBetween(motion.tile, nextTile);
          if (dist <= remaining || dist < 0.001) {
            motion.point = nextPoint;
            motion.tile = nextTile;
            motion.path.shift();
            remaining -= dist;
          } else {
            motion.point = { x: motion.point.x + dx / dist * remaining, y: motion.point.y + dy / dist * remaining };
            remaining = 0;
          }
        }
        motion.moving = motion.path.length > 0;
        return motion;
      };

      const movePoint = (point: Point, target: Point, speed: number, dt: number): { point: Point; moving: boolean } => {
        const dx = target.x - point.x;
        const dy = target.y - point.y;
        const dist = Math.hypot(dx, dy);
        const step = speed * dt;
        if (dist <= step || dist < 0.001) return { point: target, moving: false };
        return { point: { x: point.x + dx / dist * step, y: point.y + dy / dist * step }, moving: true };
      };

      const taskSourcePoint = (task: OfficeTask): Point => {
        const source = task.fromOwner ?? task.owner;
        const base = tileCenter(routeForOwner(source));
        if (source === 'vera' || source === 'cris') return { x: base.x + 46, y: base.y - 20 };
        if (source === 'decision') return { x: base.x - 46, y: base.y + 12 };
        return { x: base.x, y: base.y + TILE * 0.45 };
      };

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

        // Functional zones from the reference: agent A operations, system room, agent B/decision room.
        ctx.fillStyle = '#8f6332';
        ctx.fillRect(TILE, TILE, 11 * TILE, 13 * TILE);
        ctx.fillStyle = '#d7d2c7';
        ctx.fillRect(13 * TILE, TILE, 10 * TILE, 5 * TILE);
        ctx.fillStyle = '#437493';
        ctx.fillRect(13 * TILE, 7 * TILE, 10 * TILE, 7 * TILE);
        ctx.fillStyle = '#6b2b32';
        ctx.fillRect(19 * TILE, 8 * TILE, 4 * TILE, 5 * TILE);

        // tile tint grid per room, clearer than the previous translucent overlay
        ctx.strokeStyle = 'rgba(255,255,255,.08)';
        for (let col = 1; col < layout.cols - 1; col++) {
          for (let row = 1; row < layout.rows - 1; row++) ctx.strokeRect(col * TILE, row * TILE, TILE, TILE);
        }

        // walls: real rooms with clean door openings.
        ctx.fillStyle = '#202838';
        ctx.fillRect(0, 0, layout.cols * TILE, TILE);
        ctx.fillRect(0, (layout.rows - 1) * TILE, layout.cols * TILE, TILE);
        ctx.fillRect(0, 0, TILE, layout.rows * TILE);
        ctx.fillRect((layout.cols - 1) * TILE, 0, TILE, layout.rows * TILE);
        ctx.fillRect(12 * TILE, TILE, TILE, 5 * TILE);
        ctx.fillRect(12 * TILE, 10 * TILE, TILE, 4 * TILE);
        ctx.fillRect(15 * TILE, 6 * TILE, 3 * TILE, TILE);
        ctx.fillRect(20 * TILE, 6 * TILE, 3 * TILE, TILE);
        ctx.fillStyle = '#394a64';
        ctx.fillRect(12 * TILE, 6 * TILE, TILE, 4 * TILE); // vertical doorway / shared passage
        ctx.fillRect(13 * TILE, 6 * TILE, 2 * TILE, TILE); // doorway to system room
        ctx.fillRect(18 * TILE, 6 * TILE, 2 * TILE, TILE); // doorway to agent B/decision room

        const hasBlockedTask = tasks.some((task) => task.status === 'bloqueado' || task.owner === 'decision');
        const hasIncomingTask = tasks.some((task) => task.owner === 'entrada');
        if (hasIncomingTask) {
          const p = tileCenter(zones.entrada);
          const pulse = 0.55 + Math.sin(time / 180) * 0.18;
          ctx.strokeStyle = `rgba(255,216,102,${Math.min(1, pulse + 0.18)})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.roundRect(p.x - 55, p.y - 42, 110, 78, 14);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,216,102,.26)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 22 + Math.sin(time / 180) * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        if (hasBlockedTask) {
          ctx.strokeStyle = `rgba(255,93,93,${0.65 + Math.sin(time / 150) * 0.2})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.roundRect(19 * TILE + 5, 8 * TILE + 5, 4 * TILE - 10, 5 * TILE - 10, 16);
          ctx.stroke();
        }

        // labels
        const label = (text: string, x: number, y: number, color: string, strong = false, bg?: string) => {
          ctx.font = `${strong ? 900 : 800} 13px Inter, system-ui`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          const paddingX = strong ? 10 : 7;
          const w = Math.ceil(ctx.measureText(text).width) + paddingX * 2;
          ctx.fillStyle = bg ?? (strong ? 'rgba(8,12,20,.84)' : 'rgba(8,12,20,.62)');
          ctx.beginPath();
          ctx.roundRect(x - paddingX, y - 16, w, 22, 7);
          ctx.fill();
          if (strong) {
            ctx.strokeStyle = 'rgba(255,255,255,.72)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          ctx.fillStyle = color;
          ctx.fillText(text, x, y);
        };
        label('Agente A recibe', TILE * 1.7, TILE * 2.05, '#fff2cf');
        label(hasIncomingTask ? 'Entra tarea' : 'Entrada', TILE * 13.5, TILE * 2.05, hasIncomingTask ? '#10151f' : '#243047', hasIncomingTask, hasIncomingTask ? '#ffd866' : undefined);
        label('Agente B trabaja', TILE * 13.6, TILE * 8.05, '#d8f1ff');
        label(hasBlockedTask ? 'BLOQUEO · DECISIÓN' : 'Decisiones', TILE * 19.1, TILE * 8.05, hasBlockedTask ? '#ffffff' : '#ffe0e0', hasBlockedTask, hasBlockedTask ? '#d94141' : undefined);

        const drawFurniture = (img: HTMLImageElement, tile: Tile, w = TILE * 1.5, h = TILE, yOffset = 0) => {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, tile.col * TILE + TILE / 2 - w / 2, tile.row * TILE + TILE / 2 - h / 2 + yOffset, w, h);
        };

        [...placedElements]
          .sort((a, b) => a.row - b.row || a.col - b.col)
          .forEach((item) => {
            const meta = catalogByType[item.type];
            const image = meta ? loadedCatalogImages.get(item.type) : undefined;
            if (!meta || !image) return;
            drawFurniture(image, item, meta.w * TILE, meta.h * TILE, meta.yOffset ?? 0);
            if (editorMode && item.assignedTo) {
              ctx.fillStyle = item.assignedTo === 'vera' ? '#8dd7ff' : '#ffca7a';
              ctx.font = '900 9px Inter, system-ui';
              ctx.textAlign = 'center';
              ctx.fillText(item.assignedTo.toUpperCase(), item.col * TILE + TILE / 2, item.row * TILE - 2);
              ctx.textAlign = 'start';
            }
            if (editorMode) {
              ctx.strokeStyle = selectedElement === 'move' ? 'rgba(79,163,255,.75)' : 'rgba(255,255,255,.45)';
              ctx.lineWidth = 1;
              ctx.strokeRect(item.col * TILE + 3, item.row * TILE + 3, TILE - 6, TILE - 6);
            }
          });
        if (editorMode) {
          ctx.fillStyle = selectedElement === 'erase' ? 'rgba(255,93,93,.18)' : 'rgba(86,211,100,.12)';
          ctx.fillRect(TILE, TILE, (layout.cols - 2) * TILE, (layout.rows - 2) * TILE);
          const anchorMeta: Array<{ id: AnchorId; label: string; color: string }> = [
            { id: 'whatsappArrival', label: 'Llega mensaje', color: '#ffd866' },
            { id: 'entradaWork', label: 'Leer / teclear', color: '#ffef9f' },
            { id: 'veraWork', label: 'Trabaja agente A', color: '#8dd7ff' },
            { id: 'crisWork', label: 'Trabaja agente B', color: '#ffca7a' },
            { id: 'veraToCris', label: 'Entrega A→B', color: '#c7a6ff' },
            { id: 'decision', label: 'Decisiones', color: '#ff8a8a' },
          ];
          anchorMeta.forEach((anchor) => {
            const tile = anchors[anchor.id];
            const selected = selectedElement === `anchor:${anchor.id}`;
            const dir = anchorDirections[anchor.id];
            const center = tileCenter(tile);
            const arrowEnd = dir === 'left' ? { x: center.x - 10, y: center.y } : dir === 'right' ? { x: center.x + 10, y: center.y } : dir === 'up' ? { x: center.x, y: center.y - 10 } : { x: center.x, y: center.y + 10 };
            ctx.fillStyle = selected ? `${anchor.color}55` : `${anchor.color}24`;
            ctx.strokeStyle = anchor.color;
            ctx.lineWidth = selected ? 3 : 2;
            ctx.beginPath();
            ctx.roundRect(tile.col * TILE + 3, tile.row * TILE + 3, TILE - 6, TILE - 6, 7);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#10151f';
            ctx.fillStyle = '#10151f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(arrowEnd.x, arrowEnd.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(arrowEnd.x, arrowEnd.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#10151f';
            ctx.font = '900 8px Inter, system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(anchor.label, tile.col * TILE + TILE / 2, tile.row * TILE - 2);
            ctx.textAlign = 'start';
          });
        }

        const seconds = time / 1000;
        const lastFrame = lastFrameRef.current ?? time;
        const dt = Math.min(0.08, Math.max(0, (time - lastFrame) / 1000));
        lastFrameRef.current = time;
        const veraMotion = updateAgentMotion('vera', veraTarget, veraShouldWalk ? mainTask.id : undefined, dt);
        const crisMotion = updateAgentMotion('cris', crisTarget, crisShouldWalk ? mainTask.id : undefined, dt);
        const emitVisualPhaseComplete = (phase: VisualPhase, taskId: number) => {
          const phaseKey = `${taskId}:${phase}`;
          if (completedVisualPhasesRef.current.has(phaseKey)) return;
          completedVisualPhasesRef.current.add(phaseKey);
          window.setTimeout(() => onVisualPhaseComplete?.(phase, taskId), 0);
        };
        if (mainTask.visualPhase === 'toWhatsappArrival' && mainTask.reactingOwner === 'vera' && !veraMotion.moving) emitVisualPhaseComplete('toWhatsappArrival', mainTask.id);
        if (mainTask.visualPhase === 'toWhatsappArrival' && mainTask.reactingOwner === 'cris' && !crisMotion.moving) emitVisualPhaseComplete('toWhatsappArrival', mainTask.id);
        if (mainTask.visualPhase === 'veraToEntrada' && !veraMotion.moving) emitVisualPhaseComplete('veraToEntrada', mainTask.id);
        if (mainTask.visualPhase === 'veraToDesk' && !veraMotion.moving) emitVisualPhaseComplete('veraToDesk', mainTask.id);
        if (mainTask.visualPhase === 'veraToCris' && !veraMotion.moving) emitVisualPhaseComplete('veraToCris', mainTask.id);
        const veraAnim = { point: veraMotion.point, dir: veraMotion.moving ? veraMotion.dir : veraTargetAnchor.dir, moving: veraMotion.moving };
        const crisAnim = { point: crisMotion.point, dir: crisMotion.moving ? crisMotion.dir : crisTargetAnchor.dir, moving: crisMotion.moving };
        const veraWalking = veraAnim.moving;
        const crisWalking = crisAnim.moving;
        const veraState: AgentState = activeOwners.has('vera') && !veraWalking ? 'working' : veraWalking ? 'walk' : 'idle';
        const crisState: AgentState = activeOwners.has('decision') ? 'blocked' : activeOwners.has('cris') && !crisWalking ? 'working' : crisWalking ? 'walk' : 'idle';

        const veraRenderKey = `${veraMotion.tile.col},${veraMotion.tile.row}:${veraState}:${veraMotion.moving}`;
        const crisRenderKey = `${crisMotion.tile.col},${crisMotion.tile.row}:${crisState}:${crisMotion.moving}`;
        if (lastRenderLogRef.current.vera !== veraRenderKey) {
          lastRenderLogRef.current.vera = veraRenderKey;
          officeDebugLog(debugLogs, 'render', { agent: 'vera', tile: `${veraMotion.tile.col},${veraMotion.tile.row}`, state: veraState, moving: veraMotion.moving });
        }
        if (lastRenderLogRef.current.cris !== crisRenderKey) {
          lastRenderLogRef.current.cris = crisRenderKey;
          officeDebugLog(debugLogs, 'render', { agent: 'cris', tile: `${crisMotion.tile.col},${crisMotion.tile.row}`, state: crisState, moving: crisMotion.moving });
        }

        const veraFrame = veraWalking ? Math.floor(time / WALK_FRAME_MS) % 4 : veraState === 'working' ? 3 + Math.floor(time / WORK_FRAME_MS) % 2 : 1;
        const crisFrame = crisWalking ? Math.floor(time / WALK_FRAME_MS) % 4 : crisState === 'working' ? 3 + Math.floor(time / WORK_FRAME_MS) % 2 : 1;
        const humanAgentLabel = (agent: AgentId): string => {
          const agentTask = tasks.find((task) => task.owner === agent && task.status === 'trabajando')
            ?? tasks.find((task) => task.reactingOwner === agent)
            ?? (mainTask.reactingOwner === agent || mainTask.owner === agent ? mainTask : undefined);
          if (agent === 'vera') {
            if (mainTask.visualPhase === 'toWhatsappArrival' && mainTask.reactingOwner === 'vera') return veraWalking ? 'yendo al WhatsApp' : 'recogiendo';
            if (mainTask.visualPhase === 'veraToEntrada') return 'recogiendo';
            if (mainTask.visualPhase === 'entradaWork' && mainTask.owner === 'vera') return veraWalking ? 'sentándose' : 'leyendo / tecleando';
            if (mainTask.visualPhase === 'veraToDesk') return veraWalking ? 'volviendo a mesa' : 'clasificando';
            if (mainTask.visualPhase === 'veraToCris' || mainTask.visualPhase === 'transferToCris') return veraWalking ? 'llevando a agente B' : 'entregando';
            if (agentTask?.fromOwner === 'entrada' || agentTask?.owner === 'entrada') return veraWalking ? 'recogiendo' : 'clasificando';
            if (agentTask?.fromOwner === 'vera' || agentTask?.reactingOwner === 'cris' || mainTask.fromOwner === 'vera') return veraWalking ? 'llevando a agente B' : 'derivando';
            if (agentTask?.status === 'resuelto') return 'resuelto';
            if (veraWalking) return 'moviéndose';
            if (agentTask?.pauseLabel) return agentTask.pauseLabel.replace('…', '');
            return 'lista';
          }
          if (activeOwners.has('decision') || agentTask?.owner === 'decision' || agentTask?.status === 'bloqueado') return 'bloqueada';
          if (agentTask?.status === 'resuelto') return 'resuelto';
          if (mainTask.visualPhase === 'toWhatsappArrival' && mainTask.reactingOwner === 'cris') return crisWalking ? 'yendo al WhatsApp' : 'recogiendo';
          if (mainTask.visualPhase === 'transferToCris') return 'recibiendo';
          if (mainTask.visualPhase === 'entradaWork' && mainTask.owner === 'cris') return crisWalking ? 'sentándose' : 'leyendo / tecleando';
          if (mainTask.visualPhase === 'crisWork') return 'diagnosticando';
          if (agentTask?.fromOwner === 'vera' || agentTask?.owner === 'cris' || agentTask?.reactingOwner === 'cris') return crisWalking ? 'recibiendo' : 'diagnosticando';
          if (crisWalking) return 'moviéndose';
          if (agentTask?.pauseLabel) return agentTask.pauseLabel.replace('…', '');
          return 'lista';
        };
        const veraHumanLabel = humanAgentLabel('vera');
        const crisHumanLabel = humanAgentLabel('cris');

        // tasks: fixed trays for queues + one low-priority floating card per active agent
        const traySlotsByOwner = new Map<Owner, number>();
        const floatingSlotsByOwner = new Map<Owner, number>();
        const taskVisualRole = (task: OfficeTask): 'floating' | 'transfer' | 'tray' | 'done' => {
          if (task.visualPhase === 'transferToCris') return 'transfer';
          if (task.visualPhase === 'entradaWork' || task.visualPhase === 'veraToDesk' || task.visualPhase === 'veraToCris' || task.visualPhase === 'crisWork') return 'floating';
          if (task.fromOwner === 'vera' && task.owner === 'cris' && task.status === 'trabajando') return 'transfer';
          if ((task.owner === 'vera' || task.owner === 'cris') && task.status === 'trabajando') return 'floating';
          if (task.status === 'resuelto') return 'done';
          return 'tray';
        };
        const taskTargetPoint = (task: OfficeTask): Point => {
          const role = taskVisualRole(task);
          if (role === 'transfer') return { x: crisAnim.point.x + 46, y: crisAnim.point.y - 30 };
          if (role === 'floating') {
            const visualOwner: AgentId = task.visualPhase === 'crisWork' || task.owner === 'cris' ? 'cris' : 'vera';
            const slot = floatingSlotsByOwner.get(visualOwner) ?? 0;
            floatingSlotsByOwner.set(visualOwner, slot + 1);
            const agent = visualOwner === 'vera' ? veraAnim.point : crisAnim.point;
            const side = visualOwner === 'vera' ? -1 : 1;
            return { x: agent.x + side * 46, y: agent.y - 30 + slot * 18 };
          }
          if (role === 'done') {
            const slot = traySlotsByOwner.get('cris') ?? 0;
            traySlotsByOwner.set('cris', slot + 1);
            return { x: layout.cols * TILE - 58, y: (layout.rows - 2) * TILE - 20 - slot * 24 };
          }
          const owner = task.status === 'bloqueado' ? 'decision' : task.owner;
          const slot = traySlotsByOwner.get(owner) ?? 0;
          traySlotsByOwner.set(owner, slot + 1);
          const base = tileCenter(routeForOwner(owner));
          if (owner === 'entrada') return { x: base.x + (slot % 3) * 38 - 38, y: base.y + 18 + Math.floor(slot / 3) * 28 };
          if (owner === 'decision') return { x: base.x - 44, y: base.y + 8 + slot * 26 };
          return { x: base.x + 56, y: base.y - 26 + slot * 24 };
        };
        const taskTargets = new Map<number, Point>();
        tasks.forEach((task) => taskTargets.set(task.id, taskTargetPoint(task)));
        const liveTaskIds = new Set(tasks.map((task) => task.id));
        Object.keys(taskMotionRef.current).forEach((id) => {
          if (!liveTaskIds.has(Number(id))) delete taskMotionRef.current[Number(id)];
        });

        tasks.forEach((task) => {
          const targetPoint = taskTargets.get(task.id)!;
          const role = taskVisualRole(task);
          const existingMotion = taskMotionRef.current[task.id];
          const transferSource = { x: veraAnim.point.x - 46, y: veraAnim.point.y - 30 };
          const motion = existingMotion ?? { point: role === 'transfer' ? transferSource : taskSourcePoint(task), target: targetPoint, moving: false };
          motion.target = targetPoint;
          const followsAgent = role === 'floating';
          const speed = role === 'transfer' ? 230 : TASK_SPEED_PX_PER_SEC;
          const nextMotion = followsAgent ? { point: targetPoint, moving: false } : movePoint(motion.point, motion.target, speed, dt);
          motion.point = nextMotion.point;
          motion.moving = nextMotion.moving;
          taskMotionRef.current[task.id] = motion;
          if (role === 'transfer' && task.visualPhase === 'transferToCris' && !motion.moving) emitVisualPhaseComplete('transferToCris', task.id);
          const anim = { point: motion.point, dir: 'down' as Direction, moving: motion.moving };
          const badge = task.status === 'resuelto' ? '✓ OK' : task.status === 'bloqueado' ? '⚠ DECIDE' : role === 'transfer' ? '→ B' : task.status === 'trabajando' ? 'WORK' : task.kind === 'bug' ? 'BUG' : task.kind === 'email' ? 'MAIL' : 'WA';
          const badgeW = role === 'floating' ? 44 : role === 'transfer' ? 52 : task.status === 'bloqueado' ? 72 : task.status === 'resuelto' ? 54 : 42;
          const badgeH = role === 'floating' || role === 'transfer' ? 20 : 26;
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          ctx.beginPath();
          ctx.ellipse(anim.point.x, anim.point.y + badgeH / 2, role === 'floating' ? 13 : 18, role === 'floating' ? 4 : 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = role === 'floating' ? 0.82 : role === 'transfer' ? 0.9 : 1;
          ctx.fillStyle = statusColor[task.status];
          ctx.strokeStyle = selectedId === task.id ? '#ffffff' : task.status === 'bloqueado' ? '#ffffff' : 'rgba(255,255,255,.58)';
          ctx.lineWidth = selectedId === task.id || task.status === 'bloqueado' ? 2 : 1;
          ctx.beginPath();
          ctx.roundRect(anim.point.x - badgeW / 2, anim.point.y - badgeH / 2, badgeW, badgeH, 6);
          ctx.fill();
          ctx.stroke();
          if (task.status === 'trabajando' && role !== 'floating') {
            ctx.fillStyle = 'rgba(255,255,255,.45)';
            ctx.fillRect(anim.point.x - badgeW / 2 + 5, anim.point.y + 8, (badgeW - 10) * (0.35 + (seconds % 1.2) / 1.2 * 0.55), 3);
          }
          ctx.fillStyle = '#10151f';
          ctx.font = role === 'floating' || role === 'transfer' ? '800 9px Inter, system-ui' : '900 10px Inter, system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(badge, anim.point.x, anim.point.y + (role === 'floating' || role === 'transfer' ? 3 : 4));
          ctx.textAlign = 'start';
          ctx.globalAlpha = 1;
        });

        // agents
        const agentGlow = (p: Point, color: string, active: boolean) => {
          ctx.fillStyle = color;
          ctx.globalAlpha = active ? 0.38 + Math.sin(time / 120) * 0.12 : 0.12;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y + 10, active ? 30 : 22, active ? 12 : 8, 0, 0, Math.PI * 2);
          ctx.fill();
          if (active) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.72 + Math.sin(time / 140) * 0.18;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y + 10, 34, 15, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        };
        agentGlow(veraAnim.point, '#2f9fd7', veraState !== 'idle');
        drawSprite(ctx, veraImg, veraAnim.point.x, veraAnim.point.y, veraAnim.dir, veraFrame);
        agentGlow(crisAnim.point, crisState === 'blocked' ? '#ff5d5d' : '#ffca7a', crisState !== 'idle');
        drawSprite(ctx, crisImg, crisAnim.point.x, crisAnim.point.y, crisAnim.dir, crisFrame);

        const typingEffect = (point: Point, active: boolean, color: string) => {
          if (!active) return;
          const dots = 1 + Math.floor((time / 240) % 3);
          const text = `⌨${'.'.repeat(dots)}`;
          ctx.fillStyle = 'rgba(8,12,20,.86)';
          ctx.beginPath();
          ctx.roundRect(point.x + 17, point.y - 59, 42, 22, 7);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.font = '900 12px Inter, system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(text, point.x + 38, point.y - 44);
          ctx.textAlign = 'start';
        };
        typingEffect(veraAnim.point, veraState === 'working' && /tecleando|leyendo|respondiendo|clasificando/.test(veraHumanLabel), '#8dd7ff');
        typingEffect(crisAnim.point, crisState === 'working' && /tecleando|leyendo|diagnosticando|respondiendo/.test(crisHumanLabel), '#ffca7a');

        const nameTag = (name: string, point: Point, color: string, label: string) => {
          const text = `${name} · ${label}`;
          const w = Math.max(76, text.length * 6.5 + 18);
          ctx.fillStyle = 'rgba(8,12,20,.82)';
          ctx.beginPath();
          ctx.roundRect(point.x - w / 2, point.y - 72, w, 24, 8);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.font = '800 11px Inter, system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(text, point.x, point.y - 56);
          ctx.textAlign = 'start';
        };
        nameTag('Agent A', veraAnim.point, '#8dd7ff', veraHumanLabel);
        nameTag('Agent B', crisAnim.point, crisState === 'blocked' ? '#ff8a8a' : '#ffca7a', crisHumanLabel);

        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    });

    const logicalPointFromEvent = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * ((layout.cols * TILE) / rect.width), y: (event.clientY - rect.top) * ((layout.rows * TILE) / rect.height) };
    };
    const tileFromEvent = (event: PointerEvent): Tile => {
      const point = logicalPointFromEvent(event);
      return { col: Math.floor(point.x / TILE), row: Math.floor(point.y / TILE) };
    };
    const elementAtPointer = (event: PointerEvent): PlacedElement | undefined => {
      const { x, y } = logicalPointFromEvent(event);
      return [...placedElements].reverse().find((item) => {
        const meta = catalogByType[item.type];
        if (!meta) return false;
        const w = meta.w * TILE;
        const h = meta.h * TILE;
        const left = item.col * TILE + TILE / 2 - w / 2;
        const top = item.row * TILE + TILE / 2 - h / 2 + (meta.yOffset ?? 0);
        return x >= left && x <= left + w && y >= top && y <= top + h;
      });
    };
    const agentAtPointer = (event: PointerEvent): AgentId | undefined => {
      const { x, y } = logicalPointFromEvent(event);
      return (['cris', 'vera'] as AgentId[]).find((id) => {
        const point = tileCenter(agentTiles[id]);
        return x >= point.x - FRAME_W * FRAME_SCALE / 2 && x <= point.x + FRAME_W * FRAME_SCALE / 2 && y >= point.y - FRAME_H * FRAME_SCALE + 12 && y <= point.y + 14;
      });
    };
    const handlePointerDown = (event: PointerEvent) => {
      const { x, y } = logicalPointFromEvent(event);
      const tile = tileFromEvent(event);
      if (editorMode && selectedElement) {
        event.preventDefault();
        const hitElement = elementAtPointer(event);
        if (selectedElement === 'erase') {
          if (hitElement) onEraseElement(hitElement.id);
        } else if (selectedElement.startsWith('assign:')) {
          if (hitElement && techTypes.has(hitElement.type)) onAssignComputer(selectedElement.split(':')[1] as AgentId, hitElement.id);
        } else if (selectedElement.startsWith('anchor:')) {
          onMoveAnchor(selectedElement.split(':')[1] as AnchorId, tile);
        } else if (selectedElement === 'move') {
          const hitAgent = agentAtPointer(event);
          const dragTarget = hitAgent ? { kind: 'agent' as const, id: hitAgent } : hitElement ? { kind: 'element' as const, id: hitElement.id } : null;
          dragStateRef.current = { kind: dragTarget?.kind ?? null, id: dragTarget?.id ?? null, pointerId: dragTarget ? event.pointerId : null, lastTile: dragTarget ? key(tile) : null };
          if (dragTarget) {
            canvas.setPointerCapture(event.pointerId);
            document.body.style.userSelect = 'none';
          }
        } else {
          onPlaceElement(selectedElement, tile);
        }
        return;
      }
      const hit = tasks.find((task, index) => {
        const point = tileCenter(routeForOwner(task.owner));
        return Math.abs(x - (point.x + (index % 3) * 10 - 10)) < 24 && Math.abs(y - (point.y + TILE * 0.45 + Math.floor(index / 3) * 10)) < 24;
      });
      if (hit) onSelect(hit.id);
    };
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!editorMode || selectedElement !== 'move' || !drag.id) return;
      event.preventDefault();
      const tile = tileFromEvent(event);
      const tileKey = key(tile);
      if (tileKey === drag.lastTile) return;
      dragStateRef.current.lastTile = tileKey;
      if (drag.kind === 'agent') onMoveAgent(drag.id as AgentId, tile);
      else onMoveElement(drag.id, tile);
    };
    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (drag.id && drag.pointerId === event.pointerId && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      dragStateRef.current = { kind: null, id: null, pointerId: null, lastTile: null };
      document.body.style.userSelect = '';
    };
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      lastFrameRef.current = null;
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [canvasRef, tasks, selectedId, onSelect, editorMode, selectedElement, placedElements, onPlaceElement, onEraseElement, onMoveElement, onMoveAgent, onAssignComputer, onMoveAnchor, onVisualPhaseComplete, agentTiles, anchors, anchorDirections, debugLogs, viewScale]);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tasks, setTasks] = useState<OfficeTask[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<EditorTool | null>('move');
  const [placedElements, setPlacedElements] = useState<PlacedElement[]>(() => {
    try {
      const saved = window.localStorage.getItem('oficina-pixel-layout-elements');
      const version = window.localStorage.getItem('oficina-pixel-layout-version');
      if (!saved) return applyDefaultComputerAssignments(initialPlacedElements);
      const parsed = JSON.parse(saved) as PlacedElement[];
      return version === 'layout-david-15' ? applyDefaultComputerAssignments(parsed) : applyDefaultComputerAssignments(initialPlacedElements);
    }
    catch { return initialPlacedElements; }
  });
  const [agentTiles, setAgentTiles] = useState<AgentTiles>(() => {
    try {
      const saved = window.localStorage.getItem('oficina-pixel-agent-tiles');
      const version = window.localStorage.getItem('oficina-pixel-layout-version');
      return saved && version === 'layout-david-15' ? { ...initialAgentTiles, ...JSON.parse(saved) as Partial<AgentTiles> } : initialAgentTiles;
    }
    catch { return initialAgentTiles; }
  });
  const [anchors, setAnchors] = useState<OfficeAnchors>(() => {
    try {
      const saved = window.localStorage.getItem('oficina-pixel-layout-anchors');
      return saved ? { ...initialAnchors, ...JSON.parse(saved) as Partial<OfficeAnchors> } : initialAnchors;
    }
    catch { return initialAnchors; }
  });
  const [anchorDirections, setAnchorDirections] = useState<OfficeAnchorDirections>(() => {
    try {
      const saved = window.localStorage.getItem('oficina-pixel-anchor-directions');
      return saved ? { ...initialAnchorDirections, ...JSON.parse(saved) as Partial<OfficeAnchorDirections> } : initialAnchorDirections;
    }
    catch { return initialAnchorDirections; }
  });
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [liveSimulator, setLiveSimulator] = useState(false);
  const [visualTestMode, setVisualTestMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState(() => {
    try { return window.localStorage.getItem('oficina-debug-logs') === '1' || new URLSearchParams(window.location.search).has('officeDebug'); }
    catch { return false; }
  });
  const [viewScale, setViewScale] = useState(1);
  const [runtimeResetKey, setRuntimeResetKey] = useState(0);
  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) ?? tasks[0], [tasks, selectedId]);
  const demoTimersRef = useRef<number[]>([]);
  const cleanDemoQueueRef = useRef<DemoStep[]>([]);
  const cleanDemoTaskIdRef = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem('oficina-pixel-layout-version', 'layout-david-15');
    window.localStorage.setItem('oficina-pixel-layout-elements', JSON.stringify(placedElements));
  }, [placedElements]);

  useEffect(() => {
    window.localStorage.setItem('oficina-pixel-agent-tiles', JSON.stringify(agentTiles));
  }, [agentTiles]);

  useEffect(() => {
    window.localStorage.setItem('oficina-pixel-layout-anchors', JSON.stringify(anchors));
  }, [anchors]);

  useEffect(() => {
    window.localStorage.setItem('oficina-pixel-anchor-directions', JSON.stringify(anchorDirections));
  }, [anchorDirections]);

  useEffect(() => {
    window.localStorage.setItem('oficina-debug-logs', debugLogs ? '1' : '0');
  }, [debugLogs]);

  function isEditableTile(tile: Tile) {
    return tile.col > 0 && tile.row > 0 && tile.col < layout.cols - 1 && tile.row < layout.rows - 1;
  }

  function placeElement(type: ElementType, tile: Tile) {
    if (!isEditableTile(tile)) return;
    setPlacedElements((current) => [
      ...current,
      { id: `${type}-${Date.now()}`, type, col: tile.col, row: tile.row },
    ]);
  }

  function eraseElement(id: string) {
    setPlacedElements((current) => current.filter((item) => item.id !== id));
  }

  function moveElement(id: string, tile: Tile) {
    if (!isEditableTile(tile)) return;
    setPlacedElements((current) => {
      const moving = current.find((item) => item.id === id);
      if (!moving || (moving.col === tile.col && moving.row === tile.row)) return current;
      return [
        ...current.filter((item) => item.id !== id),
        { ...moving, col: tile.col, row: tile.row },
      ];
    });
  }

  function moveAgent(id: AgentId, tile: Tile) {
    if (!isEditableTile(tile)) return;
    setAgentTiles((current) => current[id].col === tile.col && current[id].row === tile.row ? current : { ...current, [id]: tile });
  }

  function assignComputer(agent: AgentId, elementId: string) {
    setPlacedElements((current) => current.map((item) => item.id === elementId ? { ...item, assignedTo: agent } : item.assignedTo === agent ? { ...item, assignedTo: undefined } : item));
  }

  function moveAnchor(id: AnchorId, tile: Tile) {
    if (!isEditableTile(tile)) return;
    setAnchors((current) => ({ ...current, [id]: tile }));
  }

  function setAnchorDirection(id: AnchorId, dir: Direction) {
    setAnchorDirections((current) => ({ ...current, [id]: dir }));
  }

  function resetEditorLayout() {
    setPlacedElements(applyDefaultComputerAssignments(initialPlacedElements));
    setAgentTiles(initialAgentTiles);
    setAnchors(initialAnchors);
    setAnchorDirections(initialAnchorDirections);
    setTimeline((current) => [{ id: Date.now(), text: 'Layout restaurado al mobiliario inicial editable', status: 'resuelto' as TaskStatus, at: nowTime() }, ...current].slice(0, 8));
  }

  async function copyEditorLayout() {
    const json = JSON.stringify({ elements: placedElements, anchors, anchorDirections }, null, 2);
    try { await navigator.clipboard.writeText(json); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setTimeline((current) => [{ id: Date.now(), text: 'Layout editable copiado al portapapeles', status: 'resuelto' as TaskStatus, at: nowTime() }, ...current].slice(0, 8));
  }

  function playCleanDemoStep(index: number) {
    const step = cleanDemoQueueRef.current[index];
    if (!step) return;
    setTasks([step.task]);
    setSelectedId(step.task.id);
    const label = step.task.detail || step.task.title;
    setTimeline((current) => [{ id: Date.now() + index, text: label, status: step.task.status, at: nowTime() }, ...current].slice(0, 8));
    if (step.durationMs) {
      const timer = window.setTimeout(() => playCleanDemoStep(index + 1), step.durationMs);
      demoTimersRef.current.push(timer);
    }
  }

  function handleVisualPhaseComplete(phase: VisualPhase, taskId: number) {
    if (cleanDemoTaskIdRef.current !== taskId) return;
    const currentIndex = cleanDemoQueueRef.current.findIndex((step) => step.task.id === taskId && step.waitFor === phase && tasks.some((task) => task.id === taskId && task.visualPhase === phase));
    if (currentIndex < 0) return;
    playCleanDemoStep(currentIndex + 1);
  }

  usePixelOffice(canvasRef, tasks, selectedId, setSelectedId, runtimeResetKey, viewScale, editorMode, selectedElement, placedElements, agentTiles, anchors, anchorDirections, debugLogs, placeElement, eraseElement, moveElement, moveAgent, assignComputer, moveAnchor, handleVisualPhaseComplete);

  function applyOfficeEvent(event: OfficeEvent, source: OfficeEventSource = 'simulator') {
    officeDebugLog(debugLogs, 'map', { eventId: event.eventId ?? event.taskId, type: event.type, taskId: event.taskId, owner: event.type === 'task.assigned_to_cris' ? 'cris' : event.type === 'task.assigned_to_vera' ? 'vera' : '-' });
    setTasks((current) => {
      const existing = current.find((task) => task.id === event.taskId);
      const next = taskFromEvent(event, existing);
      officeDebugLog(debugLogs, 'task', { eventId: event.eventId ?? event.taskId, taskId: next.id, status: next.status, owner: next.owner, fromOwner: next.fromOwner ?? '-', reactingOwner: next.reactingOwner ?? '-' });
      return existing ? current.map((task) => task.id === event.taskId ? next : task).slice(-6) : [...current.slice(-5), next];
    });
    setSelectedId(event.taskId);
    setTimeline((current) => [{ id: Date.now(), text: describeOfficeEvent(event, source), status: taskFromEvent(event).status, at: nowTime() }, ...current].slice(0, 8));
    window.setTimeout(() => {
      setTasks((current) => current.map((task) => task.id === event.taskId ? { ...task, fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined } : task));
    }, TASK_TRANSFER_CLEAR_MS);
  }

  useEffect(() => {
    if (!liveSimulator) return;
    const titles = ['WhatsApp familia', 'Bug backend', 'Email urgente', 'Decisión presupuesto', 'Alerta servidor', 'Factura pendiente'];
    const kinds: OfficeTask['kind'][] = ['whatsapp', 'bug', 'email', 'decision', 'bug', 'email'];
    let tick = 0;
    let nextTaskAt = 0;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const notes: TimelineEvent[] = [];
      setTasks((current) => {
        let next = current.map((task) => ({ ...task }));
        if (tick >= nextTaskAt) {
          const index = Math.floor(Math.random() * titles.length);
          const id = now + tick;
          next.push({ id, title: titles[index], kind: kinds[index], owner: 'entrada', status: 'esperando', detail: 'Tarea esperando en la cola de entrada.', updatedAt: now });
          notes.push({ id, text: `Cola entrada: llega ${titles[index]}`, status: 'esperando', at: nowTime() });
          nextTaskAt = tick + 1 + Math.floor(Math.random() * 3);
        }

        const veraBusy = next.some((task) => task.owner === 'vera' && task.status === 'trabajando');
        const crisBusy = next.some((task) => task.owner === 'cris' && task.status === 'trabajando');
        const entrada = next.find((task) => task.owner === 'entrada' && task.status === 'esperando');
        if (!veraBusy && entrada) {
          entrada.fromOwner = 'entrada';
          entrada.owner = 'vera';
          entrada.status = 'trabajando';
          entrada.reactingOwner = 'vera';
          entrada.pauseLabel = 'clasificando…';
          entrada.detail = 'El agente A recoge una tarea de la cola de entrada.';
          entrada.updatedAt = now;
          notes.push({ id: now + 1, text: `Agente A toma: ${entrada.title}`, status: 'trabajando', at: nowTime() });
        }

        const veraTask = next.find((task) => task.owner === 'vera' && task.status === 'trabajando' && now - (task.updatedAt ?? now) > 4200);
        if (veraTask) {
          const solveInVera = veraTask.kind === 'email' && Math.random() < 0.35;
          if (solveInVera) {
            veraTask.status = 'resuelto';
            veraTask.reactingOwner = 'vera';
            veraTask.pauseLabel = 'resuelto';
            veraTask.detail = 'El agente A resolvió la tarea sin derivarla.';
            veraTask.updatedAt = now;
            notes.push({ id: now + 2, text: `Agente A resuelve: ${veraTask.title}`, status: 'resuelto' as TaskStatus, at: nowTime() });
          } else if (!crisBusy) {
            veraTask.fromOwner = 'vera';
            veraTask.owner = 'cris';
            veraTask.status = 'trabajando';
            veraTask.reactingOwner = 'cris';
            veraTask.pauseLabel = 'diagnosticando…';
            veraTask.detail = 'El agente A deriva la tarea al agente B.';
            veraTask.updatedAt = now;
            notes.push({ id: now + 3, text: `Agente A deriva a agente B: ${veraTask.title}`, status: 'trabajando', at: nowTime() });
          }
        }

        const crisTask = next.find((task) => task.owner === 'cris' && task.status === 'trabajando' && now - (task.updatedAt ?? now) > 3600);
        if (crisTask) {
          const blocked = crisTask.kind === 'decision' || (crisTask.kind === 'bug' && Math.random() < 0.45);
          crisTask.fromOwner = 'cris';
          crisTask.owner = blocked ? 'decision' : 'cris';
          crisTask.status = blocked ? 'bloqueado' : 'resuelto';
          crisTask.kind = blocked ? 'decision' : crisTask.kind;
          crisTask.reactingOwner = blocked ? 'decision' : 'cris';
          crisTask.pauseLabel = blocked ? 'necesita decisión' : 'resuelto';
          crisTask.detail = blocked ? 'El agente B necesita decisión humana para continuar.' : 'El agente B resolvió la tarea.';
          crisTask.updatedAt = now;
          notes.push({ id: now + 4, text: blocked ? `Agente B bloquea: ${crisTask.title}` : `Agente B resuelve: ${crisTask.title}`, status: crisTask.status, at: nowTime() });
        }

        next = next.filter((task) => task.status !== 'resuelto' || now - (task.updatedAt ?? now) < 9000).slice(-8);
        return next;
      });
      if (notes.length) {
        setTimeline((current) => [...notes.reverse(), ...current].slice(0, 8));
        setSelectedId(notes[0].id);
      }
      tick += 1;
    }, 900);
    return () => window.clearInterval(interval);
  }, [liveSimulator]);

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as InboundOfficeEvent;
        officeDebugLog(debugLogs, 'sse', { eventId: event.id ?? '-', type: event.type, target: event.target ?? '-' });
        if (event.type === 'whatsapp.received') startEventFlow(event);
        if (event.type === 'whatsapp.reply_sent') finishCurrentEventFlow(event);
        if (event.type === 'assigned_to_cris' || event.type === 'task.assigned_to_cris') {
          startEventFlow({ ...event, type: 'whatsapp.received', target: 'cris' });
        }
        if (event.type === 'assigned_to_vera' || event.type === 'task.assigned_to_vera') {
          startEventFlow({ ...event, type: 'whatsapp.received', target: 'vera' });
        }
      } catch { /* ignore malformed event */ }
    };
    source.onerror = () => {
      setTimeline((current) => current.length ? current : [{ id: Date.now(), text: 'Esperando conexión de eventos reales…', status: 'esperando', at: nowTime() }]);
    };
    return () => source.close();
  }, [debugLogs]);

  // Entrada futura: sustituir applyOfficeEvent(event, 'simulator') por eventos llegados de WebSocket/SSE.

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
    }, TASK_TRANSFER_CLEAR_MS);
  }

  function clearDemoTimers() {
    demoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    demoTimersRef.current = [];
    cleanDemoQueueRef.current = [];
    cleanDemoTaskIdRef.current = null;
  }

  function startEventFlow(inbound?: InboundOfficeEvent) {
    clearDemoTimers();
    setLiveSimulator(false);
    setRuntimeResetKey((value) => value + 1);
    const id = inbound?.id ?? Date.now();
    cleanDemoTaskIdRef.current = id;
    const title = inbound?.type === 'whatsapp.received' ? 'WhatsApp real' : 'Evento oficina';
    const assignee: AgentId = inbound?.target === 'cris' ? 'cris' : 'vera';
    const assigneeName = assignee === 'cris' ? 'Agent B' : 'Agent A';
    cleanDemoQueueRef.current = [
      { task: { id, title, kind: 'whatsapp', status: 'esperando', owner: 'entrada', detail: 'Entra WhatsApp real junto al ordenador de entrada.' }, durationMs: 500 },
      { task: { id, title, kind: 'whatsapp', status: 'esperando', owner: 'entrada', reactingOwner: assignee, pauseLabel: 'recogiendo…', visualPhase: 'toWhatsappArrival', detail: `${assigneeName} va al punto donde llegó el WhatsApp.` }, waitFor: 'toWhatsappArrival' },
      { task: { id, title, kind: 'whatsapp', status: 'trabajando', owner: assignee, fromOwner: 'entrada', reactingOwner: assignee, pauseLabel: 'leyendo / tecleando…', visualPhase: assignee === 'cris' ? 'crisWork' : 'entradaWork', detail: `${assigneeName} vuelve a su puesto, lee el WhatsApp y teclea la respuesta.` } },
    ];
    playCleanDemoStep(0);
  }

  function finishCurrentEventFlow(inbound?: InboundOfficeEvent) {
    const id = cleanDemoTaskIdRef.current ?? tasks.find((task) => task.status === 'trabajando')?.id ?? inbound?.id ?? Date.now();
    clearDemoTimers();
    cleanDemoTaskIdRef.current = null;
    setTasks((current) => {
      const existing = current.find((task) => task.id === id) ?? current.find((task) => task.status === 'trabajando');
      const resolved: OfficeTask = {
        id,
        title: existing?.title ?? 'WhatsApp real',
        kind: existing?.kind ?? 'whatsapp',
        status: 'resuelto',
        owner: existing?.owner === 'cris' ? 'cris' : 'vera',
        reactingOwner: existing?.owner === 'cris' ? 'cris' : 'vera',
        pauseLabel: 'respuesta enviada',
        detail: 'Respuesta enviada en WhatsApp. Ahora sí queda marcado como OK.',
      };
      return existing ? current.map((task) => task.id === existing.id ? resolved : task) : [resolved];
    });
    setSelectedId(id);
    setTimeline((current) => [{ id: Date.now(), text: 'Respuesta real enviada · OK', status: 'resuelto' as TaskStatus, at: nowTime() }, ...current].slice(0, 8));
  }

  function startWhatsAppFlow() {
    clearDemoTimers();
    const id = Date.now();
    const flow: OfficeTask[] = [
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'esperando', owner: 'entrada', detail: 'Entra un WhatsApp nuevo por recepción.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'trabajando', fromOwner: 'entrada', reactingOwner: 'vera', pauseLabel: 'clasificando…', owner: 'vera', detail: 'El agente A recoge el WhatsApp y lo clasifica.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'trabajando', fromOwner: 'vera', reactingOwner: 'cris', pauseLabel: 'diagnosticando…', owner: 'cris', detail: 'El agente A lo deriva al agente B para resolución técnica.' },
      { id, title: 'WhatsApp automático', kind: 'whatsapp', status: 'resuelto', fromOwner: 'cris', reactingOwner: 'cris', pauseLabel: 'resuelto', owner: 'cris', detail: 'El agente B termina la tarea y deja tarjeta verde.' },
    ];
    const notes = ['Entra WhatsApp automático en recepción', 'El agente A recoge y clasifica el WhatsApp', 'El agente A deriva la tarea al agente B', 'El agente B resuelve y deja tarjeta verde'];
    setSelectedId(id);
    flow.forEach((snapshot, step) => {
      window.setTimeout(() => {
        setTasks((current) => current.some((task) => task.id === id) ? current.map((task) => task.id === id ? snapshot : task) : [...current, snapshot]);
        setTimeline((current) => [{ id: Date.now() + step, text: notes[step], status: snapshot.status, at: nowTime() }, ...current].slice(0, 8));
        window.setTimeout(() => {
          setTasks((current) => current.map((task) => task.id === id ? { ...task, fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined } : task));
        }, TASK_TRANSFER_CLEAR_MS);
      }, step * DEMO_FLOW_STEP_MS);
    });
  }

  function startBlockedFlow() {
    clearDemoTimers();
    const id = Date.now();
    const flow: OfficeTask[] = [
      { id, title: 'WhatsApp bloqueado', kind: 'whatsapp', status: 'esperando', owner: 'entrada', detail: 'Entra un WhatsApp que acabará necesitando decisión humana.' },
      { id, title: 'WhatsApp bloqueado', kind: 'whatsapp', status: 'trabajando', fromOwner: 'entrada', reactingOwner: 'vera', pauseLabel: 'clasificando…', owner: 'vera', detail: 'Agente A clasifica el mensaje y detecta que es técnico.' },
      { id, title: 'WhatsApp bloqueado', kind: 'whatsapp', status: 'trabajando', fromOwner: 'vera', reactingOwner: 'cris', pauseLabel: 'diagnosticando…', owner: 'cris', detail: 'El agente B analiza la tarea, pero falta una decisión humana.' },
      { id, title: 'Necesita decisión', kind: 'decision', status: 'bloqueado', fromOwner: 'cris', reactingOwner: 'decision', pauseLabel: 'necesita decisión', owner: 'decision', detail: 'Bloqueado: necesita decisión humana antes de continuar.' },
    ];
    const notes = ['Entra tarea que puede bloquearse', 'Agente A clasifica la tarea', 'Agente A deriva a agente B', 'Agente B bloquea: necesita decisión humana'];
    setSelectedId(id);
    flow.forEach((snapshot, step) => {
      window.setTimeout(() => {
        setTasks((current) => current.some((task) => task.id === id) ? current.map((task) => task.id === id ? snapshot : task) : [...current, snapshot]);
        setTimeline((current) => [{ id: Date.now() + step, text: notes[step], status: snapshot.status, at: nowTime() }, ...current].slice(0, 8));
        if (step < flow.length - 1) {
          window.setTimeout(() => {
            setTasks((current) => current.map((task) => task.id === id ? { ...task, fromOwner: undefined, reactingOwner: undefined, pauseLabel: undefined } : task));
          }, TASK_TRANSFER_CLEAR_MS);
        }
      }, step * DEMO_FLOW_STEP_MS);
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
          <p className="eyebrow">Preview pixel-agents</p>
          <h1>Pixel Agents Web</h1>
        </div>
        <div className="actions">
          {[1, 1.5, 2].map((scale) => (
            <button key={scale} className={viewScale === scale ? 'primary small' : 'small'} onClick={() => setViewScale(scale)}>Vista {scale === 1 ? 'normal' : `x${scale}`}</button>
          ))}
          <button className={debugLogs ? 'primary small' : 'small'} onClick={() => setDebugLogs((value) => !value)}>Debug logs</button>
          <button className={editorMode ? 'primary small' : 'small'} onClick={() => setEditorMode((value) => !value)}>Editor elementos</button>
          <button className="small" onClick={copyEditorLayout}>Copiar layout</button>
        </div>
      </header>
      <section className="layout">
        <div className="scene pixel-scene">
          <canvas ref={canvasRef} />
          {editorMode && (
            <div className="element-editor">
              <div className="editor-tools">
                <strong>Librería</strong>
                <button className={selectedElement === 'move' ? 'primary small' : 'small'} onClick={() => setSelectedElement('move')}>Mover</button>
                <button className={selectedElement === 'erase' ? 'danger small' : 'small'} onClick={() => setSelectedElement('erase')}>Borrar</button>
                <button className={selectedElement === 'assign:vera' ? 'primary small' : 'small'} onClick={() => setSelectedElement('assign:vera')}>PC agente A</button>
                <button className={selectedElement === 'assign:cris' ? 'primary small' : 'small'} onClick={() => setSelectedElement('assign:cris')}>PC agente B</button>
                <button className="small" onClick={() => setPlacedElements([])}>Limpiar todo</button>
                <button className="small" onClick={resetEditorLayout}>Reset inicial</button>
              </div>
              <details className="editor-category" open>
                <summary>Puntos</summary>
                <div>
                  {([['whatsappArrival', 'Llega mensaje'], ['entradaWork', 'Leer/teclear WA'], ['veraWork', 'Trabajo agente A'], ['crisWork', 'Trabajo agente B'], ['veraToCris', 'Entrega A→B'], ['decision', 'Decisiones']] as const).map(([id, label]) => (
                    <button key={id} className={selectedElement === `anchor:${id}` ? 'primary small' : 'small'} onClick={() => setSelectedElement(`anchor:${id}`)}>{label}</button>
                  ))}
                </div>
                {selectedElement?.startsWith('anchor:') && (() => {
                  const anchorId = selectedElement.split(':')[1] as AnchorId;
                  return <div>
                    {([['up', '↑'], ['right', '→'], ['down', '↓'], ['left', '←']] as const).map(([dir, label]) => (
                      <button key={dir} className={anchorDirections[anchorId] === dir ? 'primary small' : 'small'} onClick={() => setAnchorDirection(anchorId, dir)}>{label}</button>
                    ))}
                  </div>;
                })()}
              </details>
              {catalogCategories.map((category) => (
                <details className="editor-category" key={category} open={['Mesas', 'Sillas', 'Electrónica'].includes(category)}>
                  <summary>{category}</summary>
                  <div>
                    {elementCatalog.filter((item) => item.category === category).map((item) => (
                      <button key={item.type} className={selectedElement === item.type ? 'primary small' : 'small'} onClick={() => setSelectedElement(item.type)}>{item.label}</button>
                    ))}
                  </div>
                </details>
              ))}
              <span>Mover: arrastra elementos o personajes. Puntos coloca recuadros y flechas de orientación. PC agente A/B asigna un ordenador real. Puedes apilar teclado o monitor encima de una mesa.</span>
            </div>
          )}
        </div>
        <aside className={visualTestMode ? 'panel visual-test-panel' : 'panel'}>
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
          <p className="eyebrow">Lectura principal</p>
          <p>La escena debe contar lo básico sin leer logs: entra una tarea, los agentes la toman, se trabaja, se bloquea o se resuelve.</p>
          <section className="legend">
            <p className="eyebrow">Leyenda</p>
            {(['esperando', 'trabajando', 'bloqueado', 'resuelto'] as TaskStatus[]).map((status) => (
              <span key={status}><i className={status} />{statusText[status]}</span>
            ))}
          </section>
          {!visualTestMode && <section className="timeline debug-timeline">
            <p className="eyebrow">Detalle / debug</p>
            {timeline.map((event) => (
              <article key={event.id}>
                <i className={event.status} />
                <div><strong>{event.at}</strong><p>{event.text}</p></div>
              </article>
            ))}
          </section>}
          <p className="hint">{visualTestMode ? 'Modo prueba visual: valida la escena sin subtítulos ni timeline.' : 'El timeline queda como detalle; la historia principal debe leerse en la oficina.'}</p>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
