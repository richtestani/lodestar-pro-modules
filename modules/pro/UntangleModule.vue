<template>
  <section ref="root" class="section untangle-section" :class="{ 'section--surface': onSurface }" :style="{ '--ut-issue': issueColor }">
    <div class="container">
      <div v-if="eyebrow || title || intro" class="section-head is-center">
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title" class="h-title">{{ title }}</h2>
        <p v-if="intro">{{ intro }}</p>
      </div>

      <div class="ut-wrap">
        <div class="ut-bar">
          <button v-if="mode === 'messy'" type="button" class="btn ut-go" @click="analyze">{{ analyzeLabel }}</button>
          <button v-else type="button" class="btn btn--ghost ut-go" @click="reset">{{ resetLabel }}</button>
          <p class="ut-stats" aria-hidden="true">
            <span><b>{{ stats.tools }}</b> {{ labels.tools }}</span>
            <span><b>{{ stats.connections }}</b> {{ labels.connections }}</span>
            <span :class="{ 'is-bad': stats.issues > 0 }"><b>{{ stats.issues }}</b> {{ labels.issues }}</span>
          </p>
        </div>

        <div ref="stage" class="ut-stage" :class="{ 'is-dragging': drag }" @pointerleave="!drag && hideTip()">
          <svg
            ref="svg" class="ut-svg" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true"
            @pointermove="move" @pointerup="up" @pointercancel="up"
          >
            <g class="ut-lanes" :class="{ 'is-on': mode === 'clean' }">
              <rect v-for="l in laneBoxes" :key="l.label" :x="l.x" :y="l.y" :width="l.w" :height="l.h" rx="12" />
            </g>

            <g class="ut-links">
              <path
                v-for="(l, i) in drawnLinks" :key="`${mode}-${i}`"
                :d="l.d" :opacity="l.o"
                :class="mode === 'clean' ? 'is-clean' : (l.bad ? 'is-bad' : '')"
              />
            </g>

            <!-- lane labels sit above the links so lines pass behind them -->
            <g class="ut-lanes" :class="{ 'is-on': mode === 'clean' }">
              <text v-for="l in laneBoxes" :key="l.label" :x="l.tx" :y="l.ty" text-anchor="middle">{{ l.label }}</text>
            </g>

            <g
              v-for="(n, i) in drawn" :key="n.id"
              class="ut-node"
              :class="{ 'is-issue': n.issueOn, 'is-clean': n.cleanOn, 'is-hot': tip && tip.id === n.id }"
              :transform="`translate(${n.x} ${n.y}) scale(${n.s})`"
              :opacity="n.o"
              :style="{ pointerEvents: n.o < 0.3 ? 'none' : null }"
              @pointerdown="down($event, n.id)"
              @pointerenter="hover($event, n.id)"
            >
              <rect :x="-n.w / 2" :y="-NH / 2" :width="n.w" :height="NH" rx="9" />
              <text :ref="el => { if (el) textEls[i] = el }" text-anchor="middle" dominant-baseline="central">{{ n.label }}</text>
              <g v-if="n.issueOn" class="ut-flag" :transform="`translate(${n.w / 2 - 3} ${-NH / 2 + 2})`">
                <circle r="8" />
                <text text-anchor="middle" dominant-baseline="central">!</text>
              </g>
            </g>
          </svg>

          <span v-if="tip" class="ut-tip" :style="{ left: `${tip.fx * 100}%`, top: `${tip.fy * 100}%` }">{{ tip.text }}</span>
          <p v-if="hint && mode === 'messy'" class="ut-hint" aria-hidden="true">{{ hint }}</p>
        </div>

        <div class="ut-result" :class="{ 'is-on': mode === 'clean' && (result || cta) }">
          <p v-if="result">{{ result }}</p>
          <template v-if="cta">
            <RouterLink v-if="isInternal(cta.to)" :to="cta.to" class="btn">{{ cta.label }}</RouterLink>
            <a v-else :href="cta.to || cta.href" class="btn">{{ cta.label }}</a>
          </template>
        </div>
      </div>

      <div class="ut-sr">
        <p>{{ srSummary }}</p>
        <p aria-live="polite">{{ announce }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
// ============================================================
// untangle — part of lodestar-pro-modules. A fidget-able "before and
// after" of a messy tech stack: tools drawn as a living, jiggling web the
// visitor can drag and fling around, problem tools flagged in red with a
// note on hover. "Analyze" reorganizes it into clean lanes: redundant
// tools glide into the one they're replaced by and merge, dead ones fade
// out, the rest settle into columns joined by flowing connections, and
// the counts above tick down. Then an optional result line + button.
//
// { module: 'untangle', props: {
//     eyebrow: 'See it', title: 'Your stack, untangled', intro: '…',
//     lanes: ['Inputs', 'Core', 'Outputs'],
//     nodes: [
//       { id: 'crm',   label: 'CRM',     lane: 'Inputs' },
//       { id: 'zap',   label: 'Zapier',  lane: 'Core', cleanLabel: 'Integration hub',
//         issue: '14 zaps, and nobody remembers who built them' },
//       { id: 'gmail', label: 'Gmail',   lane: 'Outputs' },
//       { id: 'ol',    label: 'Outlook', mergeInto: 'gmail',
//         issue: 'Two email platforms, double the licensing' },
//       { id: 'srv',   label: 'Old server', remove: true, issue: 'Unpatched since 2019' },
//     ],
//     links:      [['crm', 'zap'], ['crm', 'ol'], ['ol', 'gmail'], ['srv', 'zap']],  // the mess
//     cleanLinks: [['crm', 'zap'], ['zap', 'gmail']],                                 // after
//     result: 'Five fewer tools to pay for. One place the data lives.',
//     cta: { label: 'Map my stack', to: '/contact' },
// }}
//
// Leave nodes/links out entirely to get a built-in small-business demo.
// Per node: lane (name or index; kept nodes only), cleanLabel (renamed
// after), issue (red flag + hover note), mergeInto (id it folds into),
// remove (fades away). Section: analyzeLabel, resetLabel, hint,
// statLabels { tools, connections, issues }, issueColor, onSurface.
// No canvas, no library: SVG + a ~60-line spring simulation, paused when
// off screen or settled. Reduced motion: no jiggle, and Analyze snaps
// straight to the clean layout. The prerender snapshot gets a settled,
// deterministic layout (seeded), not a random one.
// ============================================================
import { ref, computed, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { DEMO } from './untangleDemo.js'

const props = defineProps({
  eyebrow: String,
  title: String,
  intro: String,
  nodes: Array,
  links: Array,
  cleanLinks: Array,
  lanes: Array,
  analyzeLabel: { type: String, default: 'Analyze' },
  resetLabel:   { type: String, default: 'Tangle it again' },
  hint:         { type: String, default: 'Go ahead, drag things around.' },
  statLabels: Object,
  result: String,
  cta: Object,
  issueColor: { type: String, default: '#d64545' },
  onSurface: { type: Boolean, default: false },
})

const NH = 34                      // node height, viewBox units
const useDemo = !props.nodes?.length
const src = {
  nodes:      useDemo ? DEMO.nodes      : props.nodes,
  links:      useDemo ? DEMO.links      : (props.links || []),
  cleanLinks: useDemo ? DEMO.cleanLinks : (props.cleanLinks || []),
  lanes:      props.lanes?.length ? props.lanes : (useDemo ? DEMO.lanes : ['Inputs', 'Core', 'Outputs']),
}
const labels = computed(() => ({ tools: 'tools', connections: 'connections', issues: 'issues', ...props.statLabels }))
const warn = (...a) => { if (import.meta.env.DEV) console.warn('[lodestar-pro-modules] untangle:', ...a) }

// ── Layout: landscape on wide stages, portrait (lanes as rows) on phones ──
const portrait = ref(false)
const W = computed(() => portrait.value ? 380 : 800)
const H = computed(() => portrait.value ? 640 : 460)

// ── Simulation state (plain objects; `tick` drives re-render) ──
const ids = new Set()
const sim = src.nodes.filter((n) => {
  if (!n?.id || ids.has(n.id)) { warn('node skipped — missing or duplicate id', n); return false }
  ids.add(n.id); return true
}).map((n) => {
  const laneIdx = typeof n.lane === 'number' ? n.lane : src.lanes.indexOf(n.lane)
  return {
    id: n.id, label: n.label || n.id, cleanLabel: n.cleanLabel || n.label || n.id,
    issue: n.issue || '', mergeInto: null, mergeRaw: n.mergeInto || null, remove: !!n.remove,
    lane: laneIdx >= 0 && laneIdx < src.lanes.length ? laneIdx : Math.floor(src.lanes.length / 2),
    x: 0, y: 0, vx: 0, vy: 0, o: 1, s: 1, w: (n.label || n.id).length * 7.4 + 30,
    tx: 0, ty: 0, pulse: 0, gone: false, merged: false,
  }
})
const byId = Object.fromEntries(sim.map(n => [n.id, n]))
// mergeInto can point at a node declared later in the list — resolve after all ids exist.
sim.forEach((n) => {
  n.mergeInto = n.mergeRaw && byId[n.mergeRaw] && n.mergeRaw !== n.id ? n.mergeRaw : null
  if (n.mergeRaw && !n.mergeInto) { warn(`"${n.id}" mergeInto "${n.mergeRaw}" — no such node; it will fade out instead`); n.remove = true }
})
const kept = n => !n.mergeInto && !n.remove
const resolveLinks = list => list.filter((l) => {
  const ok = Array.isArray(l) && byId[l[0]] && byId[l[1]]
  if (!ok) warn('link skipped — unknown node id', l)
  return ok
}).map(([a, b]) => ({ a: byId[a], b: byId[b] }))
const messyLinks = resolveLinks(src.links)
const cleanLinkList = resolveLinks(src.cleanLinks).filter(({ a, b }) => {
  if (kept(a) && kept(b)) return true
  warn('clean link skipped — it touches a merged/removed node', [a.id, b.id]); return false
})

const mode = ref('messy')
const tick = ref(0)
let cleanFrame = 0

// Seeded PRNG so the first layout (and the prerendered HTML) is the same every build.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
let rand = rng(7)

function scatter() {
  sim.forEach((n) => {
    n.x = W.value * (0.2 + rand() * 0.6); n.y = H.value * (0.2 + rand() * 0.6)
    n.vx = n.vy = 0; n.o = 1; n.s = 1; n.gone = false; n.merged = false
  })
}

function targets() {
  const L = src.lanes.length, w = W.value, h = H.value
  for (let li = 0; li < L; li++) {
    // Slot order follows where nodes are now (top-most gets the top slot),
    // so nodes glide straight into place instead of crossing each other.
    const group = sim.filter(n => kept(n) && n.lane === li)
      .sort((a, b) => portrait.value ? (a.y - b.y) || (a.x - b.x) : a.y - b.y)
    group.forEach((n, j) => {
      const k = group.length
      if (!portrait.value) {
        n.tx = w * (li + 0.5) / L
        n.ty = 64 + (h - 84) * (j + 0.5) / k
      } else {
        const band = (h - 12) / L, top = 6 + band * li
        const cols = Math.min(k, 2), rows = Math.ceil(k / cols)
        const c = j % cols, r = Math.floor(j / cols)
        const inRow = Math.min(cols, k - r * cols)   // a lone last node centers
        n.tx = w * (c + 0.5) / inRow
        n.ty = top + 40 + (band - 52) * (r + 0.5) / rows
      }
    })
  }
}

const laneBoxes = computed(() => {
  const L = src.lanes.length, w = W.value, h = H.value
  return src.lanes.map((label, i) => portrait.value
    ? { label, x: 8, y: 6 + (h - 12) / L * i + 4, w: w - 16, h: (h - 12) / L - 8, tx: w / 2, ty: 6 + (h - 12) / L * i + 24 }
    : { label, x: w * i / L + 8, y: 12, w: w / L - 16, h: h - 24, tx: w * (i + 0.5) / L, ty: 36 })
})

// ── Physics ─────────────────────────────────────────────────
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function step() {
  const messy = mode.value === 'messy'
  const w = W.value, h = H.value
  const live = sim.filter(n => !n.gone && n.o > 0.05)
  if (!messy) cleanFrame++

  // Node-to-node forces only in the mess. Clean slots are already spaced,
  // and pushing there just makes nodes jam while passing each other.
  if (messy) for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j]
      let dx = b.x - a.x, dy = b.y - a.y
      const d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2)
      const f = (portrait.value ? 3200 : 5200) / d2
      a.vx -= dx / d * f; a.vy -= dy / d * f; b.vx += dx / d * f; b.vy += dy / d * f
      // Label boxes never overlap: push apart along the shallower axis.
      const ox = (a.w + b.w) / 2 + 10 - Math.abs(dx), oy = NH + 10 - Math.abs(dy)
      if (ox > 0 && oy > 0) {
        if (ox < oy) { const p = (dx < 0 ? -ox : ox) * 0.25; a.vx -= p; b.vx += p }
        else { const p = (dy < 0 ? -oy : oy) * 0.25; a.vy -= p; b.vy += p }
      }
    }
  }

  if (messy) {
    for (const { a, b } of messyLinks) {
      let dx = b.x - a.x, dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 150) * 0.01
      a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f
    }
  }

  let order = 0
  for (const n of sim) {
    if (n.gone) continue
    if (messy) {
      n.vx += (w / 2 - n.x) * 0.0007; n.vy += (h / 2 - n.y) * 0.0016
      if (!reduced) { n.vx += (rand() - 0.5) * 0.3; n.vy += (rand() - 0.5) * 0.3 }
    } else if (kept(n)) {
      n.vx += (n.tx - n.x) * 0.05; n.vy += (n.ty - n.y) * 0.05
    } else {
      // Kept nodes move first, then the casualties go one at a time.
      if (cleanFrame < 24 + order++ * 10) { n.vx *= 0.7; n.vy *= 0.7 }
      else if (n.mergeInto) {
        const t = byId[n.mergeInto]
        n.vx += (t.x - n.x) * 0.07; n.vy += (t.y - n.y) * 0.07
        if (Math.hypot(t.x - n.x, t.y - n.y) < 14) {
          n.o -= 0.12; n.s = 0.5 + 0.5 * Math.max(n.o, 0)
          if (!n.merged) { n.merged = true; t.pulse = 1 }
        }
      } else {
        n.o -= 0.03; n.s = 0.6 + 0.4 * Math.max(n.o, 0)
      }
      if (n.o <= 0) { n.o = 0; n.gone = true }
    }
    n.pulse *= 0.88
    if (drag && drag.node === n) continue
    n.vx *= messy ? 0.82 : 0.76; n.vy *= messy ? 0.82 : 0.76
    const sp = Math.hypot(n.vx, n.vy); if (sp > 30) { n.vx *= 30 / sp; n.vy *= 30 / sp }
    n.x += n.vx; n.y += n.vy
    n.x = Math.max(n.w / 2 + 6, Math.min(w - n.w / 2 - 6, n.x))
    n.y = Math.max(NH / 2 + 6, Math.min(h - NH / 2 - 6, n.y))
  }
}

function settled() {
  if (drag) return false
  if (mode.value === 'messy' && !reduced) return false
  if (mode.value === 'clean' && sim.some(n => !kept(n) && !n.gone)) return false
  return sim.every(n => n.gone || Math.hypot(n.vx, n.vy) < 0.03) && sim.every(n => n.pulse < 0.01)
}

// ── Loop: runs only while on screen and still moving ──
let raf = 0, running = false, visible = true, io = null, ro = null
function loop() {
  step(); tick.value++
  if (visible && !settled()) raf = requestAnimationFrame(loop)
  else running = false
}
function wake() { if (!running && visible && live) { running = true; raf = requestAnimationFrame(loop) } }
let live = false // false for the prerender snapshot — static layout only

// ── What gets drawn ──
const drawn = computed(() => {
  tick.value
  const clean = mode.value === 'clean'
  return sim.map(n => ({
    id: n.id, x: +n.x.toFixed(1), y: +n.y.toFixed(1), w: +n.w.toFixed(1),
    o: +n.o.toFixed(3), s: +(n.s * (1 + 0.16 * n.pulse)).toFixed(3),
    label: clean && kept(n) ? n.cleanLabel : n.label,
    // Casualties stay red on their way out, so you see the problem get absorbed.
    issueOn: !!n.issue && (!clean || !kept(n)), cleanOn: clean && kept(n),
  }))
})
const drawnLinks = computed(() => {
  tick.value
  const clean = mode.value === 'clean'
  const list = clean ? cleanLinkList : messyLinks
  return list.map(({ a, b }) => {
    const o = Math.min(a.o, b.o)
    let d
    if (!clean) d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`
    else if (!portrait.value) { const m = ((a.x + b.x) / 2).toFixed(1); d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} C${m},${a.y.toFixed(1)} ${m},${b.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}` }
    else { const m = ((a.y + b.y) / 2).toFixed(1); d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} C${a.x.toFixed(1)},${m} ${b.x.toFixed(1)},${m} ${b.x.toFixed(1)},${b.y.toFixed(1)}` }
    return { d, o: +(o * (clean ? 0.9 : 0.55)).toFixed(3), bad: !!(a.issue || b.issue) }
  })
})

// Real label widths once fonts are in (estimate until then).
const textEls = []
function measure() {
  textEls.forEach((el, i) => {
    try { const len = el.getComputedTextLength(); if (len > 0) sim[i].w = len + 30 } catch { /* not rendered */ }
  })
}

// ── Stats count down/up ──
const counts = (clean) => ({
  tools: clean ? sim.filter(kept).length : sim.length,
  connections: clean ? cleanLinkList.length : messyLinks.length,
  issues: clean ? 0 : sim.filter(n => n.issue).length,
})
const stats = reactive(counts(false))
let statRaf = 0
function tweenStats(to) {
  cancelAnimationFrame(statRaf)
  const from = { ...stats }, t0 = performance.now(), dur = reduced ? 0 : 1100
  const go = (t) => {
    const k = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3)
    for (const key in to) stats[key] = Math.round(from[key] + (to[key] - from[key]) * e)
    if (k < 1) statRaf = requestAnimationFrame(go)
  }
  statRaf = requestAnimationFrame(go)
}

// ── Actions ──
const announce = ref('')
function analyze() {
  hideTip()
  mode.value = 'clean'; cleanFrame = 0
  targets()
  tweenStats(counts(true))
  announce.value = [`Reorganized: ${stats.tools} ${labels.value.tools} down to ${sim.filter(kept).length}.`, props.result].filter(Boolean).join(' ')
  if (reduced || !live) {
    sim.forEach((n) => { if (kept(n)) { n.x = n.tx; n.y = n.ty; n.vx = n.vy = 0 } else { n.o = 0; n.gone = true } })
    tick.value++
  }
  nextTick(() => { measure(); wake() })
}
function reset() {
  hideTip()
  mode.value = 'messy'
  sim.forEach((n) => {
    n.o = 1; n.s = 1; n.gone = false; n.merged = false
    n.vx += (rand() - 0.5) * 40; n.vy += (rand() - 0.5) * 40
  })
  // Casualties re-emerge from wherever they disappeared into.
  sim.forEach((n) => { if (n.mergeInto) { const t = byId[n.mergeInto]; n.x = t.x + (rand() - 0.5) * 30; n.y = t.y + (rand() - 0.5) * 30 } })
  tweenStats(counts(false))
  announce.value = ''
  nextTick(() => { measure(); wake() })
}

// ── Drag + fling ──
const svg = ref(null), stage = ref(null), root = ref(null)
let drag = null
function toSvg(e) {
  const r = svg.value.getBoundingClientRect()
  return { x: (e.clientX - r.left) * W.value / r.width, y: (e.clientY - r.top) * H.value / r.height }
}
function down(e, id) {
  if (!live) return
  const n = byId[id], p = toSvg(e)
  drag = { node: n, dx: n.x - p.x, dy: n.y - p.y, lx: p.x, ly: p.y, vx: 0, vy: 0, moved: 0, pointer: e.pointerId }
  svg.value.setPointerCapture?.(e.pointerId)
  wake()
}
function move(e) {
  if (!drag || e.pointerId !== drag.pointer) return
  const p = toSvg(e), n = drag.node
  drag.vx = p.x - drag.lx; drag.vy = p.y - drag.ly; drag.lx = p.x; drag.ly = p.y
  drag.moved += Math.abs(drag.vx) + Math.abs(drag.vy)
  n.x = p.x + drag.dx; n.y = p.y + drag.dy
  if (drag.moved > 6) hideTip()
}
function up(e) {
  if (!drag || (e && e.pointerId !== drag.pointer)) return
  const n = drag.node
  if (drag.moved < 6) tapTip(n)                // a tap, not a drag → toggle its note
  else { n.vx = drag.vx * 0.6; n.vy = drag.vy * 0.6 }   // fling
  drag = null
  wake()
}

// ── Issue notes ──
const tip = ref(null)
const hoverable = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
function showTip(n) {
  if (!n.issue || mode.value !== 'messy') return
  tip.value = { id: n.id, text: n.issue, fx: n.x / W.value, fy: (n.y - NH / 2) / H.value }
}
function hideTip() { tip.value = null }
function hover(e, id) { if (hoverable && !drag) showTip(byId[id]) }
function tapTip(n) { tip.value?.id === n.id ? hideTip() : showTip(n) }
// Keep an open note riding along with its (jiggling) node.
watch(tick, () => {
  if (!tip.value) return
  const n = byId[tip.value.id]
  tip.value.fx = n.x / W.value; tip.value.fy = (n.y - NH / 2) / H.value
})

const isInternal = to => typeof to === 'string' && to.startsWith('/')

const srSummary = computed(() => {
  const issues = sim.filter(n => n.issue).map(n => `${n.label}: ${n.issue}`)
  return `Interactive diagram of a tangled set of ${sim.length} business tools${issues.length ? ` with problems — ${issues.join('; ')}` : ''}. ` +
    `Press ${props.analyzeLabel} to see it reorganized into ${sim.filter(kept).length} tools.`
})

// ── Lifecycle ──
function setPortrait(p) {
  if (p === portrait.value) return
  const ow = W.value, oh = H.value
  portrait.value = p
  sim.forEach((n) => { n.x *= W.value / ow; n.y *= H.value / oh })
  if (mode.value === 'clean') targets()
  wake()
}

// Settle the opening layout before first paint (deterministic, so the
// prerendered HTML and the live page start from the same picture).
scatter()
for (let i = 0; i < 260; i++) step()

onMounted(() => {
  measure()
  if (stage.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(([e]) => setPortrait(e.contentRect.width < 560))
    ro.observe(stage.value)
    setPortrait(stage.value.getBoundingClientRect().width < 560)
  }
  tick.value++
  // Same rule as section motion / chart: the prerender snapshot (Puppeteer
  // sets navigator.webdriver) gets a still frame, never a running sim.
  if (navigator.webdriver) return
  live = true
  rand = rng(Date.now() & 0xffff)
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake() }, { rootMargin: '80px' })
    io.observe(root.value)
  }
  document.fonts?.ready.then(() => { measure(); wake() })
  wake()
})
onUnmounted(() => { cancelAnimationFrame(raf); cancelAnimationFrame(statRaf); io?.disconnect(); ro?.disconnect() })
</script>

<style scoped>
.ut-wrap { max-width: 960px; margin-inline: auto; }
.ut-bar { display: flex; align-items: center; gap: 1rem 1.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
.ut-go { min-width: 9.5rem; justify-content: center; }
.ut-stats { display: flex; gap: 0.4rem 1.25rem; flex-wrap: wrap; margin: 0; font-size: 0.9rem; color: var(--text-muted); }
.ut-stats b { color: var(--text); font-weight: 700; font-variant-numeric: tabular-nums; }
.ut-stats .is-bad b { color: var(--ut-issue); }

.ut-stage {
  position: relative; border: 1px solid var(--border); border-radius: 18px;
  background: var(--bg); overflow: hidden; user-select: none; -webkit-user-select: none;
}
.ut-svg { display: block; width: 100%; height: auto; }
.ut-hint {
  position: absolute; left: 0; right: 0; bottom: 0.7rem; margin: 0; text-align: center;
  font-size: 0.8rem; color: var(--text-muted); pointer-events: none;
}

/* Lanes */
.ut-lanes { opacity: 0; transition: opacity 600ms ease; }
.ut-lanes.is-on { opacity: 1; transition-delay: 250ms; }
.ut-lanes rect { fill: color-mix(in srgb, var(--primary) 4%, transparent); stroke: var(--border); stroke-dasharray: 5 6; }
.ut-lanes text {
  fill: var(--text-muted); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  paint-order: stroke; stroke: color-mix(in srgb, var(--primary) 4%, var(--bg)); stroke-width: 7px; stroke-linejoin: round;
}

/* Links */
.ut-links path { fill: none; stroke: var(--text-muted); stroke-width: 1.3; }
.ut-links path.is-bad { stroke: color-mix(in srgb, var(--ut-issue) 60%, var(--text-muted)); }
.ut-links path.is-clean {
  stroke: var(--primary); stroke-width: 2; stroke-linecap: round;
  stroke-dasharray: 7 9; animation: ut-flow 1.1s linear infinite;
}
@keyframes ut-flow { to { stroke-dashoffset: -16; } }

/* Nodes */
.ut-node { cursor: grab; touch-action: none; }
.is-dragging .ut-node { cursor: grabbing; }
.ut-node rect {
  fill: var(--surface); stroke: color-mix(in srgb, var(--text) 22%, transparent); stroke-width: 1;
  transition: fill 400ms ease, stroke 400ms ease;
}
.ut-node > text { fill: var(--text); font-size: 13px; font-weight: 600; pointer-events: none; }
.ut-node.is-issue rect { fill: color-mix(in srgb, var(--ut-issue) 10%, var(--bg)); stroke: var(--ut-issue); }
.ut-node.is-hot rect { stroke-width: 2; }
.ut-node.is-clean rect { fill: color-mix(in srgb, var(--primary) 11%, var(--bg)); stroke: var(--primary); }
.ut-flag circle { fill: var(--ut-issue); }
.ut-flag text { fill: #fff; font-size: 11px; font-weight: 800; pointer-events: none; }

/* Issue note */
.ut-tip {
  position: absolute; z-index: 2; pointer-events: none; max-width: min(260px, 70%);
  transform: translate(-50%, calc(-100% - 10px));
  padding: 0.45rem 0.7rem; border-radius: 8px;
  background: var(--text); color: var(--bg);
  font-size: 0.8rem; font-weight: 600; line-height: 1.35; text-align: center;
  box-shadow: 0 6px 18px color-mix(in srgb, var(--text) 20%, transparent);
}
.ut-tip::after {
  content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
  border: 5px solid transparent; border-top-color: var(--text);
}

/* Result line */
.ut-result {
  display: flex; align-items: center; justify-content: center; gap: 1rem 1.5rem; flex-wrap: wrap;
  margin-top: 1.25rem; text-align: center;
  opacity: 0; transform: translateY(8px); visibility: hidden;
  transition: opacity 500ms ease 900ms, transform 500ms ease 900ms, visibility 0s linear 1.4s;
}
.ut-result.is-on { opacity: 1; transform: none; visibility: visible; transition-delay: 900ms, 900ms, 0s; }
.ut-result p { margin: 0; font-size: 1.05rem; color: var(--text); max-width: 46ch; }

.ut-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .ut-links path.is-clean { animation: none; }
  .ut-lanes, .ut-result, .ut-node rect { transition: none !important; }
}
</style>
