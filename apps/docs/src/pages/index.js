import React from 'react'
import { Redirect } from '@docusaurus/router'

// The site is docs-only; send / straight to the Getting Started page.
export default function Home() {
  return <Redirect to="/docs/getting-started" />
}
