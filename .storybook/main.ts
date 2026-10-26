// SPDX-License-Identifier: Apache-2.0

import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
	framework: '@storybook/react-vite',
	stories: ['../stories/**/*.stories.tsx'],
	addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
	core: { disableTelemetry: true },
}

export default config
