'use strict';

const path = require('path');

module.exports = {
	entry: './lib/lookup.js',
	mode: 'production',
	output: {
		filename: 'browser.js',
		path: path.resolve(__dirname),
		library: 'reveal',
		libraryTarget: 'umd',
	},
};
