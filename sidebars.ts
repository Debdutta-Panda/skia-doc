import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['intro'],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: ['canvas', 'paint'],
    },
    {
      type: 'category',
      label: 'Drawing APIs',
      items: ['canvas-apis', 'draw-scene', 'image-output'],
    },
    {
      type: 'category',
      label: 'Advanced Topics',
      items: ['svg', 'unicodeText'],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'Examples/transformations',
        'Examples/image-adjustments',
        'Examples/pdf-export',
        'Examples/book-style-pdf',
        'Examples/bellIcon',
      ],
    },
  ],
};

export default sidebars;
