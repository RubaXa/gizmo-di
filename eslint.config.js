import antfu from '@antfu/eslint-config'

export default antfu(
	{
		stylistic: {
			indent: 'tab',
			quotes: 'single', // or 'double'
		},
		typescript: true,
		ignores: [
			'.github',
			'dist',
			'node_modules',
		],
	},
	{
		rules: {
			'style/brace-style': ['error', '1tbs'],
			'style/arrow-parens': ['error', 'always'],
			'curly': ['error', 'all'],
			'antfu/consistent-list-newline': 'off',
		},
	},
	{
		files: ['package.json'],
		rules: {
			'style/eol-last': 'off',
		},
	},
	{
		files: ['src/**/*.test.ts'],
		rules: {
			'no-console': 'off',
		},
	},
)
