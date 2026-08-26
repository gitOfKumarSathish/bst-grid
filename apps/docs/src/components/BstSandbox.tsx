import React from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import { EXAMPLES } from '@site/src/examples'

type Props = { example?: string; code?: string; height?: number }

// A live, editable Bst-Table example. Sandpack runs the code in-browser against the
// PUBLISHED @bloomskill packages (fetched from the npm CDN), so readers can tweak a
// grid and see it update. Wrapped in <BrowserOnly> because Sandpack is browser-only
// and must never run during Docusaurus's server-side build.
export default function BstSandbox({ example, code, height = 460 }: Props) {
  const source = (code ?? (example ? EXAMPLES[example] : '') ?? '').trim()
  return (
    <BrowserOnly fallback={<div style={{ padding: 16, opacity: 0.7 }}>Loading live example…</div>}>
      {() => {
        // Deferred require: keeps Sandpack out of the SSR bundle.
        const { Sandpack } = require('@codesandbox/sandpack-react')
        return (
          <Sandpack
            template="react-ts"
            theme="auto"
            options={{ editorHeight: height, showLineNumbers: true, showTabs: false }}
            customSetup={{
              dependencies: {
                '@bloomskill/table-engine': '^0.41.0',
                '@bloomskill/table-mui': '^0.41.0',
                '@mui/material': '^6.1.0',
                '@mui/icons-material': '^6.1.0',
                '@emotion/react': '^11.13.0',
                '@emotion/styled': '^11.13.0',
              },
            }}
            files={{ '/App.tsx': source }}
          />
        )
      }}
    </BrowserOnly>
  )
}
