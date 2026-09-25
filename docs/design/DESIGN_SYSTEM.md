# MSeller Lite design system (v2 "editorial")

This app follows the **same design guide and colors as the iOS app** (`mobile-seller`,
`docs/design/DESIGN_SYSTEM.md`). iOS is the source of truth: when its tokens or rules change,
mirror them here in a paired PR, and propose changes to the shared guide there first. Every screen
follows this guide in light **and** dark mode. Design work changes presentation only — never
business logic, data flow or what gets saved.

Brand colors: blue `#2563EB`, navy ink `#10182B`.

Reference implementations: `components/documents/create/DocumentCreateScreen.tsx` (new order,
mirrors iOS `DocumentViewController.swift`), `components/ui/*`.

## Tokens: `constants/Theme.ts` only

Views read `theme.custom` (`useTheme() as CustomTheme`). No hex / `rgba()` literals, font
families, magic font sizes or magic radii in a StyleSheet. `pnpm design:check <files>` must not
report anything new for the files a PR touches (a radius that is half of a dot's or bar's own
size is geometry, not a token). Paper components pick the same palette up through the MD3 roles.

| `custom.colors.*` | Light / Dark | Use |
|---|---|---|
| `tint` | #2563EB / #6E9BFF | Tappable things only: links, chevrons, quick actions, sort, active tab |
| `tintSoft` | tint @ 10% / 16% | Icon wells, chips on light surfaces |
| `ink` | #10182B / #F2F4F8 | Primary text, data values, "Guardar" |
| `inkSecondary` | #667085 / #8B93A5 | Addresses, descriptions |
| `inkTertiary` | #697489 / #7D8699 | SKU, subtotals, overlines, units (≥ 4.5:1; hierarchy by size and weight, not a lighter gray) |
| `background` | #FFFFFF / #0A0E17 | Page |
| `surfaceRaised` | #FAFBFD / #111726 | Nested / child rows, fields |
| `surfaceCard` | #FFFFFF / #131A2A | Cards |
| `fill` | #F1F3F7 / #1A2233 | Recessed wells: search, steppers, disabled CTA (RN stand-in for iOS system fills) |
| `hairline` | #D9DDE5 / #262D3B | Separators and card edges, `custom.hairline` wide |
| `destructive` / `success` / `offer` / `warningBackground`·`warningForeground` / `unsavedDot` | | Status only |
| `gradientStart` → `gradientEnd` | #2563EB → #142B5E | Summary cards and the primary CTA **only** (`BrandGradient`) |
| `onGradient*` | white, 78%, 20%, #FFCC9E | Text, secondary text, dividers, alert figures on the gradient |

MD3 mapping (for Paper): `primary`=tint, `onSurface`=ink, `onSurfaceVariant`=inkSecondary,
`outlineVariant`=hairline, `surface`=surfaceCard, `surfaceVariant`=fill, `error`=destructive,
`tertiary`=offer. Status chips read `custom.status` (positive / warning / negative / neutral).

## Type (system font)

`custom.type.*`:
- `largeTitle` 34 bold, tracking −0.025em: the entity name (customer, screen title).
- `overline` 12 semibold UPPERCASE, tracking 0.12em, `inkTertiary`: section labels ("TOTAL · 5 ARTÍCULOS").
- `rowTitle` 17 semibold, `body` 17, `bodySmall` 15, `caption` 13.
- `figure(size)`: money and quantities — bold, tabular digits.
- Paper `Text` variants are tuned to the same weights for screens that still use them.

## Shape and layout

- Radii `custom.radius`: containers `container` (12), controls/CTA `control` (10), segments
  `segment` (8), tags `tag` (6). No full-pill buttons (`pill` is for switches and dots).
- Page gutter `gutterFor(width)`: 16 on phones, 28 on tablets. Spacing `custom.spacing`
  4 / 8 / 12 / 16 / 20 / 28 (`xs sm md lg xl xxl`).
- Prefer full-bleed rows with hairline separators over boxed cards; left data column, right value column.
- Touch targets ≥ 44 (`custom.touchTarget`).
- Tablets get a tablet layout (wider gutter, constrained content), not a stretched phone.

## Components

- Header: plain tinted icon buttons; the primary save action is a bold `ink` text button with the
  `unsavedDot` when there are unsaved changes.
- Quick actions: plain `tint` text + icon, no chips or boxes.
- Pickers: a menu anchored to the value with an up/down chevron (`unfold-more-horizontal`).
  Binary states: `Switch`, not segmented buttons.
- Primary action of a screen: pinned footer (`custom.surface.floating`) with the `BrandGradient`
  CTA; the disabled state is a quiet `fill` well, not a faded gradient.
- Shadows only on gradient elements (`custom.surface.gradientShadow`). Cards separate by hairline.
- Empty states: icon in a soft (`tintSoft`) circle, title, one explanatory sentence, the next action.
- **Capture flows are one screen, not wizards.** New order mirrors iOS Pedido: type/status overline
  menu, customer as the large title, payment-terms gradient card, "ITEMS n" rows, pinned
  total + "Agregar" footer, "Guardar" in the header. No step counters or "Siguiente" buttons.

## Dark mode

- Colors come from the theme; never branch on `useColorScheme()` inside a view to pick a color.
- Anything drawn outside Paper (gradients, status bar, native views) reads the current theme so it
  flips with the system appearance.

## Accessibility and localization

- One accessible element per list row with a full spoken summary (`accessibilityLabel`); labels on
  icon-only buttons.
- No price truncation at large font sizes: wrap, or shrink large totals (`adjustsFontSizeToFit`)
  instead of cutting them.
- Contrast ≥ 4.5:1.
- Every user-facing string in `locales/es.json` **and** `locales/en.json`.

## Verifying a design PR

- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm design:check <changed files>`.
- Attach before/after screenshots, light and dark, on a phone (and a tablet when the layout
  changes). Never share screenshots with real account data.
