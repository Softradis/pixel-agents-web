# Assets

## Pack visual principal integrado

- **Nombre:** Essential Isometric Living Room Pack / LivingRoom and HomeOffice
- **Archivo recibido:** `Essential_Isometric_LivingRoom_and_HomeOffice_v1.0.0---32266401-4afb-4d5b-b95b-1fa2163ad370.rar`
- **URL:** https://oisougabo.itch.io/essential-isometric-living-office
- **Autor:** oisougabo
- **Licencia indicada en itch:** apto para proyectos comerciales, no comerciales y uso personal; permite modificar/reskin; crédito no obligatorio, pero apreciado.
- **Uso en este proyecto:** subset mínimo de sprites para la preview `visual-room`.

Este pack sustituye visualmente al pack Kenney en la rama `visual-room` porque trae personajes, mobiliario de oficina/casa y proporciones más cercanas a la referencia de David.

## Pack anterior / fallback documentado

- **Nombre:** Kenney Isometric Library Tiles
- **Archivo verificado:** `kenney_isometricLibrary.zip`
- **URL:** https://kenney-assets.itch.io/isometric-library-tiles
- **Autor:** Kenney (Assets)
- **Licencia:** Creative Commons Zero v1.0 Universal (CC0)
- **Fecha indicada por itch:** 24 Aug 2021
- **Uso permitido:** proyectos comerciales y no comerciales; atribución no requerida, aunque apreciada.

Kenney queda documentado como pack anterior/fallback. El zip canónico no traía personajes válidos, por eso se migró la composición visual al pack Essential Isometric Living Room/HomeOffice.

## Qué se usa en runtime

Ruta local estándar actual:

```text
public/assets/essential-isometric/
```

Contenido integrado desde el RAR recibido:

- subset de `tiles/*.png` para suelo, paredes, puerta y ventana,
- subset de `Home Office/*.png` para mesas, sillas, ordenador, portátil, lámpara y librerías,
- subset de `Living Room/*.png`, `plants/*.png` y `wall Dress/*.png` para rellenar la sala,
- `characters/mom/working/momlaptop_nocouch1.png` como sprite temporal de Vera,
- `characters/dad/working/dadcomputerIdle1.png` como sprite temporal de Cris.

No se sube el RAR completo, `.aseprite`, animaciones completas ni variantes no usadas para mantener el repo ligero.

Ruta anterior Kenney:

```text
public/assets/kenney-isometric/
```

## Uso por tipo

- **Paredes/suelo:** `lvngroom_floor01_*`, `lvngroom_wall01_*`, puerta y ventana del pack Essential.
- **Mobiliario:** escritorios, sillas, ordenador, portátil, librerías, rack, lámpara, plantas y props de oficina/casa.
- **Personajes Vera/Cris:** sprites del pack Essential en actividades de trabajo. Siguen siendo representación visual temporal, no identidad definitiva.

## Verificación del zip

Verificado localmente contra el zip canónico descargado desde itch:

- contiene carpetas `Angle/` e `Isometric/` con variantes del mismo set,
- contiene `License.txt`, `Preview.png`, `Sample.png`, `Information.png` y accesos `.url`,
- contiene assets de biblioteca, paredes, mobiliario y alfombras,
- **no contiene** archivos de personajes/sprites humanos (`character`, `human`, `person`, `player`, `sprite`, etc.).

## Política de integración

- Usar `Essential Isometric Living Room/HomeOffice` como fuente visual principal de la rama `visual-room`.
- Mantener la escena lo más apoyada posible en sprites reales del pack.
- Mantener solo assets usados por el MVP o candidatos inmediatos.
- No subir RAR, `.aseprite`, samples completos ni animaciones no usadas si no aportan al runtime.
- No mezclar una tercera fuente sin documentar licencia y decisión previa.
- Si un asset complica la lectura del flujo verde/rojo, no entra.
