import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://mattleibow.github.io',
  base: '/triage-assistant',
  integrations: [
    starlight({
      title: 'Triage Assistant',
      description: 'AI-powered GitHub Action for issue and pull request triage',
      social: [
        {
          label: 'GitHub',
          icon: 'github',
          href: 'https://github.com/mattleibow/triage-assistant',
        },
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Getting Started', link: '/guides/getting-started/' },
            { label: 'Configuration', link: '/guides/configuration/' },
            { label: 'Usage Examples', link: '/guides/examples/' },
          ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
    }),
  ],
});