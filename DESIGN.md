# BuildSignal — Design System & Visual Authority (Apple Design Language)

## Overview & Philosophy
A **photography-first, artifact-first interface that turns developer observability and technical learning into a museum gallery**. Edge-to-edge product tiles alternate light and dark canvases, framed by SF Pro Display headlines with negative letter-spacing and a single **Action Blue (`#0066cc`)** interactive color. UI chrome recedes so the product and code can speak — no decorative gradients, no decorative card shadows, only the signature drop-shadow (`rgba(0, 0, 0, 0.22) 3px 5px 30px`) under product & card imagery resting on a surface.

---

## Color Tokens & Palette

### Brand & Interactive Accent
- **Action Blue (`#0066cc`)**: The single brand-level interactive color. All text links, all blue pill CTAs ("Learn more", "Copiar Post", "Descargar PNG"), and button focus rings.
- **Focus Blue (`#0071e3`)**: Brighter blue reserved for keyboard focus rings (`outline: 2px solid`).
- **Sky Link Blue (`#2997ff`)**: Brighter blue on dark surfaces for links and badges where `#0066cc` would be too dark.

### Canvas & Surfaces
- **Pure White Canvas (`#ffffff`)**: Dominant canvas for light tiles, utility cards, and post editor.
- **Canvas Parchment (`#f5f5f7`)**: Signature Apple off-white for sub-nav, alternating tiles, metrics strips, and footers.
- **Surface Pearl (`#fafafc`)**: Near-white for secondary capsule buttons.
- **Surface Tile 1 (`#272729`)**: Primary dark-tile surface for the 4:5 Social Post Card and dark preview zones.
- **Surface Tile 2 (`#2a2a2c`)**: Micro-step lighter dark tile.
- **Surface Tile 3 (`#252527`)**: Micro-step darker surface for code wells.
- **Surface Black (`#000000`)**: Pure black for the 44px global nav bar.
- **Hairline Border (`#e0e0e0` / `rgba(0,0,0,0.08)`)**: 1px crisp borders on utility cards and chips.

### Ink & Typography Colors
- **Ink / Body (`#1d1d1f`)**: Headlines, body copy, and dark utility button fills.
- **Body On Dark (`#ffffff`)**: Text on dark tiles and global nav.
- **Body Muted (`#cccccc`)**: Secondary text on dark surfaces.
- **Ink Muted 80 (`#333333`)**: Body text on pearl buttons and secondary headers.
- **Ink Muted 48 (`#7a7a7a`)**: Fine print and metadata.

---

## Typography Hierarchy (SF Pro Display / SF Pro Text / Inter)

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `hero-display` | 56px | 600 | 1.07 | -0.28px | Hero headline with tight Apple tracking |
| `display-lg` | 40px | 600 | 1.10 | 0 | Tile headlines atop product sections |
| `display-md` | 34px | 600 | 1.47 | -0.374px | Section heads |
| `lead` | 28px | 400 | 1.14 | +0.196px | Product subcopy / taglines |
| `tagline` | 21px | 600 | 1.19 | +0.231px | Category titles, sub-nav brand |
| `body-strong` | 17px | 600 | 1.24 | -0.374px | Strong inline copy |
| `body` | 17px | 400 | 1.47 | -0.374px | Standard paragraphs (Apple 17px pace) |
| `caption` | 14px | 400 | 1.43 | -0.224px | Secondary captions, chips, tabs |
| `button-utility` | 14px | 400 | 1.29 | -0.224px | Utility buttons |
| `fine-print` | 12px | 400 | 1.0 | -0.12px | Metadata, fine print |
| `nav-link` | 12px | 400 | 1.0 | -0.12px | Global 44px nav bar links |

---

## Component Grammars

1. **Two-Tier Navigation**:
   - `global-nav`: 44px height, background `#000000`, text `#ffffff` in 12px / 400.
   - `sub-nav-frosted`: 52px height, background `rgba(245, 245, 247, 0.8)` with `backdrop-filter: blur(20px)`, category title (21px / 600) + Action Blue pill CTA.
2. **Buttons**:
   - `button-primary`: `#0066cc` background, white text, `rounded-full` pill, padding `11px 22px`, active `transform: scale(0.95)`.
   - `button-secondary-pill`: Transparent background, `#0066cc` text & 1px border, `rounded-full`.
   - `button-dark-utility`: `#1d1d1f` background, white text, `rounded-lg` (8px).
3. **Cards & Tiles**:
   - `store-utility-card`: `#ffffff` background, 1px solid `#e0e0e0` hairline, `rounded-[18px]`, padding 24px, no shadow.
   - `product-tile-dark`: `#272729` background, white text, full-bleed.
4. **Signature Elevation**:
   - Exactly ONE shadow: `rgba(0, 0, 0, 0.22) 3px 5px 30px 0` applied to 4:5 Social Card previews resting on the surface.
