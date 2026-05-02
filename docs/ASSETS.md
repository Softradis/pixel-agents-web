# Assets

## Pack canónico integrado

- **Nombre:** Kenney Isometric Library Tiles
- **Archivo verificado:** `kenney_isometricLibrary.zip`
- **URL:** https://kenney-assets.itch.io/isometric-library-tiles
- **Autor:** Kenney (Assets)
- **Licencia:** Creative Commons Zero v1.0 Universal (CC0)
- **Fecha indicada por itch:** 24 Aug 2021
- **Uso permitido:** proyectos comerciales y no comerciales; atribución no requerida, aunque apreciada.

Este es el pack visual aprobado por David/Cris para la oficina isométrica.

## Qué se usa en runtime

Ruta local estándar:

```text
public/assets/kenney-isometric/
```

Contenido integrado desde el zip canónico:

- `Angle/*.png`: sprites isométricos usados por la escena.
- `License.txt`: licencia original del pack.
- `Kenney.url`: referencia original incluida en el pack.
- `Preview.png` y `Sample.png`: referencia visual ligera.

No se suben `Samples/`, zips ni duplicados `Isometric/` porque no son necesarios para el runtime y harían el repo más pesado.

## Uso por tipo

- **Paredes:** `wallBooks_*`, `wallDoorway_*`.
- **Suelo/caminos:** `floorCarpet_*`, `floorCarpetEnd_*`, `floorCarpetSmall_*` sobre una base mínima de escena.
- **Mobiliario:** `bookcase*`, `bookStand*`, `longTable*`, `libraryChair_*`, `displayCase*`, `candleStand*`.
- **Personajes Vera/Cris:** el zip canónico verificado no trae sprites de personajes. Por tanto, la escena usa una silueta temporal dibujada y documentada como fallback. No se ha mezclado ningún pack alternativo.

## Verificación del zip

Verificado localmente contra el zip canónico descargado desde itch:

- contiene carpetas `Angle/` e `Isometric/` con variantes del mismo set,
- contiene `License.txt`, `Preview.png`, `Sample.png`, `Information.png` y accesos `.url`,
- contiene assets de biblioteca, paredes, mobiliario y alfombras,
- **no contiene** archivos de personajes/sprites humanos (`character`, `human`, `person`, `player`, `sprite`, etc.).

## Política de integración

- Usar `Kenney Isometric Library Tiles` como fuente principal.
- Mantener la escena lo más apoyada posible en sprites reales del pack.
- Mantener solo assets usados por el MVP o candidatos inmediatos.
- No subir samples/zips si no aportan al runtime.
- No mezclar assets de otra fuente sin documentar licencia y decisión previa.
- Si más adelante se usa un pack Kenney CC0 de personajes, debe añadirse aquí como fallback explícito antes de integrarlo.
- Si un asset complica la lectura del flujo verde/rojo, no entra.
