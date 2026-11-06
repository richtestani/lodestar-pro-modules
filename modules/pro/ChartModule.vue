<template>
  <section ref="root" class="section chart-section" :class="[{ 'section--surface': onSurface, 'chart-armed': armed }]">
    <div class="container">
      <div v-if="eyebrow || title || intro" class="section-head is-center">
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title" class="h-title">{{ title }}</h2>
        <p v-if="intro">{{ intro }}</p>
      </div>

      <div class="chart-grid" :class="{ 'is-solo': list.length === 1 }">
        <article
          v-for="(c, ci) in list" :key="ci"
          class="chart-item" :class="{ card: cards }"
          :style="{ '--chart-color': c.color }"
        >
          <div class="chart-copy">
            <p v-if="c.value !== ''" class="chart-value">
              <span class="chart-sr">{{ c.value }}</span>
              <span aria-hidden="true">{{ shown[ci] ?? c.value }}</span>
            </p>
            <p v-if="c.label" class="chart-label">{{ c.label }}</p>
            <p v-if="c.text" class="chart-text">{{ c.text }}</p>
          </div>

          <figure class="chart-figure" @pointerleave="hide(ci)">
            <!-- bar, horizontal: HTML rows, values always shown -->
            <div v-if="c.type === 'bar' && c.horizontal" class="chart-hbars" role="img" :aria-label="c.summary">
              <template v-for="(b, i) in c.bars" :key="i">
                <span class="chart-hlabel">{{ b.label }}</span>
                <div class="chart-htrack">
                  <div class="chart-hbar" :style="{ '--p': b.pct, '--d': `${i * 90}ms` }"></div>
                  <span class="chart-hval" :style="{ '--d': `${400 + i * 90}ms` }">{{ b.text }}</span>
                </div>
              </template>
            </div>

            <!-- bar, vertical -->
            <template v-else-if="c.type === 'bar'">
              <div class="chart-plot">
                <svg :viewBox="`0 0 ${W} ${H}`" class="chart-svg" role="img" :aria-label="c.summary">
                  <line :x1="0" :x2="W" :y1="H - 0.5" :y2="H - 0.5" class="chart-base" />
                  <rect
                    v-for="(b, i) in c.bars" :key="i"
                    class="chart-bar" :class="{ 'is-hot': tips[ci]?.i === i }"
                    :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="4"
                    :style="{ '--d': `${i * 90}ms` }"
                  />
                  <g v-if="c.tooltips">
                    <rect
                      v-for="(b, i) in c.bars" :key="i"
                      class="chart-hit" :x="b.col * i" y="0" :width="b.col" :height="H"
                      @pointerenter="show(ci, i, (b.x + b.w / 2) / W, b.y / H, b)"
                      @click="show(ci, i, (b.x + b.w / 2) / W, b.y / H, b)"
                    />
                  </g>
                </svg>
                <span v-if="tips[ci]" class="chart-tip" :style="tipStyle(tips[ci])">{{ tips[ci].text }}</span>
              </div>
              <div class="chart-x" :style="{ gridTemplateColumns: `repeat(${c.bars.length}, 1fr)` }">
                <span v-for="(b, i) in c.bars" :key="i">{{ b.label }}</span>
              </div>
            </template>

            <!-- line -->
            <template v-else-if="c.type === 'line'">
              <div class="chart-plot">
                <svg :viewBox="`0 0 ${W} ${H}`" class="chart-svg" role="img" :aria-label="c.summary">
                  <line :x1="0" :x2="W" :y1="H - 0.5" :y2="H - 0.5" class="chart-base" />
                  <path v-if="c.area" :d="c.area" class="chart-area" />
                  <path :d="c.path" class="chart-line" pathLength="1" />
                  <circle
                    v-for="(p, i) in c.points" :key="i"
                    class="chart-dot" :class="{ 'is-hot': tips[ci]?.i === i }"
                    :cx="p.x" :cy="p.y" r="5" :style="{ '--d': `${300 + i * 120}ms` }"
                  />
                  <g v-if="c.tooltips">
                    <circle
                      v-for="(p, i) in c.points" :key="i"
                      class="chart-hit" :cx="p.x" :cy="p.y" r="18"
                      @pointerenter="show(ci, i, p.x / W, p.y / H, p)"
                      @click="show(ci, i, p.x / W, p.y / H, p)"
                    />
                  </g>
                </svg>
                <span v-if="tips[ci]" class="chart-tip" :style="tipStyle(tips[ci])">{{ tips[ci].text }}</span>
              </div>
              <div class="chart-x" :style="{ gridTemplateColumns: `repeat(${c.points.length}, 1fr)` }">
                <span v-for="(p, i) in c.points" :key="i">{{ p.label }}</span>
              </div>
            </template>

            <!-- donut / pie -->
            <template v-else>
              <div class="chart-round">
                <div class="chart-ringbox">
                  <svg viewBox="0 0 100 100" class="chart-svg chart-svg--round" role="img" :aria-label="c.summary">
                    <circle cx="50" cy="50" :r="c.ring.r" class="chart-track" :style="{ strokeWidth: c.ring.sw }" />
                    <circle
                      v-for="(s, i) in c.slices" :key="i"
                      class="chart-slice" :class="{ 'is-hot': tips[ci]?.i === i, 'is-live': c.tooltips }"
                      cx="50" cy="50" :r="c.ring.r" pathLength="100"
                      :transform="`rotate(${(s.start * 3.6).toFixed(2)} 50 50)`"
                      :style="{
                        strokeWidth: c.ring.sw, stroke: s.color,
                        '--dash': `${s.pct} ${100 - s.pct}`,
                        '--d': `${s.start * 9}ms`,
                      }"
                      @pointerenter="c.tooltips && show(ci, i, s.tx, s.ty, s)"
                      @click="c.tooltips && show(ci, i, s.tx, s.ty, s)"
                    />
                  </svg>
                  <span v-if="tips[ci]" class="chart-tip" :style="tipStyle(tips[ci])">{{ tips[ci].text }}</span>
                </div>
                <ul v-if="c.slices.length > 1" class="chart-legend">
                  <li v-for="(s, i) in c.slices" :key="i">
                    <i :style="{ background: s.color }" aria-hidden="true"></i>
                    <span>{{ s.label }}</span>
                    <b>{{ s.text }}</b>
                  </li>
                </ul>
              </div>
            </template>
          </figure>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
// ============================================================
// chart — part of lodestar-pro-modules. A presentation-style section:
// a big headline number per chart, its label, and a bar, line, donut
// or pie chart that animates in when the section scrolls into view.
// One chart gets a large two-column layout; two or more share a row.
//
// { module: 'chart', props: {
//     eyebrow: 'Growth', title: 'Our numbers keep going up', intro: '…',
//     charts: [
//       { value: '2,400+', label: 'Clients served', type: 'bar',
//         data: [ { label: '2022', value: 640 }, { label: '2023', value: 1200 }, … ] },
//       { value: '98%', label: 'Client retention', type: 'donut', data: 98 },  // single number = ring out of `max` (100)
//       { value: '3', label: 'Service lines', type: 'pie',
//         data: { Advisory: 52, Tax: 31, Payroll: 17 } },                   // object shorthand works too
//     ],
// }}
//
// Per chart: color (any CSS color; default the theme's --primary),
// text (a sentence under the label), max (donut/pie ring total),
// prefix / suffix (wrap data values in hovers and labels: '$' + 1.1 + 'M'),
// tooltips (hover values; default true).
// Display options: bar → horizontal: true · line → area: false ·
// donut → filled: true (same as type: 'pie').
// Section: onSurface (tinted band), cards (wrap each chart in a card).
// Draws as SVG so it lands in the prerendered HTML; animation never hides
// anything from the prerender snapshot or reduced-motion visitors.
// ============================================================
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  eyebrow: String,
  title: String,
  intro: String,
  charts: { type: Array, default: () => [] },
  onSurface: { type: Boolean, default: false },
  cards: { type: Boolean, default: false },
})

const W = 400, H = 200, TOP = 14
const TYPES = ['bar', 'line', 'donut', 'pie']

// [{label,value}] | {label: value} | number  →  [{label, value}]
function normalize(data) {
  if (typeof data === 'number') return [{ label: '', value: data }]
  if (Array.isArray(data)) return data.map((d, i) =>
    typeof d === 'number' ? { label: String(i + 1), value: d } : { label: d.label ?? '', value: Number(d.value) || 0 })
  if (data && typeof data === 'object') return Object.entries(data).map(([label, value]) => ({ label, value: Number(value) || 0 }))
  return []
}

function shade(i, n) {
  // Pie/donut slices: one theme color in decreasing strength, so any theme
  // gets a coherent palette without configuring one.
  const pct = n <= 1 ? 100 : Math.round(100 - (i * 68) / (n - 1))
  return `color-mix(in srgb, var(--chart-color) ${pct}%, var(--bg))`
}

const list = computed(() => props.charts.map((raw) => {
  let type = TYPES.includes(raw.type) ? raw.type : 'bar'
  if (type === 'donut' && raw.filled) type = 'pie'
  const data = normalize(raw.data)
  const pre = raw.prefix || '', post = raw.suffix || ''
  const fmt = v => pre + v.toLocaleString('en-US') + post
  const c = {
    type, value: raw.value == null ? '' : String(raw.value), label: raw.label || '', text: raw.text || '',
    color: raw.color || 'var(--primary)',
    tooltips: raw.tooltips !== false,
    summary: `${raw.label || 'Chart'}: ${data.map(d => `${d.label} ${fmt(d.value)}`.trim()).join(', ')}`,
  }

  if (type === 'bar' || type === 'line') {
    const n = Math.max(data.length, 1)
    const max = Math.max(...data.map(d => d.value), 0) || 1
    const col = W / n
    const y = v => H - (v / max) * (H - TOP)
    if (type === 'bar') {
      c.horizontal = !!raw.horizontal
      const w = Math.min(col * 0.58, 90)
      c.bars = data.map((d, i) => ({
        ...d, text: fmt(d.value), col, pct: (d.value / max) * 100,
        x: i * col + (col - w) / 2, w, y: y(d.value), h: H - y(d.value),
      }))
    } else {
      c.points = data.map((d, i) => ({ ...d, text: fmt(d.value), x: i * col + col / 2, y: y(d.value) }))
      c.path = c.points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      const first = c.points[0], last = c.points[c.points.length - 1]
      c.area = raw.area !== false && first ? `${c.path} L${last.x.toFixed(1)},${H} L${first.x.toFixed(1)},${H} Z` : ''
    }
  } else {
    const single = data.length === 1
    const total = single ? (Number(raw.max) || 100) : (data.reduce((s, d) => s + d.value, 0) || 1)
    c.ring = type === 'pie' ? { r: 25, sw: 50 } : { r: 40, sw: 14 }
    // Tooltip anchor: middle of the slice — on the ring for a donut,
    // two-thirds out for a pie. Angles run clockwise from 12 o'clock.
    const rr = type === 'pie' ? 32 : 40
    let start = 0
    c.slices = data.map((d, i) => {
      const pct = Math.max(0, Math.min(100, (d.value / total) * 100))
      const a = ((start + pct / 2) / 100) * Math.PI * 2
      const s = {
        ...d, pct, start, text: fmt(d.value),
        color: single ? 'var(--chart-color)' : shade(i, data.length),
        tx: (50 + rr * Math.sin(a)) / 100, ty: (50 - rr * Math.cos(a)) / 100,
      }
      start += pct
      return s
    })
  }
  return c
}))

// ── Hover values ────────────────────────────────────────────
// One tip per chart, positioned as a fraction of the plot box. Tapping
// works on touch (pointerenter fires on tap; click keeps it there).
const tips = ref({})
function show(ci, i, fx, fy, d) {
  tips.value = { ...tips.value, [ci]: { i, fx, fy, text: d.label ? `${d.label}: ${d.text}` : d.text } }
}
function hide(ci) {
  if (!tips.value[ci]) return
  const next = { ...tips.value }; delete next[ci]; tips.value = next
}
const tipStyle = t => ({ left: `${(t.fx * 100).toFixed(2)}%`, top: `${(t.fy * 100).toFixed(2)}%` })

// ── Count-up for the headline numbers ───────────────────────
// Keeps whatever's around the number: '$4.2M' → '$', 4.2, 'M'; '2,400+' keeps the comma.
function parse(v) {
  const m = /^(\D*?)(\d[\d,]*(?:\.\d+)?|\.\d+)(.*)$/.exec(v)
  if (!m) return null
  const num = Number(m[2].replace(/,/g, ''))
  return { pre: m[1], num, post: m[3], dec: (m[2].split('.')[1] || '').length, comma: m[2].includes(',') }
}
function format(p, n) {
  const s = p.comma
    ? n.toLocaleString('en-US', { minimumFractionDigits: p.dec, maximumFractionDigits: p.dec })
    : n.toFixed(p.dec)
  return p.pre + s + p.post
}

const root = ref(null)
const armed = ref(false)
const shown = ref([])   // null entries fall back to the real value
let io = null, raf = 0

function countUp() {
  const parsed = list.value.map(c => parse(c.value))
  const dur = 1400, t0 = performance.now()
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur)
    const e = 1 - Math.pow(1 - k, 3) // ease-out cubic
    shown.value = parsed.map(p => p ? format(p, p.num * e) : null)
    if (k < 1) raf = requestAnimationFrame(tick)
    else shown.value = []
  }
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  if (!root.value) return
  // Same rules as section motion: no hidden state for reduced motion,
  // the prerender snapshot (Puppeteer sets navigator.webdriver), or
  // browsers without IntersectionObserver — the final chart just shows.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (navigator.webdriver || typeof IntersectionObserver === 'undefined') return

  armed.value = true
  shown.value = list.value.map(c => { const p = parse(c.value); return p ? format(p, 0) : null })
  io = new IntersectionObserver((entries) => {
    if (!entries.some(e => e.isIntersecting)) return
    io.disconnect(); io = null
    // Two frames: let the armed state paint before releasing it, so the
    // transitions always run (including when the chart starts on screen).
    requestAnimationFrame(() => requestAnimationFrame(() => { armed.value = false; countUp() }))
  }, { threshold: 0.3 })
  io.observe(root.value.querySelector('.chart-grid') || root.value)
})

onUnmounted(() => { io?.disconnect(); cancelAnimationFrame(raf) })
</script>

<style scoped>
.chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: clamp(1.5rem, 4vw, 3rem); }
.chart-item { min-width: 0; display: flex; flex-direction: column; gap: 1.25rem; }
.chart-item.card { padding: clamp(1.25rem, 3vw, 2rem); }

/* One chart: presentation layout — copy on the left, a big chart on the right */
.chart-grid.is-solo { grid-template-columns: 1fr; max-width: 1040px; margin-inline: auto; }
.is-solo .chart-item { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); align-items: center; gap: clamp(1.5rem, 5vw, 4rem); }
@media (max-width: 760px) { .is-solo .chart-item { grid-template-columns: 1fr; } }

.chart-value {
  font-family: var(--font-display); font-weight: var(--display-weight, 700);
  font-size: clamp(2.4rem, 5.5vw, 3.6rem); line-height: 1; color: var(--chart-color);
  font-variant-numeric: tabular-nums;
}
.is-solo .chart-value { font-size: clamp(3rem, 8vw, 5rem); }
.chart-label {
  margin-top: 0.7rem; font-size: 0.74rem; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-muted);
}
.chart-text { margin-top: 0.9rem; color: var(--text-muted); max-width: 40ch; }
.chart-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.chart-figure { margin: 0; min-width: 0; }
.chart-svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart-x { display: grid; margin-top: 0.6rem; font-size: 0.78rem; color: var(--text-muted); text-align: center; }
.chart-base { stroke: var(--border); stroke-width: 1; }

/* ── Bars ── */
.chart-bar {
  fill: var(--chart-color);
  transform-box: fill-box; transform-origin: 50% 100%;
  transition: transform 900ms cubic-bezier(.2, .8, .2, 1) var(--d, 0ms);
}
.chart-armed .chart-bar { transform: scaleY(0); transition: none; }

/* ── Line ── */
.chart-line {
  fill: none; stroke: var(--chart-color); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1; stroke-dashoffset: 0; transition: stroke-dashoffset 1200ms cubic-bezier(.4, .1, .2, 1);
}
.chart-area { fill: color-mix(in srgb, var(--chart-color) 12%, transparent); transition: opacity 900ms ease 500ms; }
.chart-dot { fill: var(--bg); stroke: var(--chart-color); stroke-width: 3; transition: opacity 300ms ease var(--d, 0ms); }
.chart-armed .chart-line { stroke-dashoffset: 1; transition: none; }
.chart-armed .chart-area, .chart-armed .chart-dot { opacity: 0; transition: none; }

/* ── Donut / pie ── */
.chart-round { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
.chart-ringbox { position: relative; flex: 0 0 auto; width: min(100%, 240px); }
.is-solo .chart-ringbox { width: min(100%, 320px); }
.chart-svg--round { transform: rotate(-90deg); }
.chart-track { fill: none; stroke: var(--border); }
.chart-slice {
  fill: none; stroke-dasharray: var(--dash);
  transition: stroke-dasharray 900ms cubic-bezier(.4, .1, .2, 1) var(--d, 0ms);
}
.chart-armed .chart-slice { stroke-dasharray: 0 100; transition: none; }
.chart-legend { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; font-size: 0.9rem; min-width: 10rem; }
.chart-legend li { display: grid; grid-template-columns: 0.8rem 1fr auto; align-items: center; gap: 0.6rem; }
.chart-legend i { width: 0.8rem; height: 0.8rem; border-radius: 3px; }
.chart-legend b { font-weight: 600; color: var(--text); }

/* ── Horizontal bars ── */
.chart-hbars { display: grid; grid-template-columns: max-content minmax(0, 1fr); align-items: center; gap: 0.85rem 1rem; }
.chart-hlabel { font-size: 0.85rem; color: var(--text-muted); text-align: right; }
.chart-htrack { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.chart-hbar {
  flex: 0 0 auto; width: calc(var(--p) * (100% - 5rem) / 100); min-width: 2px; height: 1.6rem;
  background: var(--chart-color); border-radius: 4px;
  transform-origin: left center; transition: transform 900ms cubic-bezier(.2, .8, .2, 1) var(--d, 0ms);
}
.is-solo .chart-hbar { height: 2.1rem; }
.chart-hval { font-size: 0.9rem; font-weight: 600; color: var(--text); white-space: nowrap; transition: opacity 400ms ease var(--d, 0ms); }
.chart-armed .chart-hbar { transform: scaleX(0); transition: none; }
.chart-armed .chart-hval { opacity: 0; transition: none; }

/* ── Hover values ── */
.chart-plot { position: relative; }
.chart-hit { fill: transparent; cursor: pointer; }
.chart-slice.is-live { cursor: pointer; }
.chart-bar.is-hot, .chart-slice.is-hot { opacity: 0.8; }
.chart-dot.is-hot { fill: var(--chart-color); }
.chart-tip {
  position: absolute; z-index: 2; pointer-events: none; white-space: nowrap;
  transform: translate(-50%, calc(-100% - 12px));
  padding: 0.35rem 0.65rem; border-radius: 6px;
  background: var(--text); color: var(--bg);
  font-size: 0.8rem; font-weight: 600; line-height: 1.3;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--text) 18%, transparent);
}
.chart-tip::after {
  content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
  border: 5px solid transparent; border-top-color: var(--text);
}

@media (prefers-reduced-motion: reduce) {
  .chart-bar, .chart-line, .chart-area, .chart-dot, .chart-slice, .chart-hbar, .chart-hval { transition: none !important; }
}
</style>
