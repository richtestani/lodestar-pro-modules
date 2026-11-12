<template>
  <section
    class="chero"
    :class="[`chero--${align}`, { 'has-image': bg, 'has-grid': grid, 'no-card': !card }]"
    :style="vars"
  >
    <!-- background: gradient always; image (with a scrim) on top when set -->
    <div class="chero-bg" aria-hidden="true">
      <div v-if="bg" class="chero-img" :style="{ backgroundImage: `url(${bg})` }"></div>
      <div class="chero-glow"></div>
      <div v-if="grid" class="chero-grid"></div>
    </div>

    <div class="container chero-inner">
      <div class="chero-copy">
        <p v-if="eyebrow" class="eyebrow chero-eyebrow">{{ eyebrow }}</p>
        <h1 class="h-display chero-title">
          {{ title }}<template v-if="titleAccent"> <span class="chero-accent">{{ titleAccent }}</span></template>
        </h1>
        <p v-if="subtitle" class="lead chero-sub">{{ subtitle }}</p>
        <div v-if="primaryCta || secondaryCta" class="chero-actions">
          <RouterLink v-if="primaryCta" :to="primaryCta.to" class="btn">{{ primaryCta.label }}</RouterLink>
          <RouterLink v-if="secondaryCta" :to="secondaryCta.to" class="btn btn--ghost">{{ secondaryCta.label }}</RouterLink>
        </div>
        <p v-if="note" class="chero-note">{{ note }}</p>
      </div>

      <div v-if="card" class="chero-visual">
        <!-- orbit rings: decorative, dots ride the rings so they never sit on the card's edge -->
        <svg v-if="orbits" class="chero-orbits" viewBox="0 0 600 600" aria-hidden="true">
          <g class="chero-orbit chero-orbit--outer">
            <circle cx="300" cy="300" r="292" />
            <circle class="chero-orbit-dot" cx="300" cy="8" r="6" />
            <circle class="chero-orbit-dot is-dim" cx="300" cy="592" r="4" />
          </g>
          <g class="chero-orbit chero-orbit--inner">
            <circle cx="300" cy="300" r="222" />
            <circle class="chero-orbit-dot" cx="78" cy="300" r="5" />
          </g>
        </svg>

        <figure class="chero-card">
          <figcaption class="chero-card-head">
            <p v-if="card.eyebrow" class="eyebrow chero-card-eyebrow">{{ card.eyebrow }}</p>
            <p v-if="card.title" class="chero-card-title">
              <template v-for="(part, i) in titleParts" :key="i">
                <span v-if="i" class="chero-arrow" aria-hidden="true">→</span>{{ part }}
              </template>
            </p>
          </figcaption>

          <div class="chero-plot">
            <svg :viewBox="`0 0 ${W} ${H}`" class="chero-svg" role="img" :aria-label="summary" preserveAspectRatio="none">
              <defs>
                <linearGradient :id="`${uid}-bar`" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stop-color="var(--chero-accent)" />
                  <stop offset="1" stop-color="var(--chero-accent)" stop-opacity="0.55" />
                </linearGradient>
              </defs>
              <line :x1="0" :x2="W" :y1="H - 0.5" :y2="H - 0.5" class="chero-base" />
              <rect
                v-for="(b, i) in bars" :key="i"
                class="chero-bar"
                :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="3"
                :fill="`url(#${uid}-bar)`"
                :style="{ '--d': `${delay + i * 110}ms` }"
              />
              <path v-if="trend && bars.length > 1" :d="trendPath" class="chero-trend" pathLength="1"
                    :style="{ '--d': `${delay + bars.length * 110 + 250}ms` }" vector-effect="non-scaling-stroke" />
            </svg>
            <span
              v-if="trend && last"
              class="chero-end"
              :style="{ left: `${(last.cx / W) * 100}%`, top: `${((last.y - 8) / H) * 100}%`, '--d': `${delay + bars.length * 110 + 1100}ms` }"
              aria-hidden="true"
            ></span>
          </div>

          <!-- stage labels: each spans its share of the bars, so labels line up with what they describe -->
          <ol v-if="stages.length" class="chero-stages" :style="{ gridTemplateColumns: `repeat(${bars.length || 1}, 1fr)` }">
            <li v-for="(s, i) in stages" :key="i" :style="{ gridColumn: `span ${s.span}` }">{{ s.label }}</li>
          </ol>
        </figure>
      </div>
    </div>
  </section>
</template>

<script setup>
// ============================================================
// chartHero — part of lodestar-pro-modules. A dark, full-width
// hero: headline copy on the left, a floating chart card on the
// right whose bars grow in, followed by a trend line drawing
// across their tops. Gradient background by default; add `image`
// for a photo under the gradient.
//
// { module: 'chartHero', props: {
//     eyebrow: 'Independent Executive Technology Advisory',
//     title: 'Turn Technology Investment Into',
//     titleAccent: 'Business Value.',          // second line, accent color
//     subtitle: '…',
//     primaryCta:   { label: 'Schedule a Conversation', to: '/contact' },
//     secondaryCta: { label: 'Take the Free Assessment', to: '/assessment' },
//     card: {
//       eyebrow: 'Business Value Framework',
//       title:   'Strategy → Execution',       // '→' becomes the accent arrow
//       data:    [18, 30, 42, 58, 74, 92],     // numbers or { label, value }
//       stages:  ['Clarity', 'Priorities', 'Outcomes'],  // spread evenly across the bars
//       trend:   true,                         // line across the bar tops
//     },
// }}
//
// Colors: accent (default the theme's --primary), bgFrom / bgTo
// (gradient stops). image: background photo. grid: faint grid
// texture. orbits: rings behind the card. align: 'left' | 'center'.
//
// The animation is pure CSS keyframes, not the scroll-armed
// transitions the chart module uses: the hero is always on the
// first screen, so it plays the moment the page paints. Nothing
// is hidden before JS runs, the prerendered HTML holds the final
// chart, and reduced-motion visitors just see it finished.
// ============================================================
import { computed, useId } from 'vue'
import { asset } from '@/composables/useAssets.js'

const props = defineProps({
  eyebrow: String,
  title: { type: String, default: '' },
  titleAccent: String,
  subtitle: String,
  primaryCta: Object,
  secondaryCta: Object,
  note: String,
  card: Object,
  image: String,
  accent: String,
  bgFrom: String,
  bgTo: String,
  grid: { type: Boolean, default: true },
  orbits: { type: Boolean, default: true },
  align: { type: String, default: 'left' }, // left | center (center drops the card under the copy)
  delay: { type: Number, default: 350 },    // ms before the bars start
})

const W = 400, H = 180, TOP = 10
const uid = `chero-${useId()}`.replace(/[^a-z0-9-]/gi, '')

const bg = computed(() => asset(props.image))
const vars = computed(() => ({
  ...(props.accent ? { '--chero-accent': props.accent } : {}),
  ...(props.bgFrom ? { '--chero-from': props.bgFrom } : {}),
  ...(props.bgTo ? { '--chero-to': props.bgTo } : {}),
}))

const data = computed(() => (props.card?.data || []).map((d, i) =>
  typeof d === 'number' ? { label: String(i + 1), value: d } : { label: d.label ?? '', value: Number(d.value) || 0 }))

const bars = computed(() => {
  const n = Math.max(data.value.length, 1)
  const max = Math.max(...data.value.map(d => d.value), 0) || 1
  const col = W / n
  const w = col * 0.72
  return data.value.map((d, i) => {
    const y = H - (d.value / max) * (H - TOP)
    return { ...d, x: i * col + (col - w) / 2, w, y, h: H - y, cx: i * col + col / 2 }
  })
})
const last = computed(() => bars.value[bars.value.length - 1])
const trend = computed(() => props.card?.trend !== false)
const trendPath = computed(() =>
  bars.value.map((b, i) => `${i ? 'L' : 'M'}${b.cx.toFixed(1)},${(b.y - 8).toFixed(1)}`).join(' '))

// Split stages across the bars: 6 bars / 3 stages → 2 each. Leftovers go to the last stages.
const stages = computed(() => {
  const list = props.card?.stages || []
  const n = bars.value.length
  if (!list.length || !n) return []
  const base = Math.floor(n / list.length), extra = n % list.length
  return list.map((label, i) => ({ label, span: Math.max(1, base + (i >= list.length - extra ? 1 : 0)) }))
})

const titleParts = computed(() => (props.card?.title || '').split(/\s*→\s*/))

const summary = computed(() => {
  const head = props.card?.title || props.card?.eyebrow || 'Chart'
  return `${head}: ${data.value.map(d => d.value).join(', ')}`
})
</script>

<style scoped>
/* Local tokens: this hero is always dark, whatever the theme's --bg is,
   so text/border tokens are redefined for everything inside it. */
.chero {
  --chero-accent: var(--primary);
  --chero-from: #06121f;
  --chero-to: color-mix(in srgb, var(--chero-accent) 22%, #0a2236);
  --text: #f3f6f8;
  --text-muted: rgba(234, 241, 245, 0.74);
  --border: rgba(255, 255, 255, 0.12);
  --label-color: var(--chero-accent);

  position: relative; overflow: hidden; isolation: isolate;
  min-height: min(92vh, 980px); display: flex; align-items: center;
  background: linear-gradient(115deg, var(--chero-from) 0%, var(--chero-from) 35%, var(--chero-to) 100%);
  color: var(--text);
}

/* ── background layers ── */
.chero-bg { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.chero-img { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.38; mix-blend-mode: luminosity; }
.has-image .chero-bg::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(100deg, var(--chero-from) 20%, color-mix(in srgb, var(--chero-from) 55%, transparent) 70%, transparent);
}
.chero-glow {
  position: absolute; inset: 0;
  background:
    radial-gradient(45% 60% at 74% 52%, color-mix(in srgb, var(--chero-accent) 26%, transparent), transparent 70%),
    radial-gradient(40% 50% at 10% 100%, color-mix(in srgb, var(--chero-accent) 10%, transparent), transparent 70%);
}
.chero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(70% 80% at 70% 50%, #000 10%, transparent 75%);
  -webkit-mask-image: radial-gradient(70% 80% at 70% 50%, #000 10%, transparent 75%);
}

/* ── layout ── a little wider than the theme's --maxw: a split hero needs the room */
.chero .container { max-width: max(var(--maxw), 1320px); }
.chero-inner {
  width: 100%;
  display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  align-items: center; gap: clamp(2.5rem, 6vw, 5.5rem);
  padding-block: clamp(4.5rem, 10vw, 8rem);
  padding-top: calc(var(--nav-height) + clamp(2.5rem, 7vw, 5rem)); /* the nav floats over the hero */
}
.no-card .chero-inner { grid-template-columns: minmax(0, 1fr); }
.no-card .chero-copy { max-width: 820px; }

/* ── copy ── */
.chero-eyebrow { display: flex; align-items: center; gap: 0.9rem; }
.chero-eyebrow::before { content: ''; width: 2.25rem; height: 1px; background: currentColor; opacity: 0.8; flex: 0 0 auto; }
.chero-title {
  margin-top: 1.4rem; color: var(--text);
  font-size: clamp(2.5rem, 4.9vw, 4.9rem); line-height: 1.03; letter-spacing: -0.025em;
  font-weight: var(--display-weight, 700);
}
.chero-accent { display: block; color: var(--chero-accent); }
.chero-sub { margin-top: 1.6rem; max-width: 36rem; color: var(--text-muted); font-size: clamp(1.05rem, 1.5vw, 1.25rem); }
.chero-actions { display: flex; flex-wrap: wrap; gap: 0.9rem; margin-top: 2.4rem; }
.chero .btn { background: var(--chero-accent); border-color: var(--chero-accent); color: #04131c; }
.chero .btn:hover { background: color-mix(in srgb, var(--chero-accent) 82%, #fff); border-color: color-mix(in srgb, var(--chero-accent) 82%, #fff); }
.chero .btn--ghost { background: transparent; color: var(--text); border-color: rgba(255, 255, 255, 0.35); }
.chero .btn--ghost:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.7); color: #fff; }
.chero-note { margin-top: 1.1rem; font-size: 0.85rem; color: var(--text-muted); }

/* ── visual ── */
.chero-visual { position: relative; display: grid; place-items: center; aspect-ratio: 1 / 1; max-width: 560px; width: 100%; justify-self: end; }
.chero-orbits { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.chero-orbit circle:not(.chero-orbit-dot) { fill: none; stroke: color-mix(in srgb, var(--chero-accent) 28%, transparent); stroke-width: 1; }
.chero-orbit-dot { fill: var(--chero-accent); filter: drop-shadow(0 0 6px var(--chero-accent)); }
.chero-orbit-dot.is-dim { opacity: 0.5; }
.chero-orbit { transform-origin: 300px 300px; transform-box: view-box; }
.chero-orbit--outer { animation: chero-spin 60s linear infinite; }
.chero-orbit--inner { animation: chero-spin 44s linear infinite reverse; }

.chero-card {
  position: relative; margin: 0; width: 86%;
  padding: clamp(1.25rem, 2.6vw, 2rem);
  background: linear-gradient(160deg, rgba(14, 38, 56, 0.86), rgba(8, 24, 38, 0.92));
  border: 1px solid color-mix(in srgb, var(--chero-accent) 26%, transparent);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  animation: chero-card-in 900ms cubic-bezier(.2, .8, .2, 1) 100ms both;
}
.chero-card-eyebrow { font-size: 0.66rem; }
.chero-card-title {
  margin-top: 0.85rem; font-family: var(--font-display); font-weight: var(--display-weight, 700);
  font-size: clamp(1.4rem, 2.4vw, 2rem); line-height: 1.1; color: var(--text); letter-spacing: -0.01em;
}
.chero-arrow { color: var(--chero-accent); margin-inline: 0.4em; font-weight: 400; }

.chero-plot { position: relative; margin-top: clamp(1.75rem, 4vw, 2.75rem); }
.chero-svg { display: block; width: 100%; height: clamp(130px, 15vw, 190px); overflow: visible; }
.chero-base { stroke: rgba(255, 255, 255, 0.18); stroke-width: 1; }

/* bars grow from the baseline, one after another */
.chero-bar {
  transform-box: fill-box; transform-origin: 50% 100%;
  animation: chero-grow 1000ms cubic-bezier(.2, .8, .2, 1) var(--d, 0ms) both;
}
/* then the trend line draws across their tops */
.chero-trend {
  fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; opacity: 0.9;
  animation: chero-draw 1000ms cubic-bezier(.4, .1, .2, 1) var(--d, 0ms) both;
}
/* and the last point lands with a soft pulse */
.chero-end {
  position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 0 4px color-mix(in srgb, var(--chero-accent) 45%, transparent);
  animation: chero-pop 500ms cubic-bezier(.3, 1.6, .5, 1) var(--d, 0ms) both, chero-pulse 2.6s ease-out calc(var(--d, 0ms) + 600ms) infinite;
}

.chero-stages {
  list-style: none; padding: 0; margin: 1rem 0 0; display: grid;
  font-family: var(--font-mono); font-size: 0.66rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--chero-accent);
}
.chero-stages li { text-align: center; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.chero-stages li + li { border-left: 1px solid rgba(255, 255, 255, 0.06); }

@keyframes chero-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes chero-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes chero-card-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@keyframes chero-pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
@keyframes chero-pulse {
  0%   { box-shadow: 0 0 0 4px color-mix(in srgb, var(--chero-accent) 45%, transparent); }
  70%  { box-shadow: 0 0 0 14px transparent; }
  100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--chero-accent) 45%, transparent); }
}
@keyframes chero-spin { to { transform: rotate(360deg); } }

/* ── center: copy centered, card below ── */
.chero--center .chero-inner { grid-template-columns: minmax(0, 1fr); justify-items: center; text-align: center; }
.chero--center .chero-copy { max-width: 860px; }
.chero--center .chero-eyebrow, .chero--center .chero-actions { justify-content: center; }
.chero--center .chero-sub { margin-inline: auto; }
.chero--center .chero-visual { justify-self: center; aspect-ratio: auto; max-width: 620px; }
.chero--center .chero-orbits { display: none; }
.chero--center .chero-card { width: 100%; }

@media (max-width: 900px) {
  .chero { min-height: 0; }
  .chero-inner { grid-template-columns: minmax(0, 1fr); }
  .chero-visual { justify-self: center; max-width: 480px; }
  .chero-card { width: 88%; }
}
@media (max-width: 480px) {
  .chero-eyebrow::before { display: none; }
  .chero-visual { aspect-ratio: auto; }
  .chero-orbits { display: none; }
  .chero-card { width: 100%; }
  .chero-actions .btn { width: 100%; text-align: center; }
}

@media (prefers-reduced-motion: reduce) {
  .chero-card, .chero-bar, .chero-trend, .chero-end, .chero-orbit { animation: none !important; }
}
</style>
