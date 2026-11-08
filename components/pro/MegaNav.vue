<template>
  <nav
    id="main-nav"
    ref="navEl"
    class="nav--mega"
    :class="[`logo--${logoDisplay}`, {
      'is-sticky': sticky, 'is-open': menuOpen, 'overlay-off': !overlay,
      'is-scrolled': scrolled, 'logo--shrinks': shrinks,
    }]"
    :data-colorway="opt.colorway"
    :data-corners="opt.corners"
    :data-drop="opt.dropStyle"
    :data-top="opt.topStyle"
    :data-align="opt.panelAlign"
    :data-highlight="opt.highlight"
    :style="navStyleVars"
  >
    <RouterLink to="/" class="nav-logo" :class="{ 'has-image': logoImage }" :aria-label="logoImage && !logo.withText ? brand.name : undefined" @click="close">
      <img v-if="logoImage" :src="asset(logoImage)" :alt="logo.withText ? '' : brand.name" class="nav-logo-img" />
      <span v-if="!logoImage || logo.withText" class="nav-logo-text">{{ brand.logoText || brand.name }}</span>
    </RouterLink>

    <button
      class="nav-burger"
      :class="{ open: menuOpen }"
      :aria-expanded="menuOpen"
      aria-label="Toggle menu"
      @click="toggle"
    ><span></span><span></span><span></span></button>

    <ul class="nav-links" :class="{ open: menuOpen }">
      <li
        v-for="(link, i) in links"
        :key="link.to"
        class="nav-item"
        :class="{
          'has-children': link.children?.length,
          'is-open': openPanel === link.to,
          'is-active': isActiveParent(link),
        }"
        @mouseenter="onItemEnter(link)"
        @mouseleave="onItemLeave(link)"
      >
        <template v-if="link.children?.length">
          <button
            type="button"
            class="nav-link nav-link--trigger"
            :aria-expanded="openPanel === link.to"
            :aria-controls="`mn-panel-${i}`"
            @click="togglePanel(link.to)"
          >
            <span class="nav-link-content" :class="iconClass">
              <img v-if="link.icon" :src="asset(link.icon)" class="nav-link-icon" alt="" />
              <span>{{ link.label }}</span>
            </span>
          </button>

          <div
            :id="`mn-panel-${i}`"
            :ref="el => setPanelRef(link.to, el)"
            class="nav-panel"
            :class="['layout-' + megaLayout, { open: openPanel === link.to, grouped: isGrouped(link.children) }]"
            :style="panelStyle(link)"
          >
            <template v-if="isGrouped(link.children)">
              <div v-for="(group, gi) in link.children" :key="gi" class="nav-panel-group">
                <p v-if="group.heading" class="nav-panel-heading">{{ group.heading }}</p>
                <ul class="nav-panel-group-links">
                  <li v-for="child in group.links" :key="child.to">
                    <RouterLink :to="child.to" class="nav-panel-link" @click="close">
                      <span class="nav-link-content" :class="iconClass">
                        <img v-if="child.icon" :src="asset(child.icon)" class="nav-link-icon" alt="" />
                        <span>{{ child.label }}</span>
                      </span>
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </template>
            <ul v-else class="nav-panel-flat">
              <li v-for="child in link.children" :key="child.to">
                <RouterLink :to="child.to" class="nav-panel-link" @click="close">
                  <span class="nav-link-content" :class="iconClass">
                    <img v-if="child.icon" :src="asset(child.icon)" class="nav-link-icon" alt="" />
                    <span>{{ child.label }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </template>
        <RouterLink v-else :to="link.to" class="nav-link" @click="close">
          <span class="nav-link-content" :class="iconClass">
            <img v-if="link.icon" :src="asset(link.icon)" class="nav-link-icon" alt="" />
            <span>{{ link.label }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>

    <div class="nav-scrim" :class="{ visible: menuOpen }" @click="close"></div>
  </nav>
</template>

<script setup>
// lodestar-pro-modules — mega nav. Rendered by the base repo's App.vue
// in place of AppNav.vue when site.nav.style === 'mega' and this file
// is present (see App.vue's import.meta.glob check). Self-contained —
// doesn't share code with AppNav.vue, so it works standalone once
// this package is installed, nothing else to wire up.
//
// A link's `children` can be either shape — your choice per link, not
// auto-decided by count:
//   flat:    [{ label, to, icon }, ...]
//   grouped: [{ heading?, links: [{ label, to, icon }, ...] }, ...]
// See README for a worked example (a furniture-store "Our Collection"
// mega menu grouped into Couches / Tables / etc.).
//
// Look & feel: pick a `megaPreset`, then override any single option.
// Every option is a data-* attribute on <nav>, and the CSS below keys off
// those — so the JS only resolves names, it never computes styles.
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { site } from '@/site.config.js'
import { asset } from '@/composables/useAssets.js'

const VERSION = '0.7.0' // keep in step with package.json

// Named looks. Each is just a set of the options in CHOICES below; any of
// them can be overridden one at a time in config/nav.js.
const PRESETS = {
  classic:   { colorway: 'light', corners: 'rounded', dropStyle: 'inset',     topStyle: 'plain',     panelAlign: 'center', highlight: 'fill' },
  flush:     { colorway: 'light', corners: 'square',  dropStyle: 'flush',     topStyle: 'plain',     panelAlign: 'start',  highlight: 'fill' },
  tabbed:    { colorway: 'light', corners: 'square',  dropStyle: 'flush',     topStyle: 'tab',       panelAlign: 'start',  highlight: 'fill' },
  underline: { colorway: 'light', corners: 'square',  dropStyle: 'underline', topStyle: 'underline', panelAlign: 'center', highlight: 'text' },
  sidebar:   { colorway: 'light', corners: 'square',  dropStyle: 'bar',       topStyle: 'underline', panelAlign: 'start',  highlight: 'fill' },
  store:     { colorway: 'light', corners: 'square',  dropStyle: 'flush',     topStyle: 'underline', panelAlign: 'full',   highlight: 'fill' },
  dark:      { colorway: 'dark',  corners: 'rounded', dropStyle: 'inset',     topStyle: 'pill',      panelAlign: 'center', highlight: 'fill' },
  brand:     { colorway: 'brand', corners: 'square',  dropStyle: 'flush',     topStyle: 'underline', panelAlign: 'start',  highlight: 'fill' },
}
const CHOICES = {
  colorway:   ['light', 'tinted', 'dark', 'brand'],
  corners:    ['rounded', 'square', 'pill'],
  dropStyle:  ['inset', 'flush', 'bar', 'underline'],
  topStyle:   ['plain', 'underline', 'pill', 'tab'],
  panelAlign: ['center', 'start', 'full'],
  highlight:  ['fill', 'text'],
}

const brand     = site.brand
const logoImage = brand.logoImage
const sticky    = site.nav.sticky !== false

// Logo layout — same `nav.logo` block as the base AppNav (see the base
// repo's config/nav.js), so switching nav.style keeps the logo as-is.
// Only applies when brand.logoImage is set; a text logo sits inline.
const LOGO_DISPLAYS = ['inline', 'overhang', 'tab']
const logo = site.nav.logo || {}
const logoDisplay = logoImage && LOGO_DISPLAYS.includes(logo.display) ? logo.display : 'inline'
if (import.meta.env.DEV && logo.display && !LOGO_DISPLAYS.includes(logo.display)) {
  console.warn(`[lodestar-pro-modules] nav.logo.display "${logo.display}" isn't one of ${LOGO_DISPLAYS.join(', ')}, using inline`)
}
const logoHeight = logo.height || (logoDisplay === 'inline' ? 36 : 96)
const logoMobileHeight = logo.mobileHeight || (logoDisplay === 'inline' ? Math.min(logoHeight, 32) : Math.round(logoHeight * 0.65))
// Overhanging logos tuck back into the bar once the page scrolls (sticky nav only)
const shrinks = logoDisplay !== 'inline' && sticky && logo.shrinkOnScroll !== false
const scrolled = ref(false)
const onScroll = () => { scrolled.value = window.scrollY > 24 }
const iconClass = { 'icon-right': (site.nav.iconPosition || 'left') === 'right' }
const trigger   = site.nav.trigger === 'hover' ? 'hover' : 'click' // default click — hover only applies when overlay is true, see README
const overlay   = site.nav.overlay !== false                       // default true (floats over the page)
const megaLayout = site.nav.megaLayout === 'stacked' ? 'stacked' : 'wide'
const supportsHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
const hoverActive = trigger === 'hover' && overlay && supportsHover

const warn = (msg) => { if (import.meta.env.DEV) console.warn(`[lodestar-pro-modules] ${msg}`) }
const presetName = site.nav.megaPreset || 'classic'
if (!PRESETS[presetName]) warn(`nav.megaPreset "${presetName}" isn't one of ${Object.keys(PRESETS).join(', ')}, using classic`)
const preset = PRESETS[presetName] || PRESETS.classic
const opt = {}
for (const [key, allowed] of Object.entries(CHOICES)) {
  const want = site.nav[key] ?? preset[key]
  if (allowed.includes(want)) opt[key] = want
  else { warn(`nav.${key} "${want}" isn't one of ${allowed.join(', ')}, using "${preset[key]}"`); opt[key] = preset[key] }
}

// Print once so "which version/settings is this actually running" is a
// one-second console check instead of a guessing game.
console.info(`[lodestar-pro-modules] MegaNav v${VERSION} — preset: ${presetName}, ${Object.entries(opt).map(([k, v]) => `${k}: ${v}`).join(', ')}, trigger: ${trigger}, overlay: ${overlay}, megaLayout: ${megaLayout}`)

const navEl = ref(null)

const links = computed(() =>
  site.nav.links ||
  site.pages.filter(p => p.showInNav !== false).map(p => ({ label: p.name, to: '/' + p.slug }))
)

function isGrouped(children) {
  return children.some(c => Array.isArray(c.links))
}
function childLinks(link) {
  return isGrouped(link.children) ? link.children.flatMap(g => g.links || []) : link.children
}

// A parent stays highlighted while you're on one of its pages, the same
// way a plain top-level link does via router-link-exact-active.
const route = useRoute()
function isActiveParent(link) {
  if (!link.children?.length) return false
  const p = route.path
  return p === link.to || p.startsWith(link.to.replace(/\/$/, '') + '/') || childLinks(link).some(c => c.to === p)
}

// All colors are optional. hoverBg / hoverText drive the highlight on
// BOTH the top bar and the drop panel, so the two always match.
const COLOR_VARS = {
  hoverBg: '--nav-hover-bg', hoverText: '--nav-hover-text',
  navBg: ['--mn-bar-bg', '--mn-drawer-bg'], navText: '--mn-bar-text',
  panelBg: '--mn-panel-bg', panelText: '--mn-panel-text',
  accent: '--mn-accent', accentText: '--mn-accent-text',
}
const navStyleVars = computed(() => {
  const v = { '--logo-h': `${logoHeight}px`, '--logo-h-mobile': `${logoMobileHeight}px` }
  for (const [key, vars] of Object.entries(COLOR_VARS)) {
    if (site.nav[key]) for (const name of [].concat(vars)) v[name] = site.nav[key]
  }
  if (site.nav.bgImage) v['--nav-bg-image'] = `url(${asset(site.nav.bgImage)})`
  return v
})

// Wide flat panels lay out in balanced columns (≤4 across).
function flatCols(n) { return n <= 4 ? n : Math.ceil(n / Math.ceil(n / 4)) }
function panelStyle(link) {
  const s = {}
  if (!isGrouped(link.children)) s['--mn-cols'] = flatCols(link.children.length)
  if (nudges.value[link.to]) s['--mn-nudge'] = nudges.value[link.to] + 'px'
  return s
}

// Keep an open panel on screen: if it would run past either edge of the
// viewport (a 'start'-aligned panel on the last menu item, a wide centered
// panel near the edge), slide it back in.
const panelEls = {}
function setPanelRef(key, el) { if (el) panelEls[key] = el; else delete panelEls[key] }
const nudges = ref({})
const isMobile = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 768px)').matches

const openPanel = ref(null)
watch(openPanel, async (key) => {
  if (!key || !overlay || opt.panelAlign === 'full' || isMobile()) return
  nudges.value = { ...nudges.value, [key]: 0 }
  await nextTick()
  const el = panelEls[key]
  if (!el) return
  const r = el.getBoundingClientRect(), pad = 12, vw = document.documentElement.clientWidth
  let n = 0
  if (r.right > vw - pad) n = vw - pad - r.right
  if (r.left + n < pad) n = pad - r.left
  if (n) nudges.value = { ...nudges.value, [key]: Math.round(n) }
})

function togglePanel(to) { openPanel.value = openPanel.value === to ? null : to }
function onDocClick(e) {
  if (openPanel.value && !e.target.closest('.nav-item.has-children')) openPanel.value = null
}
function onKey(e) { if (e.key === 'Escape' && openPanel.value) openPanel.value = null }

let hoverCloseTimer = null
function onItemEnter(link) {
  if (!hoverActive || !link.children?.length) return
  clearTimeout(hoverCloseTimer)
  openPanel.value = link.to
}
function onItemLeave(link) {
  if (!hoverActive || !link.children?.length) return
  hoverCloseTimer = setTimeout(() => {
    if (openPanel.value === link.to) openPanel.value = null
  }, 150) // small grace period so moving diagonally into the panel doesn't close it
}

const menuOpen = ref(false)
function open()  { menuOpen.value = true;  document.body.style.overflow = 'hidden' }
function close() { menuOpen.value = false; document.body.style.overflow = ''; openPanel.value = null }
function toggle(){ menuOpen.value ? close() : open() }
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  if (shrinks) { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) }
})
onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll)
  clearTimeout(hoverCloseTimer)
})
</script>

<style scoped>
/* ============================================================
   TOKENS — every color/shape below reads from these --mn-* vars.
   Colorways and corner styles just redefine them; config colors
   (navBg, panelBg, accent, …) land as inline vars and win.
   ============================================================ */
#main-nav {
  /* light (default) */
  --mn-bar-bg:      color-mix(in srgb, var(--bg) 94%, transparent);
  --mn-drawer-bg:   var(--bg);
  --mn-bar-text:    var(--text);
  --mn-logo:        var(--logo-color, var(--primary));
  --mn-panel-bg:    var(--surface);
  --mn-panel-text:  var(--text);
  --mn-line:        var(--border);
  --mn-hl-default:  var(--primary);
  --mn-tint:        color-mix(in srgb, var(--primary) 8%, transparent);
  --mn-accent:      var(--primary);
  --mn-accent-text: var(--on-primary);
  --mn-shadow:      var(--shadow-lg);

  /* corners: rounded (default) */
  --mn-r:      var(--radius);
  --mn-r-link: max(calc(var(--radius) - 2px), 2px);

  /* the ONE highlight, used by top links and drop links alike */
  --mn-hl-text: var(--nav-hover-text, var(--mn-hl-default));
  --mn-hl-bg:   var(--nav-hover-bg, var(--mn-tint));
}
#main-nav[data-highlight="text"] { --mn-hl-bg: var(--nav-hover-bg, transparent); }

#main-nav[data-colorway="tinted"] {
  --mn-panel-bg: color-mix(in srgb, var(--primary) 6%, var(--surface));
  --mn-line:     color-mix(in srgb, var(--primary) 16%, var(--border));
  --mn-tint:     color-mix(in srgb, var(--primary) 13%, transparent);
}
#main-nav[data-colorway="dark"] {
  /* --surface-2 is the theme's designated dark surface (footer, dark bands) */
  --mn-bar-bg:     var(--surface-2);
  --mn-drawer-bg:  var(--surface-2);
  --mn-bar-text:   #eef0f4;
  --mn-logo:       #fff;
  --mn-panel-bg:   color-mix(in srgb, var(--surface-2) 90%, #fff);
  --mn-panel-text: #eef0f4;
  --mn-line:       rgba(255, 255, 255, 0.1);
  --mn-accent:     var(--footer-accent, var(--primary));
  --mn-hl-default: color-mix(in srgb, var(--mn-accent) 40%, #fff);
  --mn-tint:       rgba(255, 255, 255, 0.09);
  --mn-shadow:     0 18px 44px rgba(0, 0, 0, 0.35);
}
#main-nav[data-colorway="brand"] {
  --mn-bar-bg:      var(--primary);
  --mn-drawer-bg:   var(--primary);
  --mn-bar-text:    var(--on-primary);
  --mn-logo:        var(--on-primary);
  --mn-panel-bg:    var(--primary-2, var(--primary));
  --mn-panel-text:  var(--on-primary);
  --mn-line:        color-mix(in srgb, var(--on-primary) 18%, transparent);
  --mn-hl-default:  var(--on-primary);
  --mn-tint:        color-mix(in srgb, var(--on-primary) 14%, transparent);
  --mn-accent:      var(--on-primary);
  --mn-accent-text: var(--primary);
}

#main-nav[data-corners="square"] { --mn-r: 0px; --mn-r-link: 0px; }
#main-nav[data-corners="pill"]   { --mn-r: calc(var(--radius) + 8px); --mn-r-link: 999px; }

/* ============================================================
   BAR
   ============================================================ */
#main-nav {
  position: absolute; top: 0; left: 0; right: 0; z-index: 300;
  height: var(--nav-height);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(1.25rem, 4vw, 3rem);
  background-image: linear-gradient(var(--mn-bar-bg), var(--mn-bar-bg)), var(--nav-bg-image, none);
  background-size: cover; background-position: center; background-repeat: no-repeat;
  border-bottom: 1px solid var(--mn-line);
  color: var(--mn-bar-text);
}
#main-nav.is-sticky { position: fixed; }

.nav-logo {
  display: inline-flex; align-items: center; gap: 0.7rem; flex-shrink: 0; position: relative; z-index: 2;
  font-family: var(--font-display); font-size: 1.15rem;
  font-weight: var(--logo-weight, 600); letter-spacing: var(--logo-tracking, 0.12em);
  color: var(--mn-logo);
}
.nav-logo-img { display: block; width: auto; max-width: 260px; object-fit: contain; transition: height 0.25s ease; }

/* ── Logo layouts (nav.logo.display) — mirrors the base AppNav ──
   inline   — fits inside the bar
   overhang — taller than the bar, hangs past its bottom edge
   tab      — overhang on a backing plate hung from the top edge   */
.logo--inline .nav-logo-img { height: min(var(--logo-h), calc(var(--nav-height) - 18px)); }
.logo--overhang .nav-logo,
.logo--tab .nav-logo { align-self: flex-start; transition: padding 0.25s ease, margin 0.25s ease, box-shadow 0.25s ease; }
.logo--overhang .nav-logo { margin-top: 12px; }
.logo--overhang .nav-logo-img,
.logo--tab .nav-logo-img { height: var(--logo-h); }
.logo--overhang .nav-logo-img { filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.18)); }
/* the plate stays a light surface in every colorway — logo art is
   usually drawn for a light background */
.logo--tab .nav-logo {
  padding: 14px 18px 16px;
  background: var(--surface);
  border: 1px solid var(--border); border-top: 0;
  border-radius: 0 0 var(--radius) var(--radius);
  box-shadow: var(--shadow-lg);
}
/* Shrink on scroll: settle back inside the bar */
.logo--shrinks.is-scrolled .nav-logo { align-self: center; margin-top: 0; }
.logo--shrinks.is-scrolled .nav-logo-img { height: calc(var(--nav-height) - 20px); filter: none; }
.logo--tab.logo--shrinks.is-scrolled .nav-logo { padding-block: 0; background: transparent; border-color: transparent; box-shadow: none; }

.nav-links { display: flex; align-items: center; gap: 0.25rem; list-style: none; }
.nav-item { position: relative; display: flex; align-items: center; }

/* Same type tokens as the base AppNav, so a theme's --nav-link-size etc.
   apply here too. The trigger <button> shares this rule — it must NOT
   reset font (an old `font: inherit` here made dropdown parents render
   at body size, larger than their sibling links). */
.nav-link {
  display: block; padding: 0 1.2rem; height: var(--nav-height); line-height: var(--nav-height);
  font-family: var(--font-body); font-weight: var(--nav-link-weight, 600); font-size: var(--nav-link-size, 0.72rem);
  letter-spacing: var(--nav-link-tracking, 0.14em); text-transform: var(--nav-link-case, uppercase);
  color: var(--mn-bar-text); white-space: nowrap;
  opacity: 0.78; transition: opacity 0.2s, color 0.2s, background-color 0.2s, box-shadow 0.2s;
}
.nav-link--trigger {
  appearance: none; margin: 0; border: 0; background: transparent; cursor: pointer;
  display: flex; align-items: center; gap: 0.35rem;
}
.nav-link:hover,
.nav-link.router-link-exact-active,
.nav-item.is-active > .nav-link,
.nav-item.is-open > .nav-link {
  opacity: 1; color: var(--mn-hl-text); background-color: var(--mn-hl-bg);
}

.nav-link-content { display: inline-flex; align-items: center; gap: 0.5em; line-height: 1; }
.nav-link-content.icon-right { flex-direction: row-reverse; }
.nav-link-icon { width: 1.05em; height: 1.05em; object-fit: contain; flex-shrink: 0; }

.nav-link--trigger::after {
  content: ''; width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-2px); opacity: 0.7; transition: transform 0.2s; margin-left: 0.35rem;
}
.nav-item.is-open > .nav-link--trigger::after { transform: rotate(-135deg) translateY(2px); }

/* ============================================================
   PANEL — default (overlay: true) floats over the page.
   Width is set per layout variant, not here — a blanket min-width
   here once forced every variant to 340px regardless of content.
   ============================================================ */
.nav-panel {
  list-style: none;
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  background: var(--mn-panel-bg); color: var(--mn-panel-text);
  border: 1px solid var(--mn-line); border-radius: var(--mn-r);
  box-shadow: var(--mn-shadow); padding: 1.25rem;
  opacity: 0; visibility: hidden; translate: var(--mn-nudge, 0px) 6px;
  transition: opacity 0.18s, translate 0.18s, visibility 0.18s;
  z-index: 310;
}
.nav-panel.open { opacity: 1; visibility: visible; translate: var(--mn-nudge, 0px) 0; }

/* flat — the flow lives on the inner <ul>; .nav-panel hugs it */
.nav-panel:not(.grouped) { width: max-content; }
.nav-panel.layout-wide .nav-panel-flat {
  display: grid; grid-template-columns: repeat(var(--mn-cols, 1), minmax(9rem, max-content));
  max-width: min(720px, 90vw); gap: 0.1rem 1.5rem;
}
.nav-panel.layout-stacked .nav-panel-flat {
  display: flex; flex-direction: column; min-width: 180px; max-width: min(320px, 90vw); gap: 0.1rem;
}

/* grouped — one block per group directly inside .nav-panel */
.nav-panel.layout-wide.grouped {
  display: grid; grid-auto-flow: column; grid-auto-columns: minmax(150px, max-content);
  width: max-content; max-width: min(760px, 90vw); gap: 0 2.25rem;
}
.nav-panel.layout-stacked.grouped {
  display: flex; flex-direction: column; width: max-content; min-width: 180px; max-width: min(320px, 90vw); gap: 1.4rem;
}

.nav-panel-heading {
  margin: 0 0 0.6rem; padding: 0 0.6rem;
  font-family: var(--font-body); font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.55;
}
.nav-panel-group-links, .nav-panel-flat { list-style: none; display: flex; flex-direction: column; gap: 0.1rem; }

.nav-panel-link {
  display: block; padding: 0.5rem 0.6rem; border-radius: var(--mn-r-link);
  font-family: var(--font-body); font-size: 0.85rem; color: var(--mn-panel-text);
  opacity: 0.85; transition: opacity 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s, text-decoration-color 0.15s;
}
/* identical to the top bar's highlight — same two variables */
.nav-panel-link:hover, .nav-panel-link.router-link-exact-active {
  opacity: 1; color: var(--mn-hl-text); background-color: var(--mn-hl-bg);
}

/* ============================================================
   STYLE OPTIONS — desktop only; the mobile drawer below is one
   consistent accordion whatever the desktop look.
   ============================================================ */
@media (min-width: 769px) {
  /* ---- dropStyle: flush / bar — links run to the panel's edges ---- */
  [data-drop="flush"] .nav-panel, [data-drop="bar"] .nav-panel { padding: 0.5rem 0; overflow: clip; }
  [data-drop="flush"] .nav-panel-link, [data-drop="bar"] .nav-panel-link { border-radius: 0; padding: 0.62rem 1.25rem; }
  [data-drop="flush"] .nav-panel-heading, [data-drop="bar"] .nav-panel-heading { padding: 0 1.25rem; }
  [data-drop="flush"] .nav-panel.layout-wide .nav-panel-flat,
  [data-drop="bar"]   .nav-panel.layout-wide .nav-panel-flat { column-gap: 0; }
  /* grouped: columns butt together with a hairline between them */
  [data-drop="flush"] .nav-panel.grouped, [data-drop="bar"] .nav-panel.grouped { padding: 0; gap: 0; }
  [data-drop="flush"] .nav-panel-group, [data-drop="bar"] .nav-panel-group { padding: 0.9rem 0 0.6rem; }
  [data-drop="flush"] .layout-wide .nav-panel-group + .nav-panel-group,
  [data-drop="bar"]   .layout-wide .nav-panel-group + .nav-panel-group { border-left: 1px solid var(--mn-line); }
  [data-drop="flush"] .layout-stacked .nav-panel-group + .nav-panel-group,
  [data-drop="bar"]   .layout-stacked .nav-panel-group + .nav-panel-group { border-top: 1px solid var(--mn-line); }
  /* bar: plus an accent stripe on the left edge */
  [data-drop="bar"] .nav-panel-link:hover,
  [data-drop="bar"] .nav-panel-link.router-link-exact-active { box-shadow: inset 3px 0 0 var(--mn-accent); }

  /* ---- dropStyle: underline — text only, accent underline ---- */
  [data-drop="underline"] .nav-panel-link {
    padding: 0.45rem 0; border-radius: 0;
    text-decoration: underline 2px transparent; text-underline-offset: 0.35em;
  }
  [data-drop="underline"] .nav-panel-heading { padding: 0; }
  [data-drop="underline"] .nav-panel-link:hover,
  [data-drop="underline"] .nav-panel-link.router-link-exact-active { text-decoration-color: var(--mn-accent); }

  /* ---- topStyle: underline — accent bar along the bottom of the bar ---- */
  [data-top="underline"] .nav-link:hover,
  [data-top="underline"] .nav-link.router-link-exact-active,
  [data-top="underline"] .nav-item.is-active > .nav-link,
  [data-top="underline"] .nav-item.is-open > .nav-link { box-shadow: inset 0 -3px 0 var(--mn-accent); }

  /* ---- topStyle: pill — compact rounded chips ---- */
  [data-top="pill"] .nav-links { gap: 0.15rem; }
  [data-top="pill"] .nav-link { height: auto; line-height: 1; padding: 0.7rem 1.05rem; border-radius: 999px; }

  /* ---- topStyle: tab — open parent fills with the accent and the
          panel hangs off it like a folder tab ---- */
  [data-top="tab"] .nav-links { gap: 0; }
  [data-top="tab"] .nav-item.is-open > .nav-link--trigger {
    background-color: var(--mn-accent); color: var(--mn-accent-text); opacity: 1;
  }
  [data-top="tab"] .nav-panel {
    border-top: 3px solid var(--mn-accent);
    border-start-start-radius: 0; border-start-end-radius: 0;
    translate: var(--mn-nudge, 0px) 0;
  }

  /* ---- panelAlign ---- */
  [data-align="start"] .nav-panel { left: 0; transform: none; }
  [data-align="full"] .nav-item { position: static; }
  /* #main-nav prefix so this inset beats the flush style's padding: 0 */
  #main-nav[data-align="full"] .nav-panel {
    left: 0; right: 0; transform: none;
    width: auto !important; max-width: none !important;
    border-left: 0; border-right: 0; border-radius: 0 0 var(--mn-r) var(--mn-r);
    padding-inline: max(clamp(1.25rem, 4vw, 3rem), calc((100% - var(--maxw)) / 2));
  }
  [data-align="full"] .nav-panel.layout-wide.grouped { grid-auto-columns: minmax(170px, 260px); }
  [data-align="full"] .nav-panel.layout-wide .nav-panel-flat { max-width: none; grid-template-columns: repeat(var(--mn-cols, 1), minmax(170px, 260px)); }
}

/* overlay: false — panel pushes the page content down instead of floating */
.nav--mega.overlay-off .nav-item.has-children { flex-direction: column; align-items: stretch; }
.nav--mega.overlay-off .nav-panel {
  position: static; transform: none; translate: none;
  width: auto; max-width: none; min-width: 0; box-shadow: none; opacity: 1; visibility: visible;
  max-height: 0; overflow: hidden; margin-top: 0;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding-top: 0; padding-bottom: 0;
}
.nav--mega.overlay-off .nav-panel.open { max-height: 900px; padding-top: 1.25rem; padding-bottom: 1.25rem; }

/* Burger */
.nav-burger {
  display: none; flex-direction: column; justify-content: center; gap: 5px;
  background: none; border: none; cursor: pointer; padding: 8px; z-index: 320;
}
.nav-burger span { display: block; width: 22px; height: 2px; background: var(--mn-logo); transition: transform 0.25s, opacity 0.25s; }
.nav-burger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.nav-burger.open span:nth-child(2) { opacity: 0; }
.nav-burger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

.nav-scrim { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 290; }
.nav-scrim.visible { display: block; }

@media (max-width: 768px) {
  .nav-burger { display: flex; }
  .logo--inline .nav-logo-img { height: min(var(--logo-h-mobile), calc(var(--nav-height) - 18px)); }
  .logo--overhang .nav-logo-img,
  .logo--tab .nav-logo-img { height: var(--logo-h-mobile); }
  .logo--tab .nav-logo { padding: 10px 12px 12px; }
  .logo--overhang .nav-logo { margin-top: 10px; }
  .nav-logo-text { font-size: 1rem; }
  .nav-links {
    position: fixed; top: 0; right: 0; width: min(340px, 86vw); height: 100dvh;
    flex-direction: column; align-items: stretch; gap: 0;
    background: var(--mn-drawer-bg); border-left: 1px solid var(--mn-line);
    padding-top: calc(var(--nav-height) + 0.5rem);
    transform: translateX(100%); transition: transform 0.3s ease; z-index: 300; overflow-y: auto;
  }
  .nav-links.open { transform: translateX(0); }
  .nav-link { width: 100%; height: auto; line-height: 1; padding: 1rem 1.5rem; border-bottom: 1px solid var(--mn-line); }
  .nav-item { flex-direction: column; align-items: stretch; border-bottom: 1px solid var(--mn-line); }
  .nav-item > .nav-link { border-bottom: none; }

  /* mobile always uses the tap accordion, regardless of trigger/overlay/
     layout/style settings — resets the desktop content-hugging widths and
     the wide layout's columns back to one full-width column. The panel is
     a light wash of the drawer color (it used to be --surface-2, which is
     a dark surface in most themes and made the links unreadable). */
  .nav-panel, .nav--mega.overlay-off .nav-panel {
    position: static; transform: none; translate: none;
    width: 100% !important; max-width: none !important; min-width: 0 !important;
    grid-template-columns: 1fr !important; grid-auto-flow: row !important;
    box-shadow: none; border: none; border-radius: 0;
    background: color-mix(in srgb, var(--mn-bar-text) 5%, var(--mn-drawer-bg)); color: var(--mn-bar-text);
    padding: 0; gap: 0;
    max-height: 0; overflow: hidden; opacity: 1; visibility: visible;
    transition: max-height 0.25s ease;
  }
  .nav-panel-flat, .nav-panel-group-links { display: flex !important; flex-direction: column !important; max-width: none !important; }
  .nav-panel.open, .nav--mega.overlay-off .nav-panel.open { max-height: 70vh; overflow-y: auto; padding: 0; }
  .nav-panel-group { padding: 0.6rem 2rem 0.2rem; }
  .nav-panel-heading { margin: 0 0 0.3rem; padding: 0; }
  .nav-panel-flat { padding: 0.3rem 0; }
  .nav-panel-link { padding: 0.7rem 2rem; border-radius: 0; color: var(--mn-bar-text); }
  .nav-panel-group .nav-panel-link { padding-inline: 0; }
}
</style>
