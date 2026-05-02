# STATUS · Oficina Familia

## Estado

MVP visual actual validado por Cris y desplegado como primera demo operativa presentable.

URL:

```text
http://backuptools:4400/
```

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
- Caminos visuales entre entrada, Vera, Cris y decisiones.
- Assets Kenney integrados y podados, con fuente canónica fijada en Kenney Isometric Library Tiles:
  - ruta estándar: `public/assets/kenney-isometric/`
  - licencia documentada en `docs/ASSETS.md`
  - samples/zips eliminados
  - solo assets usados o candidatos inmediatos.
- Mejora de lectura visual:
  - badges de zona,
  - etiquetas de tipo de tarea,
  - agentes con rol,
  - distinción verde/rojo más evidente.

## Validación Cris

Aprobados los hitos:

1. Flujo vivo básico.
2. Dos finales operativos:
   - verde = resuelto,
   - rojo = necesita decisión humana.
3. Integración/limpieza Kenney.
4. Lectura visual de producto.

Criterio actual cumplido: la demo explica el valor operativo sin leer logs ni panel técnico.

## Demo script

### Flujo verde

- Pulsar `Simular flujo WhatsApp`.
- Esperado: Entrada → Vera clasifica → Cris trabaja → final verde resuelto.

### Flujo rojo

- Pulsar `Simular flujo bloqueado`.
- Esperado: Entrada → Vera clasifica → Cris trabaja → Decisiones David → final rojo `Necesita decisión`.

## Pendiente inmediato

La demo ya es presentable. Siguientes mejoras recomendadas, no bloqueantes:

- Sustituir personajes placeholder por sprites/personajes más reconocibles.
- Mejorar objetos de tarea visuales sin añadir lógica.
- Preparar una capa de eventos simulados más limpia.
- Más adelante, conectar eventos reales de OpenClaw por WebSocket/SSE.
- Revisar que los assets finales vienen del pack canónico: https://kenney-assets.itch.io/isometric-library-tiles

## Última verificación requerida

```bash
npm run build
```

Backuptools debe responder:

```text
HTTP 200 en http://backuptools:4400/
```
