# Pixel Agents Extension

## Propósito

`Pixel Agents` es una extensión visual para probar agentes con animación real sin sustituir ni romper la demo actual.

No reemplaza `visual-room` ni cambia el flujo operativo. Añade una capa alternativa de representación de agentes.

## Principio arquitectónico

Separar tres responsabilidades:

1. **Layout**
   - Define salas, paredes, muebles, zonas y coordenadas.
   - Puede ser isométrico, top-down, pixel art o cualquier otra composición.

2. **Task flow**
   - Mantiene la lógica actual: entrada → Vera → Cris → resuelto/bloqueado.
   - Conserva semántica verde/rojo:
     - verde = resuelto
     - rojo = decisión humana
   - No debe depender del estilo visual.

3. **Agent renderer**
   - Decide cómo se dibuja cada agente.
   - Puede usar:
     - sprite estático,
     - spritesheet animado,
     - placeholder,
     - pixel agent con walking real.

## Estados de agente

Estados mínimos:

- `idle`: agente esperando o disponible.
- `walk`: agente moviéndose hacia un destino.
- `working`: agente ejecutando o procesando una tarea.
- `blocked`: agente detenido porque necesita intervención humana.

Estados opcionales más adelante:

- `talking`
- `thinking`
- `handoff`
- `error`

## Rama propuesta

Crear una rama separada:

```text
pixel-agents
```

Objetivo de la rama:

- probar agentes pixel animados como extensión,
- no mezclar assets ni decisiones visuales con `visual-room`,
- mantener `main` estable.

## Prototipo mínimo

El primer prototipo debería demostrar solo esto:

1. Vera aparece como pixel agent.
2. Cris aparece como pixel agent.
3. Vera puede caminar de recepción hacia pasillo/Cris.
4. Cris puede estar `idle` o `working` en mesa.
5. Una tarea se mueve como ahora.
6. El flujo verde/rojo sigue igual.

No incluir todavía:

- sistema completo de pathfinding,
- editor complejo,
- compra/mezcla masiva de assets,
- rediseño de lógica de tareas.

## Pack candidato

Pack observado como candidato:

```text
2D Pixel Art Modern Office Kit (16x16)
https://joyofgaming.itch.io/2d-pixel-art-modern-office-kit-16x16
```

Motivos:

- declara personaje jugable con `idle`, `walking`, `running` y otras animaciones,
- guardia con `walking`,
- NPCs animados,
- tiles y muebles de oficina,
- spritesheets/PNGs incluidos.

## Cautelas de licencia

Antes de usarlo como base:

1. comprar/descargar legalmente el zip,
2. revisar la licencia incluida dentro del paquete,
3. documentar licencia/fuente en `docs/ASSETS.md`,
4. integrar solo el subset necesario,
5. no asumir permisos por descripción parcial de itch.io.

## Criterio de aceptación

La prueba `pixel-agents` se considera útil si en 30 segundos se entiende:

- quién es Vera,
- quién es Cris,
- que los agentes se mueven de verdad,
- que una tarea viaja entre ellos,
- que verde sigue siendo resuelto,
- que rojo sigue siendo decisión humana.

## Decisión vigente

- No comprar ni integrar assets todavía.
- No mergear a `main`.
- No sustituir `visual-room` por defecto.
- Tratar `Pixel Agents` como una extensión experimental hasta que David valide el estilo.
