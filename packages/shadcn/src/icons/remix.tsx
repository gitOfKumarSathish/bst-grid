import {
  RiSearchLine,
  RiFilter3Line,
  RiPaletteLine,
  RiLayoutColumnLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiPushpinLine,
  RiAddLine,
  RiSaveLine,
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiLayoutRowLine,
  RiStackLine,
  RiSettings3Line,
  RiCloseLine,
  RiFileCopyLine,
  RiPencilLine,
  RiEyeLine,
  RiEyeOffLine,
} from '@remixicon/react'
import type { BstShadcnIcons } from './types.js'

/**
 * Icon preset backed by `@remixicon/react` ("Line" / outline variants). Install
 * `@remixicon/react`, then: `<BstTableShadcn icons={remixIcons} … />`.
 */
export const remixIcons: BstShadcnIcons = {
  search: RiSearchLine,
  filter: RiFilter3Line,
  format: RiPaletteLine,
  columns: RiLayoutColumnLine,
  chevronLeft: RiArrowLeftSLine,
  chevronRight: RiArrowRightSLine,
  chevronDown: RiArrowDownSLine,
  check: RiCheckLine,
  pin: RiPushpinLine,
  plus: RiAddLine,
  save: RiSaveLine,
  undo: RiArrowGoBackLine,
  redo: RiArrowGoForwardLine,
  density: RiLayoutRowLine,
  group: RiStackLine,
  settings: RiSettings3Line,
  close: RiCloseLine,
  copy: RiFileCopyLine,
  edit: RiPencilLine,
  eye: RiEyeLine,
  eyeOff: RiEyeOffLine,
}

export default remixIcons
