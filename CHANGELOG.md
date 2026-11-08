# Changelog

All notable changes to lodestar-pro-modules are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Requires **lodestar >= 0.2.0** — that's the version that added the
`import.meta.glob` optional pickup in `modules/registry.js` and `App.vue`
this package plugs into. On an older lodestar checkout, `parallax`/`mega`
will silently do nothing.

## [Unreleased]

## [0.7.0] — 2026-11-08

### Added
- **Mega nav looks** — `megaPreset`: `classic`, `flush`, `tabbed`,
  `underline`, `sidebar`, `store`, `dark`, `brand`. Each is a set of
  individually overridable options: `colorway` (`light` / `tinted` / `dark` /
  `brand`), `corners` (`rounded` / `square` / `pill`), `dropStyle` (`inset` /
  `flush` / `bar` / `underline`), `topStyle` (`plain` / `underline` / `pill` /
  `tab`), `panelAlign` (`center` / `start` / `full`) and `highlight` (`fill` /
  `text`). New optional colors: `accent`, `accentText`, `navBg`, `navText`,
  `panelBg`, `panelText`.
- Logo layouts from the base nav: the mega nav now honors `nav.logo`
  (`inline` / `overhang` / `tab`, `height`, `mobileHeight`, `withText`,
  `shrinkOnScroll`). Previously it ignored the block and drew a fixed 34px
  logo.
- Open panels slide back on-screen instead of running off the viewport edge.
- A dropdown parent is highlighted while you're on one of its pages.
- Escape closes an open panel.

### Fixed
- Dropdown parents ("Our Collection") rendered at body size and weight,
  larger than the plain links beside them — the trigger button's
  `font: inherit` reset the nav link type.
- The mega nav ignored the theme's `--nav-link-size` / `-weight` /
  `-tracking` / `-case` tokens (e.g. Press's larger nav type), so it didn't
  match the base nav.
- Drop-link hover didn't match the top bar: with no `hoverBg` set it fell
  back to `--surface-2`, a near-black surface in most themes (invisible text
  in Press). Both levels now use one shared highlight.
- Mobile accordion panels used the same `--surface-2` background, making
  sub-links hard to read.


## [0.6.0] — 2026-11-07

### Added
- **`tourDates` module** (`modules/pro/TourDatesModule.vue`) — upcoming
  shows sorted and grouped by month, past shows in a collapsed list,
  ticket buttons, `sold-out` / `cancelled` / `postponed` / `free` badges,
  map links, an optional featured next-show card (`featureNext`), and a
  `compact` layout for a home-page strip. Upcoming vs. past is computed
  in the browser, so shows age out without a rebuild. Emits schema.org
  `MusicEvent` JSON-LD for the list layout. Share one show list across
  instances via `config/modules/tourDates.js`.

## [0.5.0] — 2026-11-06

### Added
- **Chart display options** — `horizontal: true` on a bar chart (labels
  left, bars grow rightward, values at the bar ends), `filled: true` on a
  donut (renders as a pie), `area: false` on a line chart (line only).
- **Hover values** on bars, line points and pie/donut slices — a small
  tooltip with the label and value; tap on touch. On by default; turn off
  per chart with `tooltips: false`.
- **`prefix` / `suffix`** per chart, applied to data values in tooltips,
  horizontal-bar values and legends (`'$'` + `1.1` + `'M'` → `$1.1M`).

## [0.4.0] — 2026-11-06

### Added
- **`chart` module** (`modules/pro/ChartModule.vue`) — a presentation-style
  section: a large headline number per chart, its label, optional text, and
  a bar, line, donut or pie chart. One chart gets a two-column layout with a
  big chart; two or more share a row. Animates when it scrolls into view
  (bars grow, lines draw, rings sweep, numbers count up) with its own
  trigger, so it works with or without section motion. Drawn as SVG in the
  theme's `--primary` (or a per-chart `color`), so it prerenders with real
  numbers and matches every theme. Reduced motion and the prerender
  snapshot get the finished chart.

## [0.3.0] — 2026-11-06

### Added
- **Section motion** (`components/pro/SectionMotion.vue`) — sections
  reveal as they scroll into view, applied to every top-level page section
  automatically (no per-module config). Off until `enabled: true` in the
  project's `config/motion.js`. Effects: `rise` (default), `fade`,
  `scale`, `slide`. Optional item stagger per module, with built-in item
  selectors for the base modules and `staggerSelectors` for your own.
  `fullHeight` is a separate switch (min-height, so long sections grow).
  Per-section `motion: false` or `motion: { ... }` overrides. The first
  screen never waits on an animation; reduced-motion users and the
  prerender snapshot get no hidden state. Needs the base repo's
  SectionRenderer hook — `install.mjs` warns if it's missing.

## [0.2.4] — 2026-08-24

### Fixed
- **Mega nav ignored `showInNav: false`** — the base `AppNav.vue`'s
  auto-derived link list now respects a page's `showInNav: false` (added
  in lodestar v0.4.0, to keep a page like a privacy policy out of the nav
  while it still gets a real URL), but this package's `MegaNav.vue` built
  its own link list the same way and hadn't been updated to match — a
  page marked `showInNav: false` would still show up in the mega nav.
  Backward compatible either way — on an older lodestar checkout without
  the field, the check is simply always true, same as before.

## [0.2.3] — 2026-08-19

### Fixed
- **Dropdown much larger than its content, `megaLayout` hard to tell apart**
  — the base `.nav-panel` rule forced `min-width: 340px` on *every* layout
  variant regardless of actual content, and `layout-wide`'s CSS Grid used
  `repeat(auto-fill, minmax(...))` on a `position: absolute` element with
  no explicit width — a known Grid pitfall where `auto-fill` sizes its
  track count against the *available* space (bounded by `max-width`), not
  the actual content, producing a much-wider-than-needed panel for short
  lists. Both `wide` and `stacked` inherited the same oversized minimum,
  which is also why the layout difference between them was hard to see.
  Rewrote the sizing to hug actual content (`width: max-content`) per
  variant, and replaced the auto-fill grid with flexbox for the flat/wide
  case, which doesn't have this pitfall.
- Also caught and fixed a real structural bug introduced while writing the
  above: for flat (non-grouped) children, `.nav-panel` has exactly one
  child — the `<ul class="nav-panel-flat">` — so layout CSS belongs on
  that `<ul>`, not on `.nav-panel` itself (which only affects its direct
  child, not the `<li>`s nested inside it).

### Added
- Extra diagnostics on mount: logs the color config as read from
  `site.config.js`, and separately reads `--nav-hover-bg`/`--nav-hover-text`
  back off the live DOM via `getComputedStyle` — if colors still don't
  show, this narrows it to "never reached the DOM" (config problem) vs.
  "reached the DOM but isn't visually applying" (a real CSS bug to report)
  in one glance, instead of another round of guessing.

## [0.2.2] — 2026-08-19

### Fixed
- **Repeated "the update didn't take" reports** — grouped children showing
  as an empty dropdown and `hoverBg`/`hoverText` not applying were both,
  again, symptoms of a pre-0.2.0 file still being what's actually installed
  (the old flat-only renderer fed a grouped `{heading, links}` structure
  reads `.to`/`.label` off the group object itself, which don't exist,
  producing blank rows — and it never had color-var support at all).
  `install.mjs` now deletes any existing `modules/pro`/`components/pro`
  before copying (no more risk of stale leftovers merging with new files),
  and hashes every file after copying to confirm it actually landed
  byte-for-byte — it now prints an explicit pass/fail instead of assuming
  success. Also fixed the `console.info` version stamp itself always saying
  "v0.2.0" regardless of actual package version.

## [0.2.1] — 2026-08-16

### Fixed
- **`trigger: 'hover'` did nothing (click still required)** — 0.2.0's hover
  reveal was pure CSS (`:hover` + several chained class conditions), which
  turned out to be fragile to verify without a real browser in hand.
  Replaced with `mouseenter`/`mouseleave` handlers that drive the exact same
  `openPanel` state the (working) click path already used — same proven
  mechanism, no separate CSS reveal logic to get subtly wrong. Includes a
  150ms close delay so moving the mouse from the trigger down into the panel
  doesn't close it, and only activates on real hover-capable pointers
  (`(hover: hover) and (pointer: fine)`) so it never interferes on touch.
- Added a one-line `console.info` on mount stamping the installed version
  and the resolved `trigger`/`overlay`/`megaLayout` values — if a setting
  doesn't seem to be taking effect, check this first: if it's missing or
  shows an old version, `components/pro/MegaNav.vue` wasn't actually
  overwritten by the last `install.mjs` run (a likely explanation for this
  bug and the `megaLayout` one below both being reported together — they
  match the pre-0.2.0 file exactly, which had neither setting).

### Changed
- `megaLayout: 'stacked'` isn't a new fix — 0.2.0's logic for it was
  correct — but is called out here because a stale-file install (see above)
  produces the exact same symptom: always wide. If you hit that, reinstall
  and check the console stamp.

## [0.2.0] — 2026-08-16

### Fixed
- **Mega nav children not rendering** — the previous `MegaNav.vue` had a
  real gap: the base template's `App.vue` falls back to the standard nav
  silently (console-only warning) if `components/pro/MegaNav.vue` isn't
  found, which is easy to miss during `npm run dev` (the build-time check
  only runs on `npm run build`). If that's what happened to you, the fix
  is on the lodestar side (see its own changelog); reinstalling this
  package's current version also gets you the dev-mode banner that makes
  that fallback impossible to miss going forward.

### Added
- **Per-link icons** — any link, top-level or nested, can carry
  `icon: 'filename.svg'`, resolved through the same asset resolver as
  module images. `nav.iconPosition` (`left`/`right`) controls placement,
  globally, on both this and the base `AppNav.vue`.
- **`trigger: 'click' | 'hover'`** — how the dropdown opens. `hover` is a
  CSS-only reveal and only applies when `overlay: true`.
- **`overlay: true | false`** — `true` (default) floats the panel over the
  page; `false` pushes content down inline instead.
- **`megaLayout: 'wide' | 'stacked'`** — overall panel shape.
- **Grouped children** — a link's `children` can now be a flat list
  (`[{ label, to, icon }]`, no headings) or grouped into headed
  columns/sections (`[{ heading?, links: [...] }]`) — a per-link choice
  based on the data shape you write, not automatic.
- **Shared `hoverBg` / `hoverText` / `bgImage`** — same settings now apply
  to the base `AppNav.vue` styles (classic/centered/minimal) too, so the
  look stays consistent if a project switches nav styles later.

## [0.1.0] — 2026-08-10

First release.

### Added
- **`parallax` module** (`modules/pro/ParallaxModule.vue`) — full-bleed
  section, background scroll-shifts against the copy. Same props shape as
  the base `hero` module, plus `speed` (0–1, default 0.35). Respects
  `prefers-reduced-motion`.
- **`mega` nav** (`components/pro/MegaNav.vue`) — top-level nav links can
  carry a `children` array for a full-width dropdown panel on desktop, an
  inline accordion in the mobile drawer. Self-contained, no shared code
  with the base `AppNav.vue`.
- **`install.mjs`** — copies `modules/pro/` and `components/pro/` into a
  target lodestar project: `node install.mjs /path/to/project`.

[Unreleased]: https://github.com/richtestani/lodestar-pro-modules/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/richtestani/lodestar-pro-modules/releases/tag/v0.1.0
