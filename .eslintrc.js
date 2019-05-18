module.exports = {
	env: {
		es6: true,
		jest: true,
		node: true,
	},
	extends: 'eslint:recommended',
	parserOptions: {
		ecmaVersion: 2017,
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
