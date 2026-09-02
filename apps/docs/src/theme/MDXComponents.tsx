import MDXComponents from '@theme-original/MDXComponents'
import BstSandbox from '@site/src/components/BstSandbox'
import CopyPromptButton from '@site/src/components/CopyPromptButton'

// Register <BstSandbox> globally so any MDX page — including the generated feature
// pages that inject guide partials — can use it without an explicit import.
// <CopyPromptButton> rides along for the same reason.
export default {
  ...MDXComponents,
  BstSandbox,
  CopyPromptButton,
}
