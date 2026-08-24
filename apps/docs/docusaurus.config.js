// @ts-check
const { themes } = require('prism-react-renderer')

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'Bst-Table Docs',
  tagline: 'Feature Guides',
  url: 'https://bst-grid.pages.dev',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  markdown: { hooks: { onBrokenMarkdownLinks: 'warn' } },
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
        ],
      },
      prism: { theme: themes.github, darkTheme: themes.dracula },
    }),
}
