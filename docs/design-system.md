# GameBits Design System

Visual language is a **near-clone of current OpenSea.io** (2025+ dark marketplace), not the older navy `#04111d` / `#2081e2` era.

**Source of truth:** live OpenSea screens (homepage, hero carousel, Discover table, search command palette, hover-expanded sidebar). Published token extracts back the palette; where they conflict with screenshots, **screenshots win**.

This file is the implementation spec. Do not invent a second look. Product scope stays in [product.md](./product.md); this document only defines chrome, tokens, and components.

---

## Principles

1. **Trading terminal, not a showroom.** Near-black canvas, dense information, quiet chrome. Cover art and game imagery carry color.
2. **One informational blue.** Ice Signal `#83c3ff` is for verified badges, links, focus, outlined interactive chrome — never large filled marketing areas.
3. **Green and red are deltas only.** Success/error tints are for percent change, not brand.
4. **Hierarchy is tonal, not shadow.** Surfaces step in small greys. Cards use a 1px inset white-alpha ring, not drop shadows.
5. **Icons everywhere chrome needs them.** Lucide, 1.5px stroke, matching OpenSea’s rail, search, filters, and table affordances.
6. **Numbers align.** Prices, counts, percents, and ranked stats use the mono family, tabular lining.

---

## Color

| Token | Hex | Role |
|---|---|---|
| Void | `#080809` | Outer shell behind the nav rail |
| Obsidian | `#141415` | Top bar and footer band |
| Charcoal | `#1b1d1f` | Primary canvas and most card fills |
| Graphite | `#26272d` | Elevated panels, expanded rail, footer cluster, hover rows |
| Iron | `#34353c` | Structural borders, outlined chip edges, table hairlines |
| Slate | `#3c3d40` | Hover wash on icon buttons and compact controls |
| Fog | `#acadae` | Secondary text, placeholders, table headers, kbd |
| Paper White | `#ffffff` | Primary text, icon strokes |
| Ice Signal | `#83c3ff` | Verified, links, focus rings, selected outline, NEW badge accent |
| Ice Strong | `#2a93ff` | Stronger blue for filled verified checks |
| Ice Soft | `#1f3347` | Soft selected/NEW wash |
| Success | `#47bb64` | Positive % change |
| Error | `#e24756` | Negative % change |
| Hairline | `rgba(255, 255, 255, 0.08)` | Inset card ring |
| Scrim | `rgba(8, 8, 9, 0.72)` | Search modal overlay |

### CSS custom properties (target)

```css
:root {
  --color-void: #080809;
  --color-obsidian: #141415;
  --color-charcoal: #1b1d1f;
  --color-graphite: #26272d;
  --color-iron: #34353c;
  --color-slate: #3c3d40;
  --color-fog: #acadae;
  --color-paper-white: #ffffff;
  --color-ice-signal: #83c3ff;
  --color-ice-strong: #2a93ff;
  --color-ice-soft: #1f3347;
  --color-success: #47bb64;
  --color-error: #e24756;
  --color-hairline: rgba(255, 255, 255, 0.08);
  --color-scrim: rgba(8, 8, 9, 0.72);
  --color-border: #2a2b30;
}
```

Dark-only. Do not ship a light theme for v1.

---

## Typography

**Target:** GT America + GT America Mono (OpenSea).

**GameBits licensed substitute:** Inter for UI; Geist Mono or JetBrains Mono for numeric/data. Geist Sans is acceptable only if Inter is not yet loaded — prefer Inter for the OpenSea match.

| Role | Size | Weight | Line height | Family |
|---|---|---|---|---|
| Caption / table header / footer | 12px | 400–500 | 1.25–1.5 | Sans |
| Body / nav / chips / table name | 14px | 400 body, 500 names | 1.5 | Sans |
| Search input | 16px | 400 | 1.5 | Sans |
| Section title (sm) | 20px | 500 | 1.25 | Sans |
| Hero / section title (lg) | 32px | 500 | 1.25 | Sans |
| Stat value / price / rank | 12–16px | 400–500 | 1.0–1.25 | Mono |

Almost all UI lives at 12–16px. Reserve 20px and 32px for hero titles and section headers (`Trending Tokens`). Stat labels (FLOOR PRICE, ITEMS) are 11–12px, Fog, uppercase, wide tracking.

---

## Spacing, radius, elevation

**Base unit:** 4px. **Density:** compact. **Element gap:** 8–12px. **Section gap:** 48px. **Card padding:** 12px. **Content max:** ~1440px overall; center column ~1200px.

### Radius (screenshots override extracts)

| Element | Radius |
|---|---|
| Icon buttons, table row hover | 4–8px |
| Small chips (NEW), inner stat tiles | 8px |
| Cards, trending tiles, filter panels | 8–12px |
| Hero carousel banner | 16px |
| Search field, category pills, time chips, wallet/balance pills | `9999px` (full) |
| Avatars | full circle |
| Preview thumbnails in carousel | 12px |

Do not use 4px on the global search bar or category row. Those are stadium pills.

### Elevation

- **Card:** `inset 0 0 0 1px rgba(255, 255, 255, 0.08)`
- **Highest lift (optional):** `0 1px 2px rgba(0, 0, 0, 0.03)`
- No colored glows, no large drop shadows.

---

## Iconography

Library: **`lucide-react`**. Stroke **1.5**. Default size **20px** in the rail, **16px** in chips/table/search. Color Paper White; Ice Signal only for verified and the active rail accent. Do not mix icon families.

Place an icon anywhere OpenSea does: rail items, search, filters, table stars, chain markers, footer status, verified names.

| Chrome | Lucide |
|---|---|
| Discover | `Compass` |
| Collections / games grid | `LayoutGrid` |
| Tokens / alternate catalog | `CircleDot` |
| Swap | `ArrowLeftRight` |
| Drops | `Gift` |
| Activity | `List` |
| Rewards | `Anchor` |
| Tools | `Zap` |
| Studio | `PenTool` |
| Profile | `User` |
| Resources | `BookOpen` |
| Settings | `Settings` |
| Support | `LifeBuoy` |
| Search | `Search` |
| Notifications | `Bell` |
| Wallet / balance | `Wallet` |
| Verified | `BadgeCheck` (filled Ice Strong) |
| Watchlist star | `Star` (outline idle, filled active) |
| Category Art | `Paintbrush` |
| PFPs | `Smile` |
| Trading Cards | `Diamond` |
| Gaming | `Gamepad2` |
| More / overflow | `Ellipsis` |
| View table / cards | `Table` / `LayoutList` |
| Time range chevron | `ChevronDown` |
| Expand rail / nested | `ChevronRight` |
| Live status | `Circle` filled Success, 6px |
| Aggregating | `Zap` |
| Networks | `Share2` |
| Keyboard hint | `/` in a Fog bordered kbd |
| Clear recents | text control, Ice Signal |

---

## App shell

Fixed three-band chrome: **left rail**, **top bar**, **bottom footer**. Main canvas is Charcoal. Right rail on the homepage is a floor/rank list, not a second nav.

### Left rail

- **Collapsed:** 56px wide, Void/Obsidian, icon-only, stacked 8px gaps.
- **Active item:** 4–8px rounded Slate wash; optional 2px Ice Signal bar on the leading edge.
- **Hover expand:** ~240px labeled drawer overlays content (~150ms). Wordmark + logo at top. Items: icon + 14px/500 label. Active items (e.g. Collections, Tokens) use a Graphite pill the full row width.
- Nested rows (Resources, Settings) use `ChevronRight`.
- Bottom cluster: Profile, Resources, Settings, Support (same as OpenSea screenshot).
- Do not push page layout on hover; overlay the canvas.

### Top bar

- Height ~56–64px, Obsidian, flush with canvas (no heavy bottom border).
- Leading: collapsed-rail logo (same OpenSea-style mark slot → GameBits mark).
- **Search:** flex-grow pill, Graphite/Charcoal fill, 1px Iron/hairline, leading `Search`, placeholder Fog (“Search GameBits”), trailing `/` kbd chip.
- Trailing cluster (8px gaps): `Bell`, `Wallet`, balance pill (`$0.00`, rounded-full, Iron border), 32px avatar.
- Focusing search opens the command palette; the pill itself stays in the bar.

### Footer

- Slim ~40px, Obsidian, 12px Fog links.
- Left: Live (green dot), Aggregating, Networks, Terms, Privacy.
- Right: ticker (mono), Support, theme/mode, Collector / Pro, Crypto / USD.
- Hairline Iron above the band.

---

## Components

### Category / filter pills

Horizontal row under the top bar. Height ~32–36px, **fully rounded**, 1px Iron, Paper White 14px/500, icon + label. Selected: slightly brighter Graphite fill. Trailing “More”. Separate cluster for catalog toggle (NFTs / Tokens → GameBits: Games / …) and time range (`1d` + chevron) and view-mode icon buttons (circle).

### Hero carousel

- Full-width (minus right rail) banner, **16px** radius, overflow hidden.
- Cover image full-bleed; bottom scrim so title stays readable.
- Title 24–32px/500 Paper White + verified `BadgeCheck`.
- Creator line 14px Fog (“By …”).
- **Stat glass:** rounded-xl Graphite/black-alpha panel, four columns: FLOOR PRICE, ITEMS, TOTAL VOLUME, LISTED. Labels 11px Fog uppercase; values 16px Paper White (mono for money).
- **Preview tiles:** three 64–80px squares, 12px radius, Iron border, right-aligned on the banner.
- Pagination: short dashes under the banner; active dash Paper White, others Iron.

### Right rail (homepage)

- ~280–320px, independent scroll.
- Header: COLLECTION (or GAME) + FLOOR (or VOTES), 12px Fog, uppercase.
- Row ~48–56px: 28–32px rounded avatar, name 14px/500, verified, right column mono price + 12px Success/Error %.
- Hover: Graphite wash, 8px radius.

### Trending cards

- 8–12px radius, hairline ring, 12px padding, Charcoal.
- 32px circular avatar, name 14px/500 + verified, price + % (Success/Error), mini sparkline in Success/Error.
- Equal-width grid, 8–12px gaps. Section header 20–32px/500 + Fog subtitle.

### Discover / table page

**Left filter column**

- Heading: Filter By.
- Segmented Collections / Tokens (icon + label).
- Category accordion (placeholder chips if empty).
- Chains: search field + colored-dot chain pills (All, Ethereum, Solana, Base, …). GameBits maps these to platforms (PC, Web, iOS, …) with the same chip UI.

**Main**

- Tabs: Trending, Top, Watchlist (icon + label, rounded-full selected).
- Time chips: All, 30d, 7d, 1d, 1h, 15m, 5m, 1m — selected is Paper White/500, others Fog.
- View toggles: table vs cards.
- Table: no outer card radius. Columns right-aligned for numbers. Headers 12px Fog. Row hover Graphite. Leading `Star`. Name + 28px avatar + verified + optional **NEW** badge (Ice Soft fill, Ice Signal text, 8px radius, 10px type). Change column Success/Error; zero is Fog.

### Search command palette

- Centered modal ~640–720px, Graphite, 12–16px radius, hairline ring, scrim behind.
- Top: 16px search field, caret Paper White, no extra chrome.
- **Left type nav:** All (sparkle/compass), Collections (`LayoutGrid`), Tokens (`CircleDot`), Items (`Image`), People (`User`). Selected = Graphite/Slate pill.
- **Chain / platform pills** on the right pane: All + colored dots + More.
- **RECENT SEARCHES** 12px Fog + CLEAR (Ice Signal). Recent row: avatar, name, type caption, right-side metric.
- **TRENDING COLLECTIONS:** 2-column cells, avatar, name, verified, price + %.
- **TRENDING TOKENS:** same pattern below.
- Open on search focus or `/`. Dismiss: Esc, scrim click.

### Badges and kbd

- **Verified:** 14–16px `BadgeCheck`, Ice Strong.
- **NEW:** Ice Soft background, Ice Signal label.
- **Kbd `/`:** 18–22px min, 4–6px radius, Iron border, Fog glyph.
- **Beta:** 10px Fog next to Tools.

### Outlined action

1px Ice Signal border, Paper White 14px/500, 8px vertical / 16px horizontal padding, 8px radius (or full if it sits in a pill cluster). Hover border → Paper White. No filled Ice Signal primary button.

---

## Motion and interaction

| Event | Behavior |
|---|---|
| Rail hover | Width 56 → ~240px overlay, 150ms ease |
| Icon / row hover | Background → Slate/Graphite, no scale |
| Search focus | Command palette; `/` still visible in the bar |
| Carousel | Dash pagination; no autoplay required |
| Table sort | Header caret; numbers stay mono |
| Modal | Fade scrim 120ms; panel no bounce |

No parallax, no neon glow, no spring overshoot.

---

## GameBits mapping

Chrome clones OpenSea. Labels and data bind to the MVP in [product.md](./product.md). Do not add OpenSea product surfaces (swap, studio mint, chain markets) unless product.md changes.

| OpenSea chrome | GameBits |
|---|---|
| Discover home | This week’s board: featured carousel + ranked list |
| Collections | Games on the current (or selected) ISO week |
| Tokens | Out of MVP — omit from rail or hide |
| Swap / Drops / Rewards / Tools / Studio | Out of MVP — omit from rail |
| Activity | Later; omit for MVP |
| Floor price | Vote count (public) |
| 1d change / volume / sales | Optional: vote velocity; outbound clicks stay admin-only |
| Verified | Curated / featured listing |
| Watchlist | Out of MVP; star can be visual-only or omitted |
| Search: Collections / Tokens / Items / People | Games; People later; Weeks as a type if useful |
| Chain filters | Platforms (PC, Web, iOS, Android, Console) |
| Category chips (Art, PFPs, …) | Game tags (1–3 per card) |
| Profile / Settings | Clerk account |
| Wallet / `$0.00` | Omit wallet; keep avatar + optional signed-in chip |
| Right-rail FLOOR | Ranked games: votes |
| Hero stats ITEMS / VOLUME / LISTED | Players/status fields from the game profile: status, platforms, vote count — do not invent NFT fields |
| Footer ticker / Collector Pro / Crypto USD | Optional later; keep Live + legal + Support |

### MVP screens using this chrome

1. **Homepage** — shell + category/tag pills + hero carousel of featured weekly games + right rail ranked by votes + trending-style cards only if they still represent this week’s ~20 (do not add a second product).
2. **`/week/[year]/[week]`** — Discover table layout: ranked games for that ISO week.
3. **`/games/[slug]`** — same shell; detail uses Charcoal canvas, cover as hero, stats chips, primary outbound as outlined action.

Rail for MVP: Discover (home), Collections→Games (week board), Profile, Settings, Support. Nothing else.

---

## Do

- Use Ice Signal only for verified, links, focus, and outlines.
- Use inset hairline rings on cards and the search modal.
- Put Lucide icons on every rail item, search, filter, and verified name.
- Use full-radius pills for search, categories, and time chips.
- Use mono for votes, money, percents, and aligned table stats.
- Keep type at 12–16px except 20/32 section titles.
- Match collapsed 56px rail + hover labeled overlay.

## Don’t

- Don’t use the old OpenSea blue `#2081e2` or navy `#04111d` canvas.
- Don’t introduce a second brand accent (purple, gold, etc.).
- Don’t use filled Ice Signal buttons or gradient glows.
- Don’t use heavy drop shadows.
- Don’t set the search bar or category chips to 4px radius.
- Don’t put NFT-only fields (floor ETH, listed %) on GameBits game cards.
- Don’t expand MVP with Swap, Tokens, Studio, or Watchlist just to copy OpenSea IA.
- Don’t mix icon sets or add sizing classes inside components that already size icons.

---

## Agent implementation notes

Current repo is still the Next.js starter (`app/globals.css` light/dark Geist). When implementing UI:

1. Load Inter + a mono (Geist Mono is already in the project).
2. Replace `:root` colors with the tokens above; dark-only.
3. Add `lucide-react`.
4. Build the shell (rail, top bar, footer) before page content.
5. Homepage = carousel + rank rail; week route = Discover table.
6. Verify in the browser: rail hover, search modal, table hover, carousel dashes.

Reference screens (user-provided): homepage with carousel and right rail; Rare Friends–style carousel slide; Discover table + chain filters; search modal; expanded sidebar.
