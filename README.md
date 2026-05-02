# Oficina IA · Vera & Cris

Demo operativa en perspectiva isométrica/2.5D para visualizar tareas de asistentes IA como una oficina viva.

URL desplegada en Backuptools:

```text
http://backuptools:4400/
```

## Qué demuestra

La demo convierte eventos abstractos en una escena visual:

- Vera recibe y clasifica tareas.
- Cris resuelve tareas técnicas.
- David aparece como zona de decisión cuando algo se bloquea.
- Verde significa resuelto.
- Rojo significa que necesita decisión humana.
- El timeline resume lo ocurrido sin obligar a leer logs.

## MVP validado

- Recepción de Vera.
- Mesa técnica de Cris.
- Bandeja de entrada.
- Zona de decisiones humanas de David.
- Tareas como objetos físicos: WhatsApp, bug, resuelto, decisión.
- Estados: esperando, trabajando, bloqueado, resuelto.
- Flujos simulados verde y rojo.
- Movimiento visual de tareas entre zonas.
- Reacción simple de Vera/Cris.
- Assets Kenney CC0 integrados de forma ligera.

## Demo script

### 1. Flujo verde: tarea resuelta

1. Abrir `http://backuptools:4400/`.
2. Pulsar `Simular flujo WhatsApp`.
3. Debe verse:
   - entra una tarea en `Entrada`,
   - Vera reacciona y clasifica,
   - la tarea viaja a Cris,
   - Cris trabaja,
   - termina en verde como resuelta,
   - el timeline cuenta los pasos.

### 2. Flujo rojo: necesita decisión

1. Pulsar `Simular flujo bloqueado`.
2. Debe verse:
   - entra una tarea,
   - Vera la clasifica,
   - Cris la analiza,
   - la tarea viaja a `Decisiones`,
   - queda roja con `Necesita decisión`,
   - la zona de David queda destacada.

### 3. Lectura rápida esperada

En 30 segundos debería entenderse:

- qué está entrando,
- quién lo gestiona,
- si terminó bien,
- si quedó bloqueado,
- qué necesita intervención humana.

## Ejecutar local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Despliegue Backuptools

Puerto actual: `4400`.

```bash
docker compose -f deploy/backuptools/docker-compose.yml up -d --build
```

Nota operativa: el despliegue actual en Backuptools sirve la build estática en un contenedor nginx aislado en `4400`, sin tocar Crowpire ni CRM.

## Assets

Ver `docs/ASSETS.md`.

Fuente principal:

- Kenney Isometric Miniature Library
- Licencia: CC0
- Ruta local: `public/assets/kenney-isometric/`

## Siguiente fase propuesta

Después de esta demo presentable:

1. Sustituir personajes placeholder por sprites más reconocibles.
2. Mejorar tareas como objetos visuales específicos.
3. Preparar una capa de eventos simulados más limpia.
4. Más adelante, conectar eventos reales de OpenClaw por WebSocket/SSE.
