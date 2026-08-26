// @ts-check
const fs = require('fs')
const path = require('path')
const { themes } = require('prism-react-renderer')

// Single source of truth for the version — read version.ini so the footer/navbar
// stay current on every release (docs regenerate on `npm run version:*`).
let version = '0.44.0'
try {
  const ini = fs.readFileSync(path.join(__dirname, '..', '..', 'version.ini'), 'utf8')
  version = (ini.match(/version\s*=\s*(\d+\.\d+\.\d+)/) || [])[1] || version
} catch {
  /* isolated build without the repo root — fall back to the pinned default */
}

const REPO = 'https://github.com/gitOfKumarSathish/bst-grid'
const NPM = 'https://www.npmjs.com/package'

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'Bst-Table Docs',
  tagline: 'Feature Guides',
  url: 'https://gitofkumarsathish.github.io',
  baseUrl: '/bst-grid/',
  organizationName: 'gitOfKumarSathish', // GitHub user/org that owns the repo
  projectName: 'bst-grid', // repo name
  deploymentBranch: 'gh-pages', // branch the built static site is pushed to
  onBrokenLinks: 'warn',
  markdown: { hooks: { onBrokenMarkdownLinks: 'warn', onBrokenMarkdownImages: 'warn' } },
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Bst-Table',
        items: [
          { type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs' },
          { href: `${REPO}/blob/main/CHANGELOG.md`, label: `v${version}`, position: 'right' },
          { href: `${NPM}/@bloomskill/table-engine`, label: 'npm', position: 'right' },
          { href: REPO, label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Getting Started', to: '/docs/getting-started' },
              { label: 'Feature Guides', to: '/docs/features' },
              { label: 'Cell Types', to: '/docs/cell-types' },
              { label: 'API Reference', to: '/docs/api' },
              { label: 'AI Agents & MCP', to: '/docs/ai-agents' },
            ],
          },
          {
            title: 'Packages (npm)',
            items: [
              { label: '@bloomskill/table-engine', href: `${NPM}/@bloomskill/table-engine` },
              { label: '@bloomskill/table-mui', href: `${NPM}/@bloomskill/table-mui` },
              { label: '@bloomskill/table-shadcn', href: `${NPM}/@bloomskill/table-shadcn` },
              { label: '@bloomskill/table-mcp', href: `${NPM}/@bloomskill/table-mcp` },
            ],
          },
          {
            title: 'Project',
            items: [
              { label: 'GitHub', href: REPO },
              { label: 'Changelog', href: `${REPO}/blob/main/CHANGELOG.md` },
              { label: 'Coverage & Roadmap', to: '/docs/coverage' },
              { label: 'License (MIT)', href: `${REPO}/blob/main/LICENSE` },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Bst-Table · v${version} · MIT Licensed. Built on MIT / Apache-2.0 open-source only — no per-seat licensing.`,
      },
      prism: { theme: themes.github, darkTheme: themes.dracula },
    }),
}
