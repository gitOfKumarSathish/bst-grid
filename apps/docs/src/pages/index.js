import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';

// A real, server-rendered landing page (replaces the old bare <Redirect>, which put
// nothing into the static HTML). Everything here renders during Docusaurus's SSR, so
// search engines, LLM crawlers and no-JS readers see what Bst-Table is and how to
// install it — not an empty redirect shell.
export default function Home() {
  return (
    <Layout
      title="Bst-Table — a headless React data grid"
      description="Bst-Table is a React data grid: a headless TanStack Table v9 engine with swappable Material UI and shadcn/Radix skins. MIT/Apache only — no per-seat licensing."
    >
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '3.5rem 1.25rem' }}>
        <h1 style={{ fontSize: '2.6rem', marginBottom: '0.5rem' }}>Bst-Table</h1>
        <p style={{ fontSize: '1.2rem', lineHeight: 1.6 }}>
          A React data grid: a <strong>headless engine</strong> (
          <code>@bloomskill/table-engine</code>, built on <strong>TanStack Table v9</strong>) with
          swappable <strong>Material UI</strong> and <strong>shadcn / Radix</strong> skins. Pass{' '}
          <code>data</code> + <code>columns</code> and you get sorting, search, pagination and column
          controls out of the box — then opt into editing, cell/range selection, clipboard, export and
          more with per-instance flags. Everything is <strong>MIT / Apache</strong>: no per-seat
          licensing, no paid tiers.
        </p>

        <p style={{ marginBottom: '0.4rem', fontWeight: 600 }}>Install (Material UI skin):</p>
        <CodeBlock language="bash">
          npm install @bloomskill/table-mui @bloomskill/table-engine @mui/material @emotion/react
          @emotion/styled
        </CodeBlock>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '1.75rem 0' }}>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Get started
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/installation">
            Installation
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/recipes">
            Recipes
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/features">
            Feature Guides
          </Link>
        </div>

        <h2>What you get</h2>
        <ul style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
          <li>
            <strong>Zero-config data ops</strong> — sorting, global search, per-column filters,
            grouping and pagination, on by default.
          </li>
          <li>
            <strong>Opt-in power</strong> — inline / row / batch editing, validation, cell &amp; range
            selection, clipboard, undo/redo, CSV / Excel / print export.
          </li>
          <li>
            <strong>17 built-in cell types</strong> — text, number, date, select, boolean, files,
            sparkline, KPI, QR, and more, all dependency-free.
          </li>
          <li>
            <strong>Client or server data</strong> — the same grid runs over an in-memory array or a
            server <code>DataSource</code> (manual sort / filter / paginate) by swapping the source.
          </li>
          <li>
            <strong>Two skins, one engine</strong> — Material UI or shadcn / Radix, switchable without
            touching your data code.
          </li>
        </ul>

        <p style={{ marginTop: '1.5rem' }}>
          <Link to="/docs/api">API Reference</Link> · <Link to="/docs/ai-agents">AI Agents &amp; MCP</Link>{' '}
          · <Link to="/docs/coverage">Coverage &amp; Roadmap</Link> ·{' '}
          <a href="https://github.com/gitOfKumarSathish/bst-grid">GitHub</a> ·{' '}
          <a href="https://www.npmjs.com/package/@bloomskill/table-engine">npm</a>
        </p>
      </main>
    </Layout>
  );
}
