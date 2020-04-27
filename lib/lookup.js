'use strict';

const axios = require('axios');
const {
	getDefaultProvider,
	providers: { JsonRpcProvider, InfuraProvider },
	utils: { formatUnits, toUtf8String, parseBytes32String },
	Contract,
} = require('ethers');
const abiDecoder = require('abi-decoder');

const addReadableValues = input => {
	input = Array.isArray(input) ? input : [input];

	input.forEach(obj => {
		if (typeof obj !== 'object') return;

		if (/^uint256/.test(obj.type)) {
			const formatNumber = num => {
				const numStr = num.toString();
				// ensure is date (at least between before 2017 and Oct 2020)
				if (numStr.length === 10 && numStr.substring(0, 2) === '15') {
					return new Date(num * 1000);
				} else if (numStr.length >= 27) {
					// presume it's high precision decimal
					return num / 1e27;
				} else if (numStr.length >= 18) {
					// presume it's WEI
					return num / 1e18;
				} else {
					// presume it's GWEI
					return num / 1e9;
				}
			};

			obj.formatted = Array.isArray(obj.value)
				? obj.value.map(formatNumber)
				: formatNumber(obj.value);
		} else if (/^bytes/.test(obj.type)) {
			try {
				obj.formatted = Array.isArray(obj.value)
					? obj.value.map(parseBytes32String)
					: parseBytes32String(obj.value);
			} catch (err) {
				// Ignore
			}
		}
		// now iterate over other props
		Object.values(obj)
			.filter(val => typeof val === 'object')
			.forEach(addReadableValues);
	});

	return input;
};

const etherscanAPI = ({ network }) =>
	`https://api${network === 'mainnet' ? '' : `-${network}`}.etherscan.io/api`;

const abiCache = {};
const tryGetABIAndSource = async ({ contract, network, etherscanKey }) => {
	try {
		// try fetch ABI and ContractName from Etherscan
		const {
			data: {
				result: [{ ContractName: contractName, ABI: abiAsString }],
			},
		} = await axios.get(
			`${etherscanAPI({
				network,
			})}?module=contract&action=getsourcecode&address=${contract}&apikey=${etherscanKey}`
		);

		const abi = JSON.parse(abiAsString);
		return { abi, contractName };
	} catch (error) {
		return { error };
	}
};

const tryAddABIAndMaybeProxyTarget = async ({
	contract,
	network,
	provider,
	blockNumber,
	etherscanKey,
}) => {
	if (!abiCache[contract]) {
		abiCache[contract] = tryGetABIAndSource({ contract, network, etherscanKey });
	}

	const { abi, contractName, error } = await abiCache[contract];

	if (error) return {};

	abiDecoder.addABI(abi);

	// Now try see if it's a proxy
	const contractInstance = new Contract(contract, abi, provider);
	if (contractInstance.target) {
		let target = await contractInstance.target();
		try {
			target = await contractInstance.target({ blockTag: Number(blockNumber) });
		} catch (err) {
			if (err.statusCode === 403) {
				console.log(
					'Warning: No access to archive state to get older Proxy targets - you will need a providerURI to a full archive node'
				);
			}
		}
		if (!abiCache[target]) {
			abiCache[target] = tryGetABIAndSource({ contract: target, network, etherscanKey });
		}
		const { abi, contractName: targetContractName } = await abiCache[target];
		if (abi) {
			abiDecoder.addABI(abi);
			return { contractName, targetContractName };
		}
	}

	return { contractName };
};

const lookup = async ({
	hash,
	network = 'mainnet',
	// this key is just for demo purposes - please don't be thoughtless and "borrow" it for your code 🥺
	etherscanKey = 'YECX97I2B65BBPB6Z11YBVE9SSCUS2QIAU',
	infuraProjectID = undefined,
	providerURI = undefined,
}) => {
	const networkName = network === 'mainnet' ? 'homestead' : network;
	let provider;
	if (providerURI) {
		provider = new JsonRpcProvider(providerURI);
	} else if (infuraProjectID) {
		provider = new InfuraProvider(networkName, infuraProjectID);
	} else {
		provider = getDefaultProvider(networkName);
	}

	const tx = await provider.getTransaction(hash);
	if (!tx) {
		throw Error('No transaction found.');
	}

	const { to, data, value, nonce, gasPrice, gasLimit, blockNumber } = tx;

	const { from, gasUsed, status, logs, contractAddress } =
		(await provider.getTransactionReceipt(hash)) || {};

	// get the timestamp from the block as it's more reliable than the transaction
	const { timestamp } = await provider.getBlock(blockNumber);

	let isContract = false;
	let isContractCreation = false;
	try {
		const hex = await provider.getCode(to);
		isContract = hex && hex.length > 2;
	} catch (e) {
		// This hits if it's a contract creation
		isContractCreation = true;
	}
	let method = data;
	let decodedLogs = logs;
	let contract = undefined;
	let underlyingContract = undefined;

	// add ABIs for any address found in the logs
	for (const { address: logAddress } of logs) {
		await tryAddABIAndMaybeProxyTarget({
			contract: logAddress,
			network,
			etherscanKey,
			provider,
			blockNumber,
		});
	}

	if (isContract) {
		// try fetch ABI and ContractName from Etherscan
		const { contractName, targetContractName } = await tryAddABIAndMaybeProxyTarget({
			contract: to,
			network,
			etherscanKey,
			provider,
			blockNumber,
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
	if (status === 0) {
		// try recall the transaction to get the output
		let code = '';
		try {
			code = await provider.call(tx, Number(blockNumber));
		} catch (err) {
			if (err.statusCode === 403) {
				console.log(
					'Warning: No access to archive state - you will need to provide an providerURI to get older revert reasons'
				);
			}
			code = await provider.call(tx);
		}
		revertReason = toUtf8String(`0x${code.substr(138)}`);
		try {
			const {
				result: { errDescription },
			} = (await axios.get(
				`${etherscanAPI({
					network,
				})}?module=transaction&action=getstatus&txhash=${hash}&apikey=${etherscanKey}`
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
		to: isContractCreation ? '(contract creation)' : to,
		isContract,
		contract: isContractCreation ? contractAddress : contract,
		underlyingContract,
		method: method === '0x' ? undefined : method,
		decodedLogs,
		from,
		gasUsed,
		gasPrice,
		gasLimit,
		gasFormat: {
			price: Number(formatUnits(gasPrice, 'gwei')),
			limit: gasLimit.toNumber(),
			used: gasUsed.toNumber(),
		},
		status: isContractCreation ? 1 : status,
		errorMessage,
		revertReason,
		value,
		nonce,
	};
};

module.exports = lookup;
