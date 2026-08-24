import React from 'react'
import { Redirect } from '@docusaurus/router'

// The site is docs-only; send / straight to the Feature Guides landing page.
export default function Home() {
  return <Redirect to="/docs/features" />
}
