# lodestar-pro-modules

Premium modules and nav styles for [Lodestar](https://github.com/richtestani/lodestar).
Kept out of the base repo so every client site starts lean by default —
this only exists in a project once you install it there.

**v0.7.0 · requires lodestar >= 0.2.0** (section motion needs the newer SectionRenderer hook) — see `CHANGELOG.md` for release notes.

## What's in here

- **`parallax` module** (`modules/pro/ParallaxModule.vue`) — full-bleed
  section whose background scroll-shifts against the foreground copy. Same
  prop shape as the base `hero` module, plus `speed` (0–1, default 0.35).
  Respects `prefers-reduced-motion`.
- **`chart` module** (`modules/pro/ChartModule.vue`) — presentation-style
  charts: a big headline number, label and a bar, line, donut or pie chart
  that animates in. One chart or several in a row. See below.
- **`tourDates` module** (`modules/pro/TourDatesModule.vue`) — a
  performer's show listing with month grouping, ticket links, status
  badges, a compact "next shows" layout and `MusicEvent` structured
  data. See below.
- **Section motion** (`components/pro/SectionMotion.vue`) — every
  top-level page section reveals as it scrolls into view, with optional
  item stagger and full-screen-height sections. Applies to all modules
  automatically; configured once in `config/motion.js`. See below.
- **`mega` nav** (`components/pro/MegaNav.vue`) — top-level nav links can
  carry a `children` array, rendered as a full-width dropdown panel on
  desktop and an inline accordion in the mobile drawer. Eight built-in
  looks (`megaPreset`), each adjustable one option at a time. See below.

## Installing into a project

From inside this repo:
```
node install.mjs /path/to/your-lodestar-project
```
That copies `modules/pro/` and `components/pro/` into the target project's
`src/`. No further wiring needed — Lodestar's `modules/registry.js` and
`App.vue` each check for these via `import.meta.glob` and pick them up
automatically once they exist.

Prefer to do it by hand, or don't want to clone this repo separately each
time:
```
git clone <this repo url> /tmp/lodestar-pro
cp -r /tmp/lodestar-pro/modules/pro     your-project/src/modules/pro
cp -r /tmp/lodestar-pro/components/pro  your-project/src/components/pro
```

(If you'd rather track this as a git submodule instead of a one-time copy,
that works too — add it at, say, `.lodestar-pro/` in the project, then
symlink or copy the two folders in from there. A plain copy is simpler for
a one-person shop and avoids submodule footguns, so that's the default here.)

## Using it

```js
// site.config.js
homeSections: [
  { module: 'parallax', props: {
      eyebrow: 'Featured', title: 'A moment worth pausing on.',
      image: 'featured.jpg', speed: 0.35,
  }},
  // ...
],
nav: {
  style: 'mega',
  trigger:    'click',   // 'click' | 'hover' — hover only applies when overlay is true
  overlay:    true,      // true = panel floats over the page; false = pushes content down inline
  megaLayout: 'wide',    // 'wide' | 'stacked'
  megaPreset: 'classic', // look — see "Mega nav looks" below
  hoverBg:    '#f4efe6', // shared with the base nav styles too — optional
  hoverText:  '#c0392b',
  links: [
    // grouped — headed columns, for when a menu genuinely needs it
    { label: 'Our Collection', to: '/collection', icon: 'sofa.svg', children: [
      { heading: 'Couches', links: [
        { label: 'Sofa', to: '/collection/sofa' },
        { label: 'Love Seat', to: '/collection/loveseat' },
        { label: 'Ottoman', to: '/collection/ottoman' },
        { label: 'Recliner', to: '/collection/recliner' },
      ]},
      { heading: 'Tables', links: [
        { label: 'Kitchen', to: '/collection/kitchen' },
        { label: 'Dining', to: '/collection/dining' },
        { label: 'Bedside', to: '/collection/bedside' },
      ]},
    ]},
    // flat — just a plain list, no headings
    { label: 'Shop', to: '/shop', children: [
      { label: 'Tableware', to: '/shop/tableware' },
      { label: 'Linens',    to: '/shop/linens' },
    ]},
    { label: 'About', to: '/about' },
  ],
},
```

**Flat vs. grouped is a per-link choice, not automatic** — a link's `children`
is either a plain array of `{ label, to, icon }` (flat, no headings), or an
array of `{ heading?, links: [...] }` (grouped into headed columns/sections).
Use grouped only where it earns its keep — a big catalog with real
categories (the furniture example above), not a 3-item dropdown.

**Icons** work on any link, top-level or nested — `icon: 'filename.svg'`,
resolved through the same `src/assets/images/` resolver as module images.
`nav.iconPosition` (`'left'` | `'right'`) controls where they sit, globally.

**`trigger: 'hover'`** is a CSS-only reveal and only takes effect when
`overlay: true` — with `overlay: false` the panel pushes page content down,
which is a bad experience to trigger by accidental mouse movement, so that
combination always behaves as click regardless of `trigger`. Mobile always
uses tap, regardless of either setting.

If `site.config.js` references `parallax` or `mega` without this package
installed, `npm run build` in the lodestar project fails with a clear
message rather than shipping a page with a silently-missing section or a
silently-downgraded nav — see `scripts/prerender.mjs` in the base repo. In
dev (`npm run dev`), a mega/not-installed mismatch also shows a red banner
on the page itself, not just a console warning, since that build-time check
doesn't run under `npm run dev`.

## Mega nav looks

Pick a starting look with `megaPreset`, then override any single option.

| `megaPreset` | What it looks like |
|---|---|
| `classic` (default) | Rounded panel centered under the parent, links highlight as soft chips |
| `flush` | Square panel, links run edge to edge, grouped columns split by hairlines |
| `tabbed` | Open parent fills with the accent color; the panel hangs off it with a matching top edge |
| `underline` | No fills: an accent bar under the top link, an accent underline on drop links |
| `sidebar` | Flush links with an accent stripe on the left edge on hover |
| `store` | Full-width panel, columns aligned to the page content (classic retail mega menu) |
| `dark` | Dark bar and panel (the theme's `--surface-2`), pill-shaped top links |
| `brand` | Bar in `--primary`, panel in `--primary-2`, white text |

```js
// config/nav.js
nav: {
  style: 'mega',
  megaPreset: 'tabbed',
  // any of these override the preset, one at a time:
  colorway:   'light',   // 'light' | 'tinted' | 'dark' | 'brand'
  corners:    'square',  // 'rounded' | 'square' | 'pill'
  dropStyle:  'flush',   // 'inset' | 'flush' | 'bar' | 'underline'
  topStyle:   'tab',     // 'plain' | 'underline' | 'pill' | 'tab'
  panelAlign: 'start',   // 'center' | 'start' | 'full'
  highlight:  'fill',    // 'fill' (tinted background) | 'text' (color only)

  // colors, all optional (any CSS color):
  hoverBg:    '#f4efe6', // highlight background — top links AND drop links
  hoverText:  '#c0392b', // highlight text color — top links AND drop links
  accent:     '#c0392b', // tab fill, underline bars, sidebar stripe
  accentText: '#ffffff', // text on the tab fill
  navBg:      '#111',    // bar (and mobile drawer) background
  navText:    '#eee',
  panelBg:    '#1b1b1b',
  panelText:  '#eee',
}
```

- **Top links and drop links share one highlight.** `hoverBg` / `hoverText`
  (or the colorway's defaults) apply to both levels, including the active
  page, so the bar and the panel always match.
- **Colorways recolor the whole nav,** not just the panel, so the highlight
  stays readable at both levels. If `hoverText` clashes with a dark or brand
  colorway, that's the override winning; drop it to get the colorway's.
- **The `dark` colorway uses `--footer-accent`** for its accent when the
  theme sets it (for themes whose `--primary` is too dark to read on
  `--surface-2`), otherwise `--primary`. Set `accent` to choose your own.
- **Logo options carry over.** The mega nav reads the same `nav.logo` block
  as the base nav (`display: 'inline' | 'overhang' | 'tab'`, `height`,
  `mobileHeight`, `withText`, `shrinkOnScroll`), so switching `nav.style`
  to `'mega'` keeps your logo layout. The tab plate stays a light surface in
  the dark and brand colorways.
- Panels that would run off either edge of the screen slide back in.
- A parent stays highlighted while you're on any of its child pages.
- Style options are desktop only. The mobile drawer is always the same tap
  accordion, colored to match the colorway.
- Unknown option names log a warning in dev and fall back to the preset.

## Chart module

A section of one or more charts, each led by a large number. Add it like
any module:

```js
{ module: 'chart', props: {
    eyebrow: 'Growth',
    title:   'Our numbers keep going up',
    intro:   'Four years of steady progress.',   // optional
    charts: [
      { value: '2,400+', label: 'Clients served', type: 'bar',
        data: [ { label: '2022', value: 640 }, { label: '2023', value: 1180 },
                { label: '2024', value: 1790 }, { label: '2025', value: 2400 } ] },
      { value: '98%', label: 'Client retention', type: 'donut', data: 98 },
      { value: '$4.2M', label: 'Revenue managed', type: 'line',
        data: { Q1: 1.1, Q2: 1.9, Q3: 2.6, Q4: 4.2 } },
    ],
}}
```

- **`type`**: `bar` (default), `line`, `donut`, `pie`.
- **`data`**: a list of `{ label, value }`, or an object `{ label: value }`.
  For a donut or pie, a single number draws a progress ring out of `max`
  (default 100); several values draw slices with a legend.
- **`value`** is the headline and counts up when the chart appears. Text
  around the number is kept (`$4.2M`, `2,400+`, `4.9/5`). It's display
  text, so it doesn't have to match the data.
- Per chart, optional: `text` (a sentence under the label), `color` (any CSS
  color; default the theme's `--primary`; pie and donut slices use shades
  of it).
- **Display options:** `horizontal: true` on a bar chart (values shown at
  the end of each bar), `filled: true` on a donut (same as `type: 'pie'`),
  `area: false` on a line chart.
- **Hover values** appear over bars, line points and slices (tap on touch).
  `prefix` / `suffix` format them, e.g. `prefix: '$', suffix: 'M'` turns
  `1.1` into `$1.1M`; they also apply to horizontal-bar values and legends.
  Turn hovers off per chart with `tooltips: false`.
- Section options: `onSurface: true` (tinted band, like features),
  `cards: true` (each chart in a card).
- **One chart** gets a presentation layout: the number and text on the
  left, a large chart on the right, stacking on phones. **Two or more**
  sit side by side and wrap as needed.

## Tour dates module

A performer's show listing: upcoming shows sorted by date and grouped by
month, past shows in a collapsed list, ticket buttons, sold-out /
cancelled / free badges, an optional featured "next show" card, and
schema.org `MusicEvent` structured data so shows can appear in Google's
event listings.

Put the shows in a sitewide module default so every `tourDates` instance
shares one list — a full listing on `/shows` and a "next 3" strip on the
home page, both edited in one place:

```js
// config/modules/tourDates.js   (+ import it into moduleDefaults in config/index.js)
export default {
  performer: 'Jenna Hale',      // structured data; defaults to site.brand.name
  performerType: 'Person',      // 'MusicGroup' (default) | 'Person'
  shows: [
    { date: '2026-12-05', time: '9:00 PM',
      venue: 'The Pour House', city: 'Raleigh', region: 'NC',
      address: '224 S Blount St',            // optional, street only → map link
      price: '$12 adv / $15 door',           // public ticket price, free text
      ticketUrl: 'https://…',
      status: 'on-sale',                     // on-sale | sold-out | cancelled | postponed | free
      image: 'pour-house.jpg',               // optional — used by featureNext
      note: 'w/ special guest' },
    { date: '2026-12-12', venue: 'Kings', city: 'Raleigh', region: 'NC', status: 'sold-out' },
  ],
}
```

```js
// a full listing page
{ slug: 'shows', name: 'Shows', view: 'rows', rows: [
  { flush: true, modules: [
    { module: 'tourDates', props: { eyebrow: 'On tour', title: 'Upcoming shows', featureNext: true } },
  ]},
]}

// a compact strip on the home page
{ module: 'tourDates', props: {
    title: 'Next shows', layout: 'compact', surface: true,
    moreLink: { label: 'All dates', to: '/shows' } } }
```

**Per show:** `date` (`'YYYY-MM-DD'`, required — anything else is skipped
with a dev warning), `endDate` (multi-day), `time` (free text; `8pm`,
`8:00 PM` and `20:00` are all understood for structured data), `venue`,
`city`, `region`, `country`, `address`, `price`, `ticketUrl`, `status`,
`image`, `note`, `name` (overrides the event name, default "Performer at
Venue"), `map: true` (map link from venue + city when there's no
address), `mapUrl` (your own link).

**Module props:** `layout` (`'list'` | `'compact'`), `limit` (compact
defaults to 3), `groupByMonth` (on for list, off for compact),
`featureNext` (next show as a big card — only when it has an `image`),
`past` (`'collapsed'` | `'open'` | `false`; compact hides past shows),
`pastLimit` (12), `moreLink`, `surface`, `ticketLabel`, `nextLabel`,
`pastLabel`, `emptyText`, `statusLabels` (override badge text),
`locale` (`'en-US'`), `schema`, `performer`, `performerType`,
`currency` (`'USD'`).

**Upcoming vs. past is decided in the visitor's browser**, so a show moves
to the past list the day after it happens without a rebuild; a show stays
"upcoming" through its date (or `endDate`). The prerendered HTML that
crawlers read reflects the day you built — rebuild occasionally to keep
it fresh.

**Structured data:** one JSON-LD block of upcoming shows is added to the
page `<head>` (and baked into the prerendered HTML). On by default for
`layout: 'list'`, off for `'compact'` so a home strip doesn't duplicate
the shows page; force either way with `schema: true|false`. Cancelled and
postponed shows are marked with the matching `eventStatus`; sold-out
shows get `SoldOut` availability. The first number in `price` becomes the
offer price. Check a live page with Google's Rich Results Test.

**Keep private details out.** Everything in config ships in the site's
JavaScript, so don't put performance fees, private-event dates or contact
details here.

## Section motion

Unlike `parallax`, this isn't a module you add to a section list — once
installed, it wraps every top-level page section (home, `sections` pages,
collection pages). **Nothing animates until you turn it on** in the
project's `src/config/motion.js`:

```js
export const motion = {
  enabled:    true,       // reveal sections as they scroll into view
  effect:     'rise',     // 'rise' | 'fade' | 'scale' | 'slide'
  fullHeight: false,      // separate switch — sections at least one screen tall
  stagger:    ['features', 'stats', 'pricing'],  // or true for every supported module
  staggerSelectors: {},   // item selectors for your own modules, e.g. { logos: '.logo' }
}
```

Per section, in `homeSections` / a page's `sections`:

```js
{ module: 'faq', motion: false, props: { ... } }                 // no animation here
{ module: 'cta', motion: { effect: 'fade' }, props: { ... } }    // override any setting
{ module: 'pricing', motion: { fullHeight: false }, props: {...} } // not full height
```

- **Stagger** cascades a module's repeating items in one after another
  instead of moving the whole section. Built-in item selectors: features,
  stats, testimonials, gallery, pricing, team, faq, menu, collectionGrid.
- **Full height** uses `min-height: 100svh`, so long sections still grow,
  and centers shorter content vertically. No scroll-snapping.
- Whatever is on the first screen shows immediately; only sections below
  the fold animate in.
- Reduced-motion users see everything with no animation. The build's
  prerender snapshot never contains hidden content.
- Modules inside a RowLayout column are never wrapped — they aren't page
  sections.

**Requires the base repo's hook** — `SectionRenderer.vue` picking up
`components/pro/SectionMotion.vue`, `config/motion.js`, and `motion` in
`config/index.js`. `install.mjs` warns if the target project predates it.

## Adding more premium modules

1. Drop the `.vue` in `modules/pro/`.
2. Register it in `modules/pro/registry.js`.
3. Add its name to `PRO_MODULES` in `modules/pro/manifest.js`.

That's it — no changes needed in the base lodestar repo. Anything you add
here becomes available in a project the next time you run `install.mjs`
(or re-copy the folders).
