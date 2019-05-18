#!/usr/bin/env node

'use strict';

const program = require('commander');
const { lookup } = require('./lib');

// perform as CLI tool if args given
if (require.main === module) {
	require('pretty-error').start();

	program.option('-h, --hash <value>', 'Transaction hash (include 0x prefix)').parse(process.argv);

	lookup({ hash: program.hash });
}

module.exports = lookup;
