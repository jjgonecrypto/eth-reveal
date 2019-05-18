#!/usr/bin/env node
'use strict';

const program = require('commander');
const numbro = require('numbro');
const { gray, red, yellow, green, cyan } = require('chalk');
const { lookup } = require('./lib');

// perform as CLI tool if args given
if (require.main === module) {
	(async () => {
		require('pretty-error').start();

		program
			.option('-h, --hash <value>', 'Transaction hash (include 0x prefix)')
			.parse(process.argv);

		const { hash } = program;
		console.log(gray('tx hash:', `https://etherscan.io/tx/${hash}`));

		const { gasUsed, status, errorMessage, revertReason } = await lookup({ hash: program.hash });

		console.log(
			gray(
				`Gas used: ${numbro(gasUsed).format({ average: true })} (${numbro(gasUsed).format('0,0')})`
			)
		);
		console.log(gray('Status:'), status > 0 ? green('success') : red('failure'));

		if (errorMessage) {
			console.log('ES error:', cyan(errorMessage));
		}
		if (revertReason) {
			console.log('Revert reason:', yellow(revertReason));
		}
	})();
}

module.exports = lookup;
