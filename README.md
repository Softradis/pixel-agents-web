# Oficina IA · Vera & Cris

Demo operativa en perspectiva isométrica/2.5D para visualizar tareas de asistentes IA como una oficina viva.

## MVP

- Recepción de Vera.
- Mesa técnica de Cris.
- Bandeja de entrada.
- Zona de decisiones humanas de David.
- Tareas como objetos físicos: WhatsApp, email, bug, decisión.
- Estados: esperando, trabajando, bloqueado, resuelto.
- Panel lateral con detalle resumido.
- Consola natural básica.

## Ejecutar local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Despliegue recomendado en Backuptools

Puerto sugerido: `4400`.

```bash
docker compose -f deploy/backuptools/docker-compose.yml up -d --build
```

Primera fase usa eventos simulados. Siguiente fase: conectar eventos reales de OpenClaw por WebSocket/SSE.
