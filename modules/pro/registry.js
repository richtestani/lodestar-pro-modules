// ============================================================
// modules/pro/registry.js — merged into the base template's module
// registry automatically once this package is installed into
// modules/pro/ (see modules/registry.js in lodestar, which picks
// this up via import.meta.glob — nothing to wire up by hand).
// Same shape as the base registry: name → component.
// ============================================================
import ParallaxModule from './ParallaxModule.vue'

export const proModuleRegistry = {
  parallax: ParallaxModule,
}
