# Assets

This project uses a small, documented subset of visual assets to keep the repository lightweight and redistributable.

## Essential Isometric Living Room/HomeOffice

- **Name:** Essential Isometric Living Room Pack / LivingRoom and HomeOffice
- **URL:** https://oisougabo.itch.io/essential-isometric-living-office
- **Author:** oisougabo
- **License summary from itch.io:** suitable for commercial, non-commercial, and personal projects; modification/reskin allowed; credit not required but appreciated.
- **Use in this project:** selected office/home-office sprites for the visual prototype.

Runtime path:

```text
public/assets/essential-isometric/
```

Included subset:

- floor, wall, door, and window tiles,
- desks, chairs, computer, laptop, lamp, bookshelves, and props,
- plants and decorative objects,
- temporary worker character sprites.

The full archive, source files, unused animations, and broad variants are intentionally not included.

## Kenney Isometric Library Tiles

- **Name:** Kenney Isometric Library Tiles
- **URL:** https://kenney-assets.itch.io/isometric-library-tiles
- **Author:** Kenney
- **License:** Creative Commons Zero v1.0 Universal (CC0)
- **Use in this project:** documented fallback/previous asset source and selected reusable tiles.

Runtime path:

```text
public/assets/kenney-isometric/
```

## Pixel Agents reference assets

Subset copied for the pixel-agents prototype from:

- Repository: https://github.com/pablodelucca/pixel-agents
- Repository license observed: MIT (`LICENSE`, Copyright 2026 Pablo De Lucca)
- Character source referenced upstream: JIK-A-4 MetroCity Free Top Down Character Pack
- MetroCity license observed on itch.io: Creative Commons Zero v1.0 Universal (CC0)

Copied subset:

- selected character sprites under `public/assets/pixel-agents/characters/`,
- selected furniture and floor sprites under `public/assets/pixel-agents/`.

## Integration policy

- Keep only assets used by the MVP or immediate editor candidates.
- Do not commit large source archives or unused full packs.
- Document every new third-party asset source and license before adding it.
- Prefer small, inspectable subsets over full asset dumps.
