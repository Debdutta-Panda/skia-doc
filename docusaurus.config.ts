import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Skia C++ Docs',
  titleDelimiter: '|',
  tagline:
    'Practical Skia documentation with working C++ examples, setup guides, and visual demos.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://debdutta-panda.github.io',
  baseUrl: '/skia-doc/',
  trailingSlash: false,

  organizationName: 'debdutta-panda',
  projectName: 'skia-doc',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Debdutta-Panda/skia-doc/tree/main',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    metadata: [
      {
        name: 'keywords',
        content:
          'Skia C++, Skia tutorial, SkCanvas, SkPaint, Skia PDF, Skia SVG, Skia examples, graphics programming',
      },
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Skia C++ Docs',
      logo: {
        alt: 'Skia C++ Docs Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/examples/transformations',
          label: 'Examples',
          position: 'left',
        },
        {
          href: 'https://github.com/Debdutta-Panda/skia-doc',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'Canvas APIs',
              to: '/docs/canvas-apis',
            },
            {
              label: 'Examples',
              to: '/docs/examples/transformations',
            },
          ],
        },
        {
          title: 'Skia',
          items: [
            {
              label: 'Official Skia Docs',
              href: 'https://skia.org/docs/',
            },
            {
              label: 'Skia GitHub',
              href: 'https://github.com/google/skia',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Repository',
              href: 'https://github.com/Debdutta-Panda/skia-doc',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Debdutta Panda. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
