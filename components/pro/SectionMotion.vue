<template>
  <div ref="root" class="ls-motion" :class="classes" :style="vars"><slot /></div>
</template>

<script setup>
// ============================================================
// SectionMotion — part of lodestar-pro-modules.
// Wraps every top-level page section (SectionRenderer picks this up via
// import.meta.glob, the same optional pickup as modules/pro/registry.js).
// Off unless the project turns it on — see src/config/motion.js:
//
//   export const motion = {
//     enabled:    true,          // reveal sections as they scroll into view
//     effect:     'rise',        // 'rise' | 'fade' | 'scale' | 'slide'
//     fullHeight: false,         // separate switch — sections at least one screen tall
//     stagger:    ['features', 'stats', 'pricing'],  // modules whose items cascade in
//   }
//
// Per section, in homeSections / sections:
//   motion: false                              → no animation for this one
//   motion: { effect: 'fade', stagger: true }  → override anything above
// ============================================================
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { site } from '@/site.config.js'

const props = defineProps({
  module:   { type: String, default: '' },
  override: { type: [Boolean, Object], default: undefined }, // the section's `motion` key
})

// What counts as an "item" for staggering, per base module. Extend or
// override for your own modules with motion.staggerSelectors in config.
const ITEM_SELECTORS = {
  features:       '.feat-card, .feat-row',
  stats:          '.stat',
  testimonials:   '.quote-card',
  gallery:        '.gal-item',
  pricing:        '.price-card',
  team:           '.team-card',
  faq:            '.faq-item',
  menu:           '.menu-group',
  collectionGrid: '.cg-card',
}

// Never wrap layout plumbing in motion — these aren't content sections.
const STRUCTURAL = ['pageNav', 'scrollSpyNav', 'routerView']

const DEFAULTS = {
  enabled: false, effect: 'rise', fullHeight: false,
  stagger: [], staggerSelectors: {},
  duration: 750, distance: 36, staggerDelay: 90,
}
const EFFECTS = ['rise', 'fade', 'scale', 'slide']

const cfg = computed(() => {
  const o = props.override && typeof props.override === 'object' ? props.override : {}
  return { ...DEFAULTS, ...(site.motion || {}), ...o }
})

const structural = computed(() => STRUCTURAL.includes(props.module))
const animate = computed(() => cfg.value.enabled && props.override !== false && !structural.value)
const fullHeight = computed(() => !!cfg.value.fullHeight && !structural.value)

const itemSelector = computed(() => ({ ...ITEM_SELECTORS, ...cfg.value.staggerSelectors })[props.module])
const stagger = computed(() => {
  const s = props.override && typeof props.override === 'object' && 'stagger' in props.override
    ? props.override.stagger
    : cfg.value.stagger
  const on = s === true || (Array.isArray(s) && s.includes(props.module))
  if (on && !itemSelector.value && import.meta.env.DEV) {
    console.warn(`[lodestar-pro-modules] stagger is on for "${props.module}" but there's no item selector for it — add motion.staggerSelectors.${props.module} in config/motion.js`)
  }
  return on && !!itemSelector.value
})

const effect = computed(() => EFFECTS.includes(cfg.value.effect) ? cfg.value.effect : 'rise')

const root = ref(null)
const pending = ref(false)
const hasItems = ref(false)

const classes = computed(() => ({
  [`fx-${effect.value}`]: animate.value,
  'is-full': fullHeight.value,
  'is-pending': pending.value,
  'has-stagger': hasItems.value,
}))
const vars = computed(() => animate.value ? {
  '--ls-dur':  `${cfg.value.duration}ms`,
  '--ls-dist': `${cfg.value.distance}px`,
  '--ls-step': `${cfg.value.staggerDelay}ms`,
} : null)

let io = null

onMounted(() => {
  if (!animate.value || !root.value) return
  // Reduced motion: content just shows. Prerender (Puppeteer sets
  // navigator.webdriver): never bake a hidden state into the static HTML —
  // that would ship invisible content to crawlers and no-JS visitors.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (navigator.webdriver) return
  if (typeof IntersectionObserver === 'undefined') return

  // Anything already on screen (or scrolled past, e.g. a reload mid-page)
  // shows immediately — the first screen never waits on an animation.
  if (root.value.getBoundingClientRect().top < window.innerHeight * 0.92) return

  if (stagger.value) {
    const items = root.value.querySelectorAll(itemSelector.value)
    items.forEach((el, i) => {
      el.classList.add('ls-motion-item')
      el.style.setProperty('--ls-i', Math.min(i, 12)) // cap so long lists don't drag
    })
    hasItems.value = items.length > 0
  }

  pending.value = true
  io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      pending.value = false
      io.disconnect(); io = null
    }
  }, { rootMargin: '0px 0px -12% 0px' })
  io.observe(root.value)
})

onUnmounted(() => { io?.disconnect() })
</script>

<style>
/* Unscoped on purpose: stagger items live inside other modules' markup. */
.ls-motion {
  --ls-from: none;
  transition:
    opacity var(--ls-dur, 750ms) ease,
    transform var(--ls-dur, 750ms) cubic-bezier(.2, .7, .2, 1);
}
.ls-motion.fx-rise  { --ls-from: translateY(var(--ls-dist, 36px)); }
.ls-motion.fx-scale { --ls-from: scale(.96); }
.ls-motion.fx-slide { --ls-from: translateX(calc(var(--ls-dist, 36px) * -1)); }

/* Hidden state only exists while pending. Revealed = transform: none, so a
   revealed section never becomes a containing block for fixed children. */
.ls-motion.is-pending { opacity: 0; }
.ls-motion.is-pending:not(.has-stagger) { transform: var(--ls-from); }

/* Staggered sections: the section fades, its items carry the movement. */
.ls-motion-item {
  transition:
    opacity var(--ls-dur, 750ms) ease,
    transform var(--ls-dur, 750ms) cubic-bezier(.2, .7, .2, 1);
  transition-delay: calc(var(--ls-i, 0) * var(--ls-step, 90ms));
}
.ls-motion.is-pending .ls-motion-item { opacity: 0; transform: var(--ls-from); }

/* Full height — min-height, never height, so long sections still grow. */
.ls-motion.is-full { min-height: 100svh; display: flex; flex-direction: column; }
.ls-motion.is-full > * { flex: 1 0 auto; }
.ls-motion.is-full > .section,
.ls-motion.is-full > .cta-band,
.ls-motion.is-full > .hero { display: flex; flex-direction: column; justify-content: center; }

@media (prefers-reduced-motion: reduce) {
  .ls-motion, .ls-motion-item { transition: none !important; opacity: 1 !important; transform: none !important; }
}
</style>
