# lodestar-pro-modules

Premium modules and nav styles for [Lodestar](https://github.com/richtestani/lodestar).
Kept out of the base repo so every client site starts lean by default —
this only exists in a project once you install it there.

**v0.2.4 · requires lodestar >= 0.2.0** — see `CHANGELOG.md` for release notes.

## What's in here

- **`parallax` module** (`modules/pro/ParallaxModule.vue`) — full-bleed
  section whose background scroll-shifts against the foreground copy. Same
  prop shape as the base `hero` module, plus `speed` (0–1, default 0.35).
  Respects `prefers-reduced-motion`.
- **`mega` nav** (`components/pro/MegaNav.vue`) — top-level nav links can
  carry a `children` array, rendered as a full-width dropdown panel on
  desktop and an inline accordion in the mobile drawer.

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

## Adding more premium modules

1. Drop the `.vue` in `modules/pro/`.
2. Register it in `modules/pro/registry.js`.
3. Add its name to `PRO_MODULES` in `modules/pro/manifest.js`.

That's it — no changes needed in the base lodestar repo. Anything you add
here becomes available in a project the next time you run `install.mjs`
(or re-copy the folders).
