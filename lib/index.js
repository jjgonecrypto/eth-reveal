#!/usr/bin/env node

'use strict';

const axios = require('axios');
const ethers = require('ethers');
const provider = ethers.getDefaultProvider();

const lookup = async ({ hash }) => {
	const tx = await provider.getTransaction(hash);
	if (!tx) {
		return;
	}
	const { gasUsed, status } = (await provider.getTransactionReceipt(hash)) || {};

	let errorMessage = '';
	let revertReason = '';
	if (!status) {
		// try recall the transaction to get the output
		const code = await provider.call(tx, tx.blockNbr);
		revertReason = ethers.utils.toUtf8String(`0x${code.substr(138)}`);
		try {
			const {
				result: { errDescription },
			} = (await axios.get(
				`https://api.etherscan.io/api?module=transaction&action=getstatus&txhash=${hash}&apikey=${
					process.env.ETHERSCAN_API_KEY
				}`
			)).data;
			errorMessage = errDescription;
		} catch (e) {
			// Do nothing
		}
	}

	return {
		hash,
		gasUsed,
		status,
		errorMessage,
		revertReason,
	};
};

module.exports = {
	lookup,
};
