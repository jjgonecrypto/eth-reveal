module.exports = {
	extends: ['eslint:recommended', 'plugin:import/errors'],
	env: {
		node: true,
	},
	parserOptions: {
		ecmaVersion: 2017,
	},
	settings: {
		'import/resolver': 'node',
	},
	rules: {
		'no-console': 'off',
		indent: ['error', 'tab'],
		'prettier/prettier': 'off',
		'linebreak-style': ['error', 'unix'],
		quotes: ['error', 'single'],
		strict: ['error', 'global'],
		semi: ['error', 'always'],
		'prefer-const': 'error',
	},
};
