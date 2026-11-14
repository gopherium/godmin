// SPDX-License-Identifier: Apache-2.0

import '../src/base.css'

import type { Preview } from '@storybook/react-vite'
import { setLocaleData } from '@wordpress/i18n'

import { AdminRoot } from '../src/admin-root.js'

/** The write time limit in milliseconds of a story that sets none, an hour, longer than anyone looks at one. */
const PATIENT_LIMIT = 60 * 60 * 1000

const preview: Preview = {
	decorators: [
		(Story, { globals, parameters }) => {
			const direction = globals.direction === 'rtl' ? 'rtl' : 'ltr'
			document.documentElement.dir = direction
			setLocaleData({ 'text direction\u0004ltr': [direction] })
			const writeTimeout = (parameters.writeTimeout as number | undefined) ?? PATIENT_LIMIT
			return (
				<AdminRoot cornerRadius={globals.cornerRadius || undefined} writeTimeout={writeTimeout}>
					<Story />
				</AdminRoot>
			)
		},
	],
	initialGlobals: { direction: 'ltr', cornerRadius: '' },
	globalTypes: {
		direction: {
			description: 'Text direction',
			toolbar: {
				title: 'Direction',
				icon: 'globe',
				items: [
					{ value: 'ltr', title: 'Left to right' },
					{ value: 'rtl', title: 'Right to left' },
				],
				dynamicTitle: true,
			},
		},
		cornerRadius: {
			description: 'Corner radius',
			toolbar: {
				title: 'Corners',
				icon: 'component',
				items: [
					{ value: '', title: 'Default' },
					{ value: 'none', title: 'None' },
					{ value: 'subtle', title: 'Subtle' },
					{ value: 'moderate', title: 'Moderate' },
					{ value: 'pronounced', title: 'Pronounced' },
				],
				dynamicTitle: true,
			},
		},
	},
	parameters: {
		a11y: { test: 'error' },
		viewport: {
			options: {
				desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
				narrow: { name: 'Narrow desktop', styles: { width: '1100px', height: '800px' } },
				medium: { name: 'Medium', styles: { width: '783px', height: '800px' } },
				phone: { name: 'Phone', styles: { width: '390px', height: '844px' } },
			},
		},
		argos: {
			modes: {
				desktop: { viewport: 'desktop' },
			},
		},
	},
}

export default preview
