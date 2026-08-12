export { BstTableShadcn } from './BstTableShadcn.js'
export type { BstTableShadcnProps } from './BstTableShadcn.js'
export { createShadcnPreset, shadcnCellTypes } from './celltypes.js'

// Icon system: types + the built-in SVG set + the merge helper, for building a
// custom `icons` map. Ready-made library presets are separate subpath imports —
// `@bloomskill/table-shadcn/icons/{lucide,tabler,hugeicons,phosphor,remix}` — so
// each icon dependency is only pulled when its preset is actually imported.
export type {
  IconProps,
  IconComponent,
  BstShadcnIcons,
  BstShadcnIconOverrides,
} from './icons/types.js'
export { ICON_SLOTS } from './icons/types.js'
export { defaultIcons, resolveIcons } from './icons/default.js'
