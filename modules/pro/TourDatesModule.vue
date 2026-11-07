<template>
  <section class="section td-section" :class="{ 'section--surface': surface, 'td--compact': isCompact }">
    <div class="container" :class="{ 'td-narrow': !isCompact }">
      <div v-if="eyebrow || title || intro" class="section-head is-center">
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title" class="h-title">{{ title }}</h2>
        <p v-if="intro">{{ intro }}</p>
      </div>

      <!-- Next show, featured — only when it carries an image -->
      <article v-if="featured" class="td-feature">
        <div class="td-feature-media"><img :src="asset(featured.image)" :alt="featured.venue" loading="lazy" /></div>
        <div class="td-feature-body">
          <p class="td-feature-label">{{ nextLabel }}</p>
          <p class="td-feature-date">{{ featured.longDate }}<span v-if="featured.time"> · {{ featured.time }}</span></p>
          <h3 class="td-feature-venue">{{ featured.venue }}</h3>
          <p v-if="featured.place" class="td-place">
            <a v-if="featured.mapUrl" :href="featured.mapUrl" target="_blank" rel="noopener">{{ featured.place }}</a>
            <template v-else>{{ featured.place }}</template>
          </p>
          <p v-if="featured.note" class="td-note">{{ featured.note }}</p>
          <div class="td-feature-foot">
            <span v-if="featured.statusLabel" class="td-badge" :class="`is-${featured.status}`">{{ featured.statusLabel }}</span>
            <span v-if="featured.price" class="td-price">{{ featured.price }}</span>
            <a v-if="featured.canBuy" :href="featured.ticketUrl" class="btn" target="_blank" rel="noopener">{{ ticketLabel }}</a>
          </div>
        </div>
      </article>

      <template v-if="upcomingList.length">
        <div v-for="g in groups" :key="g.key" class="td-group">
          <h3 v-if="g.label" class="td-month">{{ g.label }}</h3>
          <ul class="td-list">
            <li v-for="s in g.shows" :key="s.key" class="td-row" :class="{ 'is-off': s.status === 'cancelled' || s.status === 'postponed' }">
              <time class="td-date" :datetime="s.date">
                <span class="td-mon">{{ s.mon }}</span>
                <span class="td-day">{{ s.day }}</span>
                <span class="td-dow">{{ s.dow }}</span>
              </time>
              <div class="td-info">
                <p class="td-venue">{{ s.venue }}</p>
                <p v-if="s.place" class="td-place">
                  <a v-if="s.mapUrl" :href="s.mapUrl" target="_blank" rel="noopener">{{ s.place }}</a>
                  <template v-else>{{ s.place }}</template>
                </p>
                <p v-if="s.meta || s.note" class="td-meta">
                  <span v-if="s.meta">{{ s.meta }}</span>
                  <span v-if="s.meta && s.note" aria-hidden="true"> · </span>
                  <span v-if="s.note">{{ s.note }}</span>
                </p>
              </div>
              <div class="td-action">
                <span v-if="s.statusLabel" class="td-badge" :class="`is-${s.status}`">{{ s.statusLabel }}</span>
                <a v-if="s.canBuy" :href="s.ticketUrl" class="btn td-btn" target="_blank" rel="noopener">{{ ticketLabel }}</a>
              </div>
            </li>
          </ul>
        </div>
      </template>
      <p v-else-if="!featured" class="td-empty">{{ emptyText }}</p>

      <div v-if="moreLink" class="td-more">
        <RouterLink :to="moreLink.to" class="btn btn--ghost">{{ moreLink.label }}</RouterLink>
      </div>

      <details v-if="pastList.length && pastMode" class="td-past" :open="pastMode === 'open'">
        <summary>{{ pastLabel }} <span class="td-count">({{ pastList.length }})</span></summary>
        <ul class="td-past-list">
          <li v-for="s in pastList" :key="s.key">
            <time :datetime="s.date">{{ s.shortDate }}</time>
            <span class="td-past-venue">{{ s.venue }}</span>
            <span v-if="s.place" class="td-past-place">{{ s.place }}</span>
          </li>
        </ul>
      </details>
    </div>
  </section>
</template>

<script setup>
// ============================================================
// tourDates — a performer's show listing. Upcoming shows sorted by date
// and grouped by month, past shows tucked into a collapsed list, ticket
// buttons, sold-out / cancelled badges, an optional featured "next show"
// card, and schema.org MusicEvent structured data for Google's event
// listings.
//
// Put the shows in config/modules/tourDates.js (a sitewide module
// default) so a full listing on /shows and a compact "next 3" strip on
// the home page share one list — see the README.
//
// "Upcoming" is decided in the visitor's browser, not at build time, so
// a show drops into the past list the day after it happens without a
// rebuild. The prerendered HTML (what crawlers see) reflects build day.
// ============================================================
import { computed, onMounted, onBeforeUnmount, watch, useId } from 'vue'
import { asset } from '@/composables/useAssets.js'
import { site } from '@/site.config.js'

const props = defineProps({
  eyebrow: String,
  title:   { type: String, default: '' },
  intro:   String,
  shows:   { type: Array, default: () => [] },

  layout:       { type: String, default: 'list' },   // 'list' | 'compact'
  limit:        { type: Number, default: 0 },        // max upcoming shown; compact defaults to 3
  groupByMonth: { type: Boolean, default: undefined }, // default: on for list, off for compact
  featureNext:  { type: Boolean, default: false },   // next show as a big card (needs an image)
  past:         { type: [String, Boolean], default: 'collapsed' }, // 'collapsed' | 'open' | false
  pastLimit:    { type: Number, default: 12 },
  moreLink:     { type: Object, default: null },     // { label, to } — e.g. compact strip → /shows
  surface:      { type: Boolean, default: false },

  ticketLabel: { type: String, default: 'Tickets' },
  nextLabel:   { type: String, default: 'Next show' },
  pastLabel:   { type: String, default: 'Past shows' },
  emptyText:   { type: String, default: 'No shows on the calendar right now — check back soon.' },
  statusLabels: { type: Object, default: () => ({}) }, // override badge text per status
  locale:      { type: String, default: 'en-US' },

  // Structured data (JSON-LD). On by default for the full list, off for
  // compact so a home-page strip doesn't duplicate the /shows page's data.
  schema:        { type: Boolean, default: undefined },
  performer:     { type: String, default: '' },            // default: site.brand.name
  performerType: { type: String, default: 'MusicGroup' },  // 'MusicGroup' | 'Person'
  currency:      { type: String, default: 'USD' },
})

const STATUS = { 'sold-out': 'Sold out', cancelled: 'Cancelled', postponed: 'Postponed', free: 'Free', 'on-sale': '' }

const isCompact = computed(() => props.layout === 'compact')
const grouped   = computed(() => props.groupByMonth ?? !isCompact.value)
const pastMode  = computed(() => (isCompact.value && props.past === 'collapsed') ? false : props.past)
const wantsSchema = computed(() => props.schema ?? !isCompact.value)
const performerName = computed(() => props.performer || site.brand?.name || '')

// 'YYYY-MM-DD' → a local-midnight Date. new Date('2026-12-05') would be
// UTC midnight, which is the previous evening in the Americas.
function parseDay(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || '').trim())
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}
// '8:00 PM', '8pm', '20:00' → '20:00' (for structured data only)
function to24h(t) {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?$/i.exec(String(t || '').trim())
  if (!m) return ''
  let h = +m[1]; const min = m[2] || '00'; const ap = m[3]?.toLowerCase()
  if (ap === 'p' && h < 12) h += 12
  if (ap === 'a' && h === 12) h = 0
  return h > 23 ? '' : `${String(h).padStart(2, '0')}:${min}`
}

const fmt = (opts) => new Intl.DateTimeFormat(props.locale, opts)

const normalized = computed(() => {
  const out = []
  props.shows.forEach((raw, i) => {
    const day = parseDay(raw.date)
    if (!day) {
      if (import.meta.env.DEV) console.warn(`[tourDates] show #${i + 1} (${raw.venue || 'no venue'}) needs date: 'YYYY-MM-DD' — skipped`)
      return
    }
    const end = parseDay(raw.endDate) || day
    const status = raw.status || (raw.ticketUrl ? 'on-sale' : '')
    const place = [raw.city, raw.region].filter(Boolean).join(', ')
    const mapQ = [raw.venue, raw.address, place].filter(Boolean).join(', ')
    const mapUrl = raw.mapUrl ?? (raw.address || raw.map ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ)}` : '')
    out.push({
      ...raw,
      key: `${raw.date}-${raw.venue || i}`,
      day0: day, end0: end, status, place, mapUrl,
      statusLabel: props.statusLabels[status] ?? STATUS[status] ?? '',
      canBuy: !!raw.ticketUrl && !['sold-out', 'cancelled', 'postponed'].includes(status),
      mon: fmt({ month: 'short' }).format(day),
      day: fmt({ day: 'numeric' }).format(day),
      dow: fmt({ weekday: 'short' }).format(day),
      longDate: fmt({ weekday: 'long', month: 'long', day: 'numeric' }).format(day),
      shortDate: fmt({ month: 'short', day: 'numeric', year: 'numeric' }).format(day),
      monthKey: `${day.getFullYear()}-${day.getMonth()}`,
      monthLabel: fmt({ month: 'long', year: 'numeric' }).format(day),
      meta: [raw.time, raw.price].filter(Boolean).join(' · '),
    })
  })
  return out
})

const today = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) })()

const upcomingAll = computed(() =>
  normalized.value.filter(s => s.end0 >= today).sort((a, b) => a.day0 - b.day0))

const featured = computed(() => {
  const first = upcomingAll.value[0]
  return props.featureNext && first?.image ? first : null
})

const upcomingList = computed(() => {
  let list = featured.value ? upcomingAll.value.slice(1) : upcomingAll.value
  const lim = props.limit || (isCompact.value ? 3 : 0)
  if (lim) list = list.slice(0, featured.value ? Math.max(lim - 1, 0) : lim)
  return list
})

const groups = computed(() => {
  if (!grouped.value) return [{ key: 'all', label: '', shows: upcomingList.value }]
  const map = new Map()
  for (const s of upcomingList.value) {
    if (!map.has(s.monthKey)) map.set(s.monthKey, { key: s.monthKey, label: s.monthLabel, shows: [] })
    map.get(s.monthKey).shows.push(s)
  }
  return [...map.values()]
})

const pastList = computed(() =>
  normalized.value.filter(s => s.end0 < today).sort((a, b) => b.day0 - a.day0).slice(0, props.pastLimit))

// ---- structured data ----------------------------------------------
const abs = (u) => {
  if (!u) return undefined
  try { return new URL(u, window.location.origin).href } catch { return undefined }
}
const EVENT_STATUS = {
  cancelled: 'https://schema.org/EventCancelled',
  postponed: 'https://schema.org/EventPostponed',
}

function eventFor(s) {
  const t = to24h(s.time)
  const ev = {
    '@type': 'MusicEvent',
    name: s.name || [performerName.value, s.venue].filter(Boolean).join(' at '),
    startDate: t ? `${s.date}T${t}` : s.date,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: EVENT_STATUS[s.status] || 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: s.venue,
      address: {
        '@type': 'PostalAddress',
        ...(s.address ? { streetAddress: s.address } : {}),   // street only — city/region go below
        ...(s.city ? { addressLocality: s.city } : {}),
        ...(s.region ? { addressRegion: s.region } : {}),
        ...(s.country ? { addressCountry: s.country } : {}),
      },
    },
  }
  if (s.endDate) ev.endDate = s.endDate
  if (performerName.value) ev.performer = { '@type': props.performerType, name: performerName.value }
  if (s.image) ev.image = abs(asset(s.image))
  if (s.note) ev.description = s.note
  const num = /(\d+(?:\.\d{1,2})?)/.exec(s.price || '')
  if (s.ticketUrl || s.status === 'free' || num) {
    ev.offers = {
      '@type': 'Offer',
      ...(s.ticketUrl ? { url: s.ticketUrl } : {}),
      price: s.status === 'free' ? '0' : (num ? num[1] : undefined),
      priceCurrency: props.currency,
      availability: s.status === 'sold-out' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    }
    if (ev.offers.price === undefined) delete ev.offers.price
  }
  return ev
}

const uid = useId()
const scriptId = `td-jsonld-${uid}`
function writeSchema() {
  document.getElementById(scriptId)?.remove()
  if (!wantsSchema.value || !upcomingAll.value.length) return
  const el = document.createElement('script')
  el.type = 'application/ld+json'
  el.id = scriptId
  el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': upcomingAll.value.map(eventFor) })
  document.head.appendChild(el)
}
onMounted(writeSchema)
watch(upcomingAll, writeSchema)
onBeforeUnmount(() => document.getElementById(scriptId)?.remove())
</script>

<style scoped>
.td-narrow { max-width: 860px; }

/* featured next show */
.td-feature { display: grid; grid-template-columns: 1fr; gap: 0; margin-bottom: 2.5rem; border-radius: var(--radius); overflow: hidden; background: var(--surface); box-shadow: var(--shadow); }
.section--surface .td-feature { background: var(--bg); }
@media (min-width: 720px) { .td-feature { grid-template-columns: 1.1fr 1fr; } }
.td-feature-media { aspect-ratio: 4 / 3; background: var(--surface-2); }
.td-feature-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.td-feature-body { padding: 1.75rem; display: flex; flex-direction: column; justify-content: center; gap: 0.35rem; }
.td-feature-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--primary); margin: 0; }
.td-feature-date { margin: 0; color: var(--text-muted); font-weight: 600; }
.td-feature-venue { font-family: var(--font-display); font-size: clamp(1.5rem, 3vw, 2rem); margin: 0.2rem 0; line-height: 1.15; }
.td-feature-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 1rem; }

/* month groups + rows */
.td-group + .td-group { margin-top: 2.25rem; }
.td-month { font-family: var(--font-body); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin: 0 0 0.25rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--border); }
.td-list { list-style: none; margin: 0; padding: 0; }
.td-row { display: grid; grid-template-columns: 4.25rem 1fr; gap: 0.5rem 1.25rem; align-items: center; padding: 1.1rem 0; border-bottom: 1px solid var(--border); }
@media (min-width: 640px) { .td-row { grid-template-columns: 4.5rem 1fr auto; } }
.td-row.is-off .td-venue, .td-row.is-off .td-date { opacity: 0.55; }
.td-row.is-off .td-venue { text-decoration: line-through; text-decoration-thickness: 1px; }

.td-date { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.45rem 0; border-radius: var(--radius); background: var(--surface); line-height: 1.05; text-align: center; }
.section--surface .td-date { background: var(--bg); }
.td-mon { font-size: 0.66rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--primary); }
.td-day { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; margin: 0.1rem 0; }
.td-dow { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

.td-info { min-width: 0; }
.td-venue { font-family: var(--font-display); font-size: 1.12rem; font-weight: 600; margin: 0; }
.td-place { margin: 0.15rem 0 0; color: var(--text-muted); font-size: 0.92rem; }
.td-place a { color: inherit; text-decoration: underline; text-decoration-color: var(--border); text-underline-offset: 3px; }
.td-place a:hover { color: var(--primary); text-decoration-color: currentColor; }
.td-meta, .td-note { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--text-muted); }

.td-action { grid-column: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; }
@media (min-width: 640px) { .td-action { grid-column: auto; justify-content: flex-end; } }
.td-btn { padding-block: 0.55rem; }
.td-badge { display: inline-block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.35rem 0.6rem; border-radius: 999px; border: 1px solid var(--border); color: var(--text-muted); white-space: nowrap; }
.td-badge.is-sold-out { border-color: var(--text); color: var(--text); }
.td-badge.is-cancelled, .td-badge.is-postponed { border-color: #d24545; color: #d24545; }
.td-badge.is-free { border-color: var(--primary); color: var(--primary); }
.td-price { font-weight: 600; }

.td-empty { text-align: center; color: var(--text-muted); padding: 1.5rem 0; }
.td-more { text-align: center; margin-top: 2rem; }

/* past shows */
.td-past { margin-top: 2.5rem; border-top: 1px solid var(--border); padding-top: 1rem; }
.td-past summary { cursor: pointer; font-weight: 600; color: var(--text-muted); list-style-position: inside; }
.td-past summary:hover { color: var(--text); }
.td-count { font-weight: 400; }
.td-past-list { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.55rem; }
.td-past-list li { display: grid; grid-template-columns: 7.5rem 1fr; gap: 0 1rem; font-size: 0.92rem; color: var(--text-muted); }
@media (min-width: 640px) { .td-past-list li { grid-template-columns: 7.5rem 1fr 1fr; } }
.td-past-venue { color: var(--text); }
.td-past-place { grid-column: 2; }
@media (min-width: 640px) { .td-past-place { grid-column: auto; } }

/* compact: tighter rows, no month headings */
.td--compact .td-row { padding: 0.85rem 0; }
.td--compact .td-list { border-top: 1px solid var(--border); }
.td--compact .container { max-width: 760px; }
</style>
