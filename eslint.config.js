import jsdoc from 'eslint-plugin-jsdoc'
import sonarjs from 'eslint-plugin-sonarjs'
import storybook from 'eslint-plugin-storybook'
import tsdoc from 'eslint-plugin-tsdoc'
import tseslint from 'typescript-eslint'

export default [
	{
		ignores: ['dist/**', 'coverage/**'],
	},
	...storybook.configs['flat/recommended'],
	{
		files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}', 'stories/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		rules: {
			'max-len': ['error', { code: 120, tabWidth: 1, ignoreUrls: true }],
		},
	},
	{
		files: ['src/**/*.{ts,tsx}', 'stories/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		plugins: { sonarjs },
		rules: {
			complexity: ['error', 10],
			'sonarjs/cognitive-complexity': ['error', 15],
		},
	},
	{
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		settings: { jsdoc: { mode: 'typescript' } },
		plugins: { jsdoc, tsdoc },
		rules: {
			'tsdoc/syntax': 'error',
			'jsdoc/require-jsdoc': [
				'error',
				{
					require: { FunctionDeclaration: true, MethodDefinition: true },
					exemptEmptyConstructors: true,
				},
			],
			'jsdoc/require-param': [
				'error',
				{ checkDestructured: false, checkDestructuredRoots: false },
			],
			'jsdoc/require-param-description': 'error',
			'jsdoc/require-returns': 'error',
			'jsdoc/require-returns-description': 'error',
		},
	},
]
