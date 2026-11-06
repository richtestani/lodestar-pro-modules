<template>
  <nav
    id="main-nav"
    ref="navEl"
    class="nav--mega"
    :class="{ 'is-sticky': sticky, 'is-open': menuOpen, 'overlay-off': !overlay }"
    :style="navStyleVars"
  >
    <RouterLink to="/" class="nav-logo" @click="close">
      <img v-if="logoImage" :src="asset(logoImage)" :alt="brand.name" class="nav-logo-img" />
      <span v-else>{{ brand.logoText || brand.name }}</span>
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
        v-for="link in links"
        :key="link.to"
        class="nav-item"
        :class="{ 'has-children': link.children?.length }"
        @mouseenter="onItemEnter(link)"
        @mouseleave="onItemLeave(link)"
      >
        <template v-if="link.children?.length">
          <button
            class="nav-link nav-link--trigger"
            :aria-expanded="openPanel === link.to"
            @click="togglePanel(link.to)"
          ><LinkContent :link="link" /></button>

          <div
            class="nav-panel"
            :class="['layout-' + megaLayout, { open: openPanel === link.to, grouped: isGrouped(link.children) }]"
          >
            <template v-if="isGrouped(link.children)">
              <div v-for="(group, gi) in link.children" :key="gi" class="nav-panel-group">
                <p v-if="group.heading" class="nav-panel-heading">{{ group.heading }}</p>
                <ul class="nav-panel-group-links">
                  <li v-for="child in group.links" :key="child.to">
                    <RouterLink :to="child.to" class="nav-panel-link" @click="close"><LinkContent :link="child" /></RouterLink>
                  </li>
                </ul>
              </div>
            </template>
            <ul v-else class="nav-panel-flat">
              <li v-for="child in link.children" :key="child.to">
                <RouterLink :to="child.to" class="nav-panel-link" @click="close"><LinkContent :link="child" /></RouterLink>
              </li>
            </ul>
          </div>
        </template>
        <RouterLink v-else :to="link.to" class="nav-link" @click="close"><LinkContent :link="link" /></RouterLink>
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
import { h, ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { site } from '@/site.config.js'
import { asset } from '@/composables/useAssets.js'

const brand     = site.brand
const logoImage = brand.logoImage
const sticky    = site.nav.sticky !== false
const iconPosition = site.nav.iconPosition || 'left'
const trigger   = site.nav.trigger === 'hover' ? 'hover' : 'click' // default click — hover only applies when overlay is true, see README
const overlay   = site.nav.overlay !== false                       // default true (floats over the page)
const megaLayout = site.nav.megaLayout === 'stacked' ? 'stacked' : 'wide'
const supportsHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
const hoverActive = trigger === 'hover' && overlay && supportsHover

// Print once so "which version/settings is this actually running" is a
// one-second console check instead of a guessing game. Bump this string
// to match package.json's version on every release.
console.info(`[lodestar-pro-modules] MegaNav v0.2.4 — trigger: ${trigger}, overlay: ${overlay}, megaLayout: ${megaLayout}`)
console.info(`[lodestar-pro-modules] nav color config read as: hoverBg=${JSON.stringify(site.nav.hoverBg)}, hoverText=${JSON.stringify(site.nav.hoverText)}, bgImage=${JSON.stringify(site.nav.bgImage)}`)

const navEl = ref(null)
onMounted(async () => {
  await nextTick()
  if (!navEl.value) return
  const cs = getComputedStyle(navEl.value)
  console.info(`[lodestar-pro-modules] DOM check — --nav-hover-bg: "${cs.getPropertyValue('--nav-hover-bg').trim()}", --nav-hover-text: "${cs.getPropertyValue('--nav-hover-text').trim()}" (empty means it never reached the DOM — a config problem, not a CSS problem)`)
})

const links = computed(() =>
  site.nav.links ||
  site.pages.filter(p => p.showInNav !== false).map(p => ({ label: p.name, to: '/' + p.slug }))
)

function isGrouped(children) {
  return children.some(c => Array.isArray(c.links))
}

// Tiny inline render-function component so the icon+label markup (and
// its left/right ordering) is written once instead of copy-pasted at
// every link render site (trigger, flat child, grouped child).
const LinkContent = (props) => h('span', { class: ['nav-link-content', { 'icon-right': iconPosition === 'right' }] }, [
  props.link.icon ? h('img', { src: asset(props.link.icon), class: 'nav-link-icon', alt: '' }) : null,
  h('span', props.link.label),
])

// hoverBg / hoverText / bgImage are all optional — CSS falls back to the
// theme's own colors/transparent background when unset.
const navStyleVars = computed(() => {
  const v = {}
  if (site.nav.hoverBg)   v['--nav-hover-bg']   = site.nav.hoverBg
  if (site.nav.hoverText) v['--nav-hover-text'] = site.nav.hoverText
  if (site.nav.bgImage)   v['--nav-bg-image']   = `url(${asset(site.nav.bgImage)})`
  return v
})

const openPanel = ref(null)
function togglePanel(to) { openPanel.value = openPanel.value === to ? null : to }
function onDocClick(e) {
  if (openPanel.value && !e.target.closest('.nav-item.has-children')) openPanel.value = null
}
document.addEventListener('click', onDocClick)

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
onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('click', onDocClick)
  clearTimeout(hoverCloseTimer)
})
</script>

<style scoped>
#main-nav {
  position: absolute; top: 0; left: 0; right: 0; z-index: 300;
  height: var(--nav-height);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(1.25rem, 4vw, 3rem);
  background-image: linear-gradient(color-mix(in srgb, var(--bg) 94%, transparent), color-mix(in srgb, var(--bg) 94%, transparent)), var(--nav-bg-image, none);
  background-size: cover; background-position: center; background-repeat: no-repeat;
  border-bottom: 1px solid var(--border);
}
#main-nav.is-sticky { position: fixed; }

.nav-logo { font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; letter-spacing: 0.12em; color: var(--primary); flex-shrink: 0; }
.nav-logo-img { height: 34px; width: auto; }

.nav-links { display: flex; align-items: center; gap: 0.25rem; list-style: none; }
.nav-link {
  display: block; padding: 0 1.2rem; height: var(--nav-height); line-height: var(--nav-height);
  font-family: var(--font-body); font-weight: 600; font-size: 0.72rem;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--text);
  opacity: 0.78; transition: opacity 0.2s, color 0.2s, background 0.2s; white-space: nowrap;
}
.nav-link:hover, .nav-link.router-link-exact-active {
  opacity: 1; color: var(--nav-hover-text, var(--primary)); background: var(--nav-hover-bg, transparent);
}

.nav-link-content { display: inline-flex; align-items: center; gap: 0.5em; line-height: 1; }
.nav-link-content.icon-right { flex-direction: row-reverse; }
.nav-link-icon { width: 1.05em; height: 1.05em; object-fit: contain; flex-shrink: 0; }

.nav-item { position: relative; display: flex; align-items: center; }
.nav-link--trigger {
  background: none; border: none; font: inherit; cursor: pointer;
  display: flex; align-items: center; gap: 0.35rem;
}
.nav-link--trigger::after {
  content: ''; width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-2px); opacity: 0.7; transition: transform 0.2s; margin-left: 0.35rem;
}
.nav-item.has-children:has(.nav-panel.open) .nav-link--trigger::after { transform: rotate(-135deg) translateY(2px); }

/* dropdown panel — default (overlay: true) floats over the page.
   Width is set per layout variant below, NOT here — a blanket min-width
   here previously forced every variant (including stacked) to be at
   least 340px wide regardless of actual content. */
.nav-panel {
  list-style: none;
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--shadow-lg); padding: 1.25rem;
  opacity: 0; visibility: hidden; translate: 0 6px;
  transition: opacity 0.18s, translate 0.18s, visibility 0.18s;
  z-index: 310;
}
.nav-panel.open { opacity: 1; visibility: visible; translate: 0 0; }

/* flat, wide/stacked — .nav-panel wraps a single .nav-panel-flat <ul>, so
   the flow direction lives on that ul, not .nav-panel itself (styling
   .nav-panel here would only affect its one direct child, not the <li>s
   nested inside it). .nav-panel just hugs whatever that child needs. */
.nav-panel:not(.grouped) { width: max-content; }
.nav-panel.layout-wide .nav-panel-flat {
  display: flex; flex-flow: row wrap; max-width: min(680px, 90vw); gap: 0.4rem 2rem;
}
.nav-panel.layout-stacked .nav-panel-flat {
  display: flex; flex-direction: column; min-width: 180px; max-width: min(320px, 90vw); gap: 0.15rem;
}

/* grouped — .nav-panel directly contains one block per group, so the
   layout styling belongs on .nav-panel itself here. */
.nav-panel.layout-wide.grouped {
  display: grid; grid-auto-flow: column; grid-auto-columns: minmax(150px, max-content);
  width: max-content; max-width: min(760px, 90vw); gap: 0 2.25rem;
}
.nav-panel.layout-stacked.grouped {
  display: flex; flex-direction: column; width: max-content; min-width: 180px; max-width: min(320px, 90vw); gap: 1.4rem;
}

.nav-panel-heading {
  margin: 0 0 0.6rem; font-family: var(--font-body); font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.55;
}
.nav-panel-group-links, .nav-panel-flat { list-style: none; display: flex; flex-direction: column; gap: 0.1rem; }

.nav-panel-link {
  display: block; padding: 0.5rem 0.6rem; border-radius: calc(var(--radius) - 2px);
  font-family: var(--font-body); font-size: 0.85rem; color: var(--text);
  opacity: 0.85; transition: opacity 0.15s, background 0.15s, color 0.15s;
}
.nav-panel-link:hover {
  opacity: 1; color: var(--nav-hover-text, var(--primary)); background: var(--nav-hover-bg, var(--surface-2));
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
.nav-burger span { display: block; width: 22px; height: 2px; background: var(--primary); transition: transform 0.25s, opacity 0.25s; }
.nav-burger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.nav-burger.open span:nth-child(2) { opacity: 0; }
.nav-burger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

.nav-scrim { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 290; }
.nav-scrim.visible { display: block; }

@media (max-width: 768px) {
  .nav-burger { display: flex; }
  .nav-links {
    position: fixed; top: 0; right: 0; width: min(340px, 86vw); height: 100dvh;
    flex-direction: column; align-items: stretch; gap: 0;
    background: var(--bg); border-left: 1px solid var(--border);
    padding-top: calc(var(--nav-height) + 0.5rem);
    transform: translateX(100%); transition: transform 0.3s ease; z-index: 300; overflow-y: auto;
  }
  .nav-links.open { transform: translateX(0); }
  .nav-link { width: 100%; height: auto; line-height: 1; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); }
  .nav-item { flex-direction: column; align-items: stretch; border-bottom: 1px solid var(--border); }
  .nav-item.has-children .nav-link--trigger { border-bottom: none; }

  /* mobile always uses the tap accordion, regardless of trigger/overlay/
     layout settings — resets the desktop content-hugging widths and the
     wide layout's row-wrap back to one full-width column. */
  .nav-panel, .nav--mega.overlay-off .nav-panel {
    position: static; transform: none; translate: none;
    width: 100% !important; max-width: none !important; min-width: 0 !important;
    grid-template-columns: 1fr !important; grid-auto-flow: row !important;
    box-shadow: none; border: none; border-radius: 0;
    background: var(--surface-2); padding: 0; gap: 0;
    max-height: 0; overflow: hidden; opacity: 1; visibility: visible;
    transition: max-height 0.25s ease;
  }
  .nav-panel-flat, .nav-panel-group-links { flex-direction: column !important; max-width: none !important; }
  .nav-panel.open, .nav--mega.overlay-off .nav-panel.open { max-height: 70vh; overflow-y: auto; padding: 0; }
  .nav-panel-group { padding: 0.6rem 2rem 0.2rem; }
  .nav-panel-heading { margin: 0 0 0.3rem; }
  .nav-panel-flat { padding: 0.3rem 0; }
  .nav-panel-link { padding: 0.7rem 2rem; }
}
</style>
