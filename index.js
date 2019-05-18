'use strict';

const axios = require('axios');
const ethers = require('ethers');
const numbro = require('numbro');
const { gray, red, yellow, green } = require('chalk');
const provider = ethers.getDefaultProvider();

async function reason() {
	const [hash] = process.argv.slice(2);
	console.log(gray('tx hash:', `https://etherscan.io/tx/${hash}`));

	const tx = await provider.getTransaction(hash);
	if (!tx) {
		console.log('tx not found');
		return;
	}
	const { gasUsed, status } = (await provider.getTransactionReceipt(hash)) || {};

	console.log(gray(`Gas used: ${numbro(gasUsed).format({ average: true })}`));

	if (status > 0) return console.log(green('success'));

	const {
		result: { errDescription },
	} = (await axios.get(
		`https://api.etherscan.io/api?module=transaction&action=getstatus&txhash=${hash}&apikey=${
			process.env.ETHERSCAN_API_KEY
		}`
	)).data;
	if (errDescription) console.log('ES error:', red(errDescription));

	const code = await provider.call(tx, tx.blockNumber);
	const reason = ethers.utils.toUtf8String('0x' + code.substr(138));
	if (reason) console.log('Revert reason:', yellow(reason));
}

reason();
