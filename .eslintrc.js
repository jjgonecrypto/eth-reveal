module.exports = {
	extends: ['eslint:recommended', 'plugin:node/recommended'],

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
