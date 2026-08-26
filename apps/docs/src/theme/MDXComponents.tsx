import MDXComponents from '@theme-original/MDXComponents'
import BstSandbox from '@site/src/components/BstSandbox'

// Register <BstSandbox> globally so any MDX page — including the generated feature
// pages that inject guide partials — can use it without an explicit import.
export default {
  ...MDXComponents,
  BstSandbox,
}
