# STATUS · Oficina Familia

## Estado

MVP visual inicial desplegado y evolucionando hacia oficina viva.

## Hecho

- Repo inicial creado y subido.
- React/Vite + PixiJS configurado.
- Build verificado.
- Docker/compose preparado para Backuptools puerto `4400`.
- Prototipo ajustado para arrancar con tres tareas visibles:
  - WhatsApp entrante en bandeja de entrada.
  - Bug técnico en mesa de Cris.
  - Tarea resuelta como tarjeta verde.
- Timeline operativo visible.
- Leyenda de estados.
- Simulación automática de flujo WhatsApp resuelto.
- Simulación automática de flujo bloqueado: entrada → Vera → Cris → Decisiones David.
- Despliegue activo en Backuptools: `http://backuptools:4400/`.
- Movimiento visual de tareas entre zonas.
- Reacción simple de Vera/Cris mediante brillo y bounce.
- Zona de Decisiones David destacada cuando una tarea queda bloqueada.
- Primera integración de assets Kenney Isometric Miniature Library: alfombras, mesas, sillas, estantería/display y sombras de tareas.
- Mejora de lectura visual: badges de zona, etiquetas de tipo de tarea, agentes con rol y distinción verde/rojo más evidente.
- Caminos visuales entre entrada, Vera, Cris y decisiones.

## Pendiente inmediato

- Revisión de Cris con criterio de 30 segundos.
- Ajustar lectura visual si el movimiento no se entiende suficiente.
- Integrar assets Kenney Isometric Library después de validar el flujo vivo.

## Última verificación

```bash
npm run build
```
