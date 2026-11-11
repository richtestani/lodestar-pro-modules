#!/usr/bin/env node
// Copies this package's modules/pro and components/pro into a target
// lodestar project. Usage, from inside this repo:
//   node install.mjs /path/to/your-lodestar-project
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const target = process.argv[2]
const REQUIRED_LODESTAR = '0.2.0' // added the import.meta.glob pickup this package needs
const MY_VERSION = JSON.parse(fs.readFileSync(path.join(HERE, 'package.json'), 'utf8')).version

console.log(`lodestar-pro-modules v${MY_VERSION} — installing from ${HERE}`)

if (!target) {
  console.error('Usage: node install.mjs /path/to/your-lodestar-project')
  process.exit(1)
}
if (!fs.existsSync(path.join(target, 'src/site.config.js'))) {
  console.error(`${target} doesn't look like a lodestar project (no src/site.config.js found)`)
  process.exit(1)
}

// Best-effort only — setup.mjs carries the template's version into a
// generated project's package.json, but it's not enforced, so this is a
// heads-up, not a hard gate.
function olderThan(v, min) {
  const a = v.split('.').map(Number), b = min.split('.').map(Number)
  for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0) }
  return false
}
try {
  const targetPkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'))
  if (targetPkg.version && olderThan(targetPkg.version, REQUIRED_LODESTAR)) {
    console.warn(`! ${target}'s package.json is at v${targetPkg.version} — this package needs lodestar >= v${REQUIRED_LODESTAR}.`)
    console.warn(`  Installing anyway, but modules/registry.js and App.vue may predate the optional pickup this relies on.\n`)
  }
} catch { /* no package.json / unreadable — skip the check, not worth failing over */ }

// Remove any existing install first — a plain overwrite-in-place can leave
// stale files behind (a previous version had different files, a manual
// copy missed something, etc.), and has been the actual cause of at least
// one "the update didn't take" report. Deleting first makes that structurally
// impossible: whatever's there after this is only what we just copied.
const destModules    = path.join(target, 'src/modules/pro')
const destComponents = path.join(target, 'src/components/pro')
fs.rmSync(destModules, { recursive: true, force: true })
fs.rmSync(destComponents, { recursive: true, force: true })

fs.cpSync(path.join(HERE, 'modules/pro'), destModules, { recursive: true })
fs.cpSync(path.join(HERE, 'components/pro'), destComponents, { recursive: true })

// Verify the copy actually landed byte-for-byte, rather than trusting that
// cpSync silently succeeded — hash every file on both sides.
function hashDir(dir) {
  const out = {}
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isFile()) out[f] = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex')
  }
  return out
}
function verify(srcDir, destDir, label) {
  const src = hashDir(srcDir), dest = hashDir(destDir)
  const mismatches = Object.keys(src).filter(f => src[f] !== dest[f])
  if (mismatches.length) {
    console.error(`✗ ${label}: verification failed after copy — ${mismatches.join(', ')} don't match the source.`)
    console.error(`  Something is intercepting the copy (a symlink, a sync tool, permissions). Installation did not complete cleanly.`)
    process.exitCode = 1
  }
  return mismatches.length === 0
}
const modulesOk    = verify(path.join(HERE, 'modules/pro'), destModules, 'modules/pro')
const componentsOk = verify(path.join(HERE, 'components/pro'), destComponents, 'components/pro')

// Section motion needs a base-repo hook that older projects don't have.
// Check for the hook itself rather than a version number — it's the
// thing that actually has to be there.
const rendererPath = path.join(target, 'src/components/SectionRenderer.vue')
const hasMotionHook = fs.existsSync(rendererPath) && fs.readFileSync(rendererPath, 'utf8').includes('pro/SectionMotion.vue')
const hasMotionConfig = fs.existsSync(path.join(target, 'src/config/motion.js'))

if (modulesOk && componentsOk) {
  console.log(`✓ Installed lodestar-pro-modules v${MY_VERSION} into ${target} (verified byte-for-byte)`)
  console.log(`  src/modules/pro/     (parallax, chart, tourDates, untangle)`)
  console.log(`  src/components/pro/  (mega nav, section motion)`)
  console.log(`\nNext: reference module: 'parallax', 'chart', 'tourDates' or 'untangle' in homeSections, or set nav.style: 'mega' in site.config.js.`)
  if (!hasMotionHook || !hasMotionConfig) {
    console.warn(`\n! Section motion is installed but this project predates the base hook it needs:`)
    if (!hasMotionHook)   console.warn(`  - src/components/SectionRenderer.vue doesn't pick up components/pro/SectionMotion.vue`)
    if (!hasMotionConfig) console.warn(`  - no src/config/motion.js (and \`motion\` in config/index.js)`)
    console.warn(`  Copy those from the current lodestar repo (see this package's README). Parallax and mega nav are unaffected.`)
  } else {
    console.log(`Section motion: set enabled: true in src/config/motion.js to turn it on.`)
  }
  console.log(`Once the site is running, check the browser console for "[lodestar-pro-modules] MegaNav v${MY_VERSION}" to confirm it's actually this version in use.`)
}
