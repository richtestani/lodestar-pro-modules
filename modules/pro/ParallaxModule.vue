<template>
  <section ref="root" class="parallax">
    <div class="parallax-bg" :style="{ backgroundImage: bg ? `url(${bg})` : 'none', transform: `translateY(${offset}px)` }" aria-hidden="true"></div>
    <div class="parallax-scrim" aria-hidden="true"></div>
    <div class="container parallax-inner">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h2 class="h-display parallax-title">{{ title }}</h2>
      <p v-if="subtitle" class="lead parallax-sub">{{ subtitle }}</p>
      <div v-if="cta" class="parallax-actions">
        <RouterLink :to="cta.to" class="btn">{{ cta.label }}</RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup>
// Part of lodestar-pro-modules — active as soon as this package is
// installed into a lodestar project's modules/pro/ (see registry.js
// in this folder, and modules/registry.js in the base repo).
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { asset } from '@/composables/useAssets.js'

const props = defineProps({
  eyebrow: String,
  title: { type: String, default: '' },
  subtitle: String,
  image: String,
  cta: Object,
  // 0 = no movement, 1 = moves at full scroll speed. 0.2–0.4 reads as "parallax"
  // without the background racing ahead of the copy.
  speed: { type: Number, default: 0.35 },
})

const bg = computed(() => asset(props.image))
const root = ref(null)
const offset = ref(0)

const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

let ticking = false
function onScroll() {
  if (ticking || !root.value) return
  ticking = true
  requestAnimationFrame(() => {
    const rect = root.value.getBoundingClientRect()
    // Only bother computing while the section is anywhere near the viewport.
    if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
      offset.value = rect.top * props.speed * -1
    }
    ticking = false
  })
}

onMounted(() => {
  if (reduceMotion) return
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<style scoped>
.parallax {
  position: relative; overflow: hidden;
  min-height: clamp(420px, 62vh, 720px);
  display: flex; align-items: center;
  background: var(--surface-2);
}
.parallax-bg {
  position: absolute; inset: -15% 0; /* extra height so the translate never exposes an edge */
  background-size: cover; background-position: center;
  will-change: transform;
}
.parallax-scrim { position: absolute; inset: 0; background: color-mix(in srgb, var(--bg) 58%, transparent); }
.parallax-inner { position: relative; z-index: 1; text-align: center; max-width: 760px; margin-inline: auto; padding-block: var(--section-pad); }
.parallax-title { letter-spacing: 0.04em; }
.parallax-sub { margin-top: 1.1rem; color: var(--text-muted); }
.parallax-actions { display: flex; justify-content: center; margin-top: 2rem; }

@media (prefers-reduced-motion: reduce) {
  .parallax-bg { transform: none !important; }
}
</style>
