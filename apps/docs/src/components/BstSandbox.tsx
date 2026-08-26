import React from 'react'
import BrowserOnly from '@docusaurus/BrowserOnly'
import CodeBlock from '@theme/CodeBlock'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import { EXAMPLES } from '@site/src/examples'

type Props = { example?: string; code?: string; height?: number }

// A live, editable Bst-Table example. Sandpack runs the code in-browser against the
// PUBLISHED @bloomskill packages (fetched from the npm CDN). The example source is
// ALSO rendered as a static <CodeBlock> above the live editor so it lands in the
// server-rendered HTML — visible to search engines, LLM crawlers and no-JS readers,
// which the browser-only Sandpack alone is not. The static block is collapsed by
// default (the live editor below shows the same code), but it is always in the HTML.
export default function BstSandbox({ example, code, height = 460 }: Props) {
  const source = (code ?? (example ? EXAMPLES[example] : '') ?? '').trim()
  const { siteConfig } = useDocusaurusContext()
  // Pin driven by version.ini (the workspace release version) via docusaurus.config's
  // customFields, so a release can't leave this stale. Sandpack resolves from the npm
  // CDN, so this version must be PUBLISHED for the live demo to load.
  const pin = `^${(siteConfig.customFields?.bstVersion as string) || '0.44.0'}`
  return (
    <>
      {source ? (
        <details className="bst-example-source">
          <summary>Example source</summary>
          <CodeBlock language="tsx">{source}</CodeBlock>
        </details>
      ) : null}
      <BrowserOnly fallback={<div style={{ padding: 16, opacity: 0.7 }}>Loading live example…</div>}>
        {() => {
          // Deferred require: keeps Sandpack out of the SSR bundle.
          const { Sandpack } = require('@codesandbox/sandpack-react')
          return (
            <Sandpack
              template="react-ts"
              theme="auto"
              options={{
                editorHeight: height,
                showLineNumbers: true,
                showTabs: false,
                showOpenInCodeSandbox: false,
                showRefreshButton: false,
              }}
              customSetup={{
                dependencies: {
                  '@bloomskill/table-engine': pin,
                  '@bloomskill/table-mui': pin,
                  '@bloomskill/table-shadcn': pin,
                  '@mui/material': '^6.1.0',
                  '@mui/icons-material': '^6.1.0',
                  '@emotion/react': '^11.13.0',
                  '@emotion/styled': '^11.13.0',
                  '@radix-ui/react-dropdown-menu': '^2.1.0',
                },
              }}
              files={{ '/App.tsx': source }}
            />
          )
        }}
      </BrowserOnly>
    </>
  )
}
