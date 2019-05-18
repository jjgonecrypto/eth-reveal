'use strict';

const axios = require('axios');
const ethers = require('ethers');
const abiDecoder = require('abi-decoder');
const provider = ethers.getDefaultProvider();

const addReadableValues = input => {
	input = Array.isArray(input) ? input : [input];

	input.forEach(obj => {
		if (typeof obj !== 'object') return;

		if (/^uint256/.test(obj.type)) {
			const formatNumber = num => {
				return num.toString().length === 10
					? new Date(num * 1000) // handle timestamps
					: num / 1e18;
			};

			obj.formatted = Array.isArray(obj.value)
				? obj.value.map(formatNumber)
				: formatNumber(obj.value);
		} else if (/^bytes/.test(obj.type)) {
			obj.formatted = Array.isArray(obj.value)
				? obj.value.map(ethers.utils.toUtf8String)
				: ethers.utils.toUtf8String(obj.value);
		}
		// now iterate over other props
		Object.values(obj)
			.filter(val => typeof val === 'object')
			.forEach(addReadableValues);
	});

	return input;
};

const tryGetABIAndSource = async ({ contract }) => {
	try {
		// try fetch ABI and ContractName from Etherscan
		const {
			data: {
				result: [{ ContractName: contractName, ABI: abiAsString }],
			},
		} = await axios.get(
			`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contract}&apikey=${
				process.env.ETHERSCAN_API_KEY
			}`
		);

		const abi = JSON.parse(abiAsString);
		return { abi, contractName };
	} catch (error) {
		return { error };
	}
};

const lookup = async ({ hash }) => {
	const tx = await provider.getTransaction(hash);
	if (!tx) {
		return;
	}
	const { to, data, value, nonce } = tx;
	const { from, gasUsed, status, logs } = (await provider.getTransactionReceipt(hash)) || {};

	const hex = await provider.getCode(to);
	const isContract = hex && hex.length > 2;

	let method = data;
	let decodedLogs = logs;
	let contract = '';

	if (isContract) {
		// try fetch ABI and ContractName from Etherscan
		const { abi, contractName, error } = await tryGetABIAndSource({ contract: to });
		contract = contractName;
		if (!error) {
			abiDecoder.addABI(abi);
			method = addReadableValues(abiDecoder.decodeMethod(data))[0];

			// ABI didn't work - maybe it's a proxy contract?
			if (!method) {
				const contractInstance = new ethers.Contract(to, abi, provider);
				if (contractInstance.target) {
					const target = await contractInstance.target();
					const { abi } = await tryGetABIAndSource({ contract: target });
					if (abi) {
						abiDecoder.addABI(abi);
						method = addReadableValues(abiDecoder.decodeMethod(data))[0];
					}
				}
				// worst case
				method = method || data;
			}
			// ensure any log not decoded is replaced with the original
			decodedLogs = addReadableValues(abiDecoder.decodeLogs(logs)).map((log, i) => log || logs[i]);
		}
	}

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
		to,
		contract,
		method,
		decodedLogs,
		from,
		gasUsed,
		status,
		errorMessage,
		revertReason,
		value,
		nonce,
	};
};

module.exports = {
	lookup,
};
