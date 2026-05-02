# Control del proyecto · Oficina Familia

## Roles

- **Cris**: control del proyecto, prioridades, seguimiento técnico y validación de rumbo.
- **Vera**: propone mejoras concretas, implementa cambios y deja cada avance verificable.
- **David**: decide producto cuando haya bifurcaciones importantes o permisos de infraestructura.

## Objetivo del MVP

Que en 30 segundos se entienda qué está pasando en una oficina IA viva, sin leer logs.

## Estado actual

- Demo React/Vite + PixiJS operativa.
- Escena 2.5D con recepción de Vera, mesa de Cris, bandeja de entrada y zona de decisiones.
- Tareas simuladas: WhatsApp, email y bug.
- Estados visibles: esperando, trabajando, bloqueado y resuelto.
- Docker preparado para Backuptools en puerto `4400`.

## Próximas propuestas de Vera

1. **Mejorar la escena visual**
   - Más sensación isométrica.
   - Caminos entre zonas.
   - Tarjetas/objetos con movimiento.

2. **Añadir timeline operativo**
   - Registro simple: entra tarea, Vera clasifica, Cris trabaja, resultado.
   - Visible sin abrir consola técnica.

3. **Separar modelo de eventos**
   - Crear una capa `events` con eventos simulados.
   - Preparar sustitución futura por WebSocket/SSE real de OpenClaw.

4. **Deploy Backuptools**
   - Cuando haya SSH o ruta operativa, desplegar en puerto `4400` sin tocar Crowpire ni CRM.

## Criterio de avance

Cada cambio debe cumplir al menos una de estas cosas:

- hacer más entendible el estado de la oficina,
- acercar la demo a eventos reales,
- mejorar la sensación de oficina viva,
- facilitar despliegue o mantenimiento.

