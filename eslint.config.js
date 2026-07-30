import jsdoc from 'eslint-plugin-jsdoc'
import tsdoc from 'eslint-plugin-tsdoc'
import tseslint from 'typescript-eslint'

export default [
	{
		ignores: ['dist/**', 'coverage/**'],
	},
	{
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		rules: {
			'max-len': ['error', { code: 120, tabWidth: 1, ignoreUrls: true }],
		},
	},
	{
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
