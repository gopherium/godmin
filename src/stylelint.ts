// SPDX-License-Identifier: Apache-2.0

/**
 * The stylelint configuration turning on every design system rule the theme
 * package ships.
 */
const config = {
	plugins: [
		'@wordpress/theme/stylelint-plugins/no-unknown-ds-tokens',
		'@wordpress/theme/stylelint-plugins/no-setting-wpds-custom-properties',
		'@wordpress/theme/stylelint-plugins/no-token-fallback-values',
	],
	rules: {
		'plugin-wpds/no-unknown-ds-tokens': true,
		'plugin-wpds/no-setting-wpds-custom-properties': true,
		'plugin-wpds/no-token-fallback-values': true,
	},
}

export default config
