// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'AI Triage Assistant',
			description: 'An AI-powered GitHub Action for sophisticated issue and pull request triage',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/mattleibow/triage-assistant' }
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
						{ label: 'Configuration', slug: 'getting-started/configuration' },
					],
				},
				{
					label: 'Features',
					items: [
						{ label: 'AI-Powered Labeling', slug: 'features/ai-labeling' },
						{ label: 'Engagement Scoring', slug: 'features/engagement-scoring' },
						{ label: 'Sub-Actions', slug: 'features/sub-actions' },
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
