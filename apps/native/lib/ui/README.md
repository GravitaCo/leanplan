# lib/ui: the native design system (N1)

Ports of the web's `src/ui` and the classes in `src/styles/*.css`. Screens compose these; they never
draw their own sheets, rows, toggles, buttons, chips, banners, toasts, icons, charts or pickers. A
pattern two screens need that isn't here comes to N1 (through the lead), not into a feature stream.

## Rules

- **Colours and type from the theme only.** `useTokens()` gives the light or dark token set (from
  `tokens.generated.ts`, generated from the web's CSS). `tx(size, weight, lineHeight)` is text as the
  web sets it: 17/1.3 body with -0.01em tracking unless a class says otherwise. Add `num` for
  figures (tabular, no tracking).
- **Icons draw at the size the web renders, not the size its code asks for.** On the web,
  `svg.i { width: 20px }` in theme.css beats an icon's `size` attribute, so most web icons are
  20 px whatever `size={…}` says (the tab bar's `size={25}` renders at 20). The exceptions set by CSS:
  the connection pill 15, settings-row squares 18, the row chevron 14 (`Chevron`). Native `Icon`'s
  `size` is what it draws, so pass the web's rendered size. The geometry is shared:
  `src/ui/iconData.ts`.
- **Surfaces follow context.** Inside a `Sheet`/`BareSheet`, `Card`, `List` and the pill sit on
  `--elev` (`InSheet`); inside a pillar `Card`, `WeekBars` drops its outer margins (`InPCard`); in a
  `List icons`, row values are 15 pt and right-aligned (`InIconList`). Use the components and this
  happens by itself.
- **Accessibility.** Labels equal the web's `aria-label`s; where the web names a button by its text,
  native sets no label either. Every tappable thing has a 44 pt touch area (`slop()` pads smaller
  boxes). Pickers are `adjustable`. Animations stop with Reduce Motion. Heights are minimums, so
  text can grow with Dynamic Type.
- **No native-only look.** System sheets, swipe-back and haptics are proposals on the Design canvas
  first (native-build-brief §4).

## What's here

| File | Pieces |
|---|---|
| `kit.tsx` | `Card` (`.card` with `plain`, `.pcard`), `Tile`, `Btn` (ink, tinted, gray, danger, signout, link, small), `LinkBtn` (padded or `flat`), `Stack`, `RoundBtn`, `DashAdd`, `Big`, `Chip`/`Chips`, `List`, `Note`, `Banner`, `ToastView`, `ToastHost` (mounted once in the tab shell), `slop`, `initials` |
| `primitives.tsx` | `PageHeader`, `TitleRow`, `ProfileButton`, `ConnectionPill`/`ConnectionLine` (+ `View` forms), `CatHead`, `BackButton`, `NavBtn` (words or an icon), `Seg`, `Toggle`, `Row`, `Tag`, `AddC`, `XBtn`, `Swatch`, `SettingRow`, `Disclosure`, `Sheet`, `BareSheet` |
| `controls.tsx` | `Slider`, `Stepper`, `Scale`, `Select` |
| `pickers.tsx` | `TimeField`, `PickerSheet` (the UIDatePicker wheels from `modules/tilo-pickers`) |
| `fields.tsx`, `text.tsx`, `choices.tsx` | `Input`, `Field`, `FRow` (with `hint`), `NameField`, `SearchBar`; `Lbl`, `GrpH`, `Foot`, `Sub`, `Prose`, `Empty`, `TextLink`; `Opts`, `Ticks`, `Check`, `Signposts`, `ConsentRow` |
| `charts.tsx` | `Rings`, `Meter`, `KcalBar`, `MacroTrio`, `Sparkline`, `WeekBars` |
| `WeekStrip.tsx` | `WeekStrip`, `DayNav`, `MoveStrip` |
| `Ruler.tsx`, `Wheel.tsx` | the onboarding pickers |
| `Tiles.tsx` | `ChoiceTiles` (with `three`), `CheckTiles` (stacked or `grid`) |
| `icons.tsx`, `brand.tsx` | `Icon`, `Chevron`, `ICON_NAMES`; `TaliMark` |
| `TabBar.tsx` | the tab bar (`TabBarView` is its look) |

## Words

The words a primitive brings with it (Cancel, Back, Profile, Not set, the tab names…) live in
`src/copy/ui.ts`, shared with the web's `src/ui`. A screen's own words stay in its area's copy file.

## Checking a change

The gallery (`lib/Gallery.tsx`, "Gallery" in the Spike sheet) shows every piece; its web twin is
`scripts/web-gallery`. `scripts/e2e-gallery-parity.cjs` captures each section side by side, light and
dark, and checks words, labels, icon sizes and heights (see its header for the two servers). Add a
section to both galleries for any new piece.
