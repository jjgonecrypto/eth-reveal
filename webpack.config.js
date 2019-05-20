'use strict';

const path = require('path');

module.exports = {
	entry: './lib/lookup.js',
	mode: 'production',
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'dist'),
	},
};
