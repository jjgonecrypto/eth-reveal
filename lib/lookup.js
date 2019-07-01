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

const abiCache = {};
const tryGetABIAndSource = async ({ contract, etherscanKey }) => {
	try {
		// try fetch ABI and ContractName from Etherscan
		const {
			data: {
				result: [{ ContractName: contractName, ABI: abiAsString }],
			},
		} = await axios.get(
			`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contract}&apikey=${etherscanKey}`
		);

		const abi = JSON.parse(abiAsString);
		return { abi, contractName };
	} catch (error) {
		return { error };
	}
};

const tryAddABIAndMaybeProxyTarget = async ({ contract, etherscanKey }) => {
	if (!abiCache[contract]) {
		abiCache[contract] = tryGetABIAndSource({ contract, etherscanKey });
	}

	const { abi, contractName, error } = await abiCache[contract];

	if (error) return {};

	abiDecoder.addABI(abi);

	// Now try see if it's a proxy
	const contractInstance = new ethers.Contract(contract, abi, provider);
	if (contractInstance.target) {
		const target = await contractInstance.target();
		if (!abiCache[target]) {
			abiCache[target] = tryGetABIAndSource({ contract: target, etherscanKey });
		}
		const { abi, contractName: targetContractName } = await abiCache[target];
		if (abi) {
			abiDecoder.addABI(abi);
			return { contractName, targetContractName };
		}
	}

	return { contractName };
};

const lookup = async ({ hash, etherscanKey = process.env.ETHERSCAN_API_KEY }) => {
	const tx = await provider.getTransaction(hash);
	if (!tx) {
		return;
	}
	const { to, data, value, nonce, gasPrice, gasLimit, blockNumber, timestamp } = tx;
	const { from, gasUsed, status, logs } = (await provider.getTransactionReceipt(hash)) || {};

	const hex = await provider.getCode(to);
	const isContract = hex && hex.length > 2;

	let method = data;
	let decodedLogs = logs;
	let contract = undefined;
	let underlyingContract = undefined;

	// add ABIs for any address found in the logs
	for (const { address: logAddress } of logs) {
		await tryAddABIAndMaybeProxyTarget({ contract: logAddress, etherscanKey });
	}

	if (isContract) {
		// try fetch ABI and ContractName from Etherscan
		const { contractName, targetContractName } = await tryAddABIAndMaybeProxyTarget({
			contract: to,
			etherscanKey,
		});
		contract = contractName;
		underlyingContract = targetContractName;

		// try parse method and if it's doesn't work, it's stays as the data
		method = addReadableValues(abiDecoder.decodeMethod(data))[0] || data;

		// ensure any log not decoded is replaced with the original
		decodedLogs = addReadableValues(abiDecoder.decodeLogs(logs)).map((log, i) => log || logs[i]);
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
				`https://api.etherscan.io/api?module=transaction&action=getstatus&txhash=${hash}&apikey=${etherscanKey}`
			)).data;
			errorMessage = errDescription;
		} catch (e) {
			// Do nothing
		}
	}

	return {
		hash,
		blockNumber,
		timestamp,
		to,
		isContract,
		contract,
		underlyingContract,
		method: method === '0x' ? undefined : method,
		decodedLogs,
		from,
		gasUsed,
		gasPrice,
		gasLimit,
		gasFormat: {
			price: Number(ethers.utils.formatUnits(gasPrice, 'gwei')),
			limit: gasLimit.toNumber(),
			used: gasUsed.toNumber(),
		},
		status,
		errorMessage,
		revertReason,
		value,
		nonce,
	};
};

module.exports = lookup;
