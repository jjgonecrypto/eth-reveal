# Eth-Reveal

[![CircleCI](https://circleci.com/gh/justinjmoses/eth-reveal.svg?style=svg)](https://circleci.com/gh/justinjmoses/eth-reveal)
[![npm version](https://badge.fury.io/js/eth-reveal.svg)](https://badge.fury.io/js/eth-reveal)

Dive into Ethereum transactions from the CLI or via a module.

Use it live in Codepen: https://codepen.io/justinjmoses/full/vwexLj

## Features

- Decodes method calls, function parameters and logs (with formatted dates and numbers) using ABI from Etherscan (if any)
- Looks for `target` of contract if any (i.e. a `Proxy`) and adds that ABI as well
- Shows errors and revert reasons

> Note: due to storage limitations of popular Ethereum providers, you won't get revert reasons for most transactions more than 128 blocks in the past unless you use an Infura archive node (see https://infura.io/docs/ethereum/add-ons/archiveData)

## Browser API

```html
<script src="//cdn.jsdelivr.net/npm/eth-reveal/browser.js"></script>
<script>
	// assumes browser supports modern JS (can use Babel preprocesser for this, see settings in Codepen linked above)
	(async () => {
		const { reveal } = window;
		const {
			hash,
			blockNumber,
			timestamp,
			to,
			from,
			isContract,
			contract,
			underlyingContract,
			method,
			decodedLogs,
			gasPrice,
			gasLimit,
			gasUsed,
			gasFormat, // handy format of gas price, limit and used params
			status,
			errorMessage,
			revertReason,
			value,
			nonce,
		} = await reveal({
			hash: '0x92031f1cafad71bdfaa2d326b222972df2c2dcdc2931b5e8c1a32bda2dc7b2c8',
			network: 'mainnet', // default (supports kovan, ropsten and rinkeby)
			etherscanKey: 'demo', // optionally for better ES performance
			// to access historical data such as previous proxy targets and revert reasons, either supply a provider URI
			providerURI: undefined,
			infuraProjectID: '123321', // or optionally an infura project ID for an archive node
		});
	})();
</script>
```

## Node API

```javascript
const reveal = require('eth-reveal');

(async () => {
	const {
		hash,
		blockNumber,
		timestamp,
		to,
		from,
		isContract,
		contract,
		underlyingContract,
		method,
		decodedLogs,
		gasPrice,
		gasLimit,
		gasUsed,
		gasFormat, // handy format of gas price, limit and used params
		status,
		errorMessage,
		revertReason,
		value,
		nonce,
	} = await reveal({
		hash: '0x92031f1cafad71bdfaa2d326b222972df2c2dcdc2931b5e8c1a32bda2dc7b2c8',
		network: 'mainnet', // default (supports kovan, ropsten and rinkeby)
		etherscanKey: process.env.ETHERSCAN_API_KEY, // optionally for better ES performance
		// to access historical data such as previous proxy targets and revert reasons, either supply a provider URI
		providerURI: undefined,
		infuraProjectID: '123321', // or optionally an infura project ID for an archive node
	});
})();
```

## CLI Usage:

`npx eth-reveal -h [hash]`

e.g. `npx eth-reveal -h 0x203d9f5ec035ddaa02fc3a61b113bcfc6a8c0ee965fed7508e3627fc39f1a18f` (`SynthetixFeePool.claimFees`)

![image](https://user-images.githubusercontent.com/799038/80411361-13fe5e80-889a-11ea-8ba9-e55edca7ad59.png)

e.g. `npx eth-reveal -h 0xa9cfa1dc823f35e230ba1b785f359df0fa3056fe6b3689516216f3c6fc7599ac` (Send ETH to `NEPay`)

![image](https://user-images.githubusercontent.com/799038/80411110-9fc3bb00-8899-11ea-8463-d17ea36003b4.png)

e.g. `npx eth-reveal -h 0x7f370b9f6647762d1a04f55b6a34195da98b749da01bed58d600c87658cf7b90`

![image](https://user-images.githubusercontent.com/799038/57975591-e62a4d80-7999-11e9-82a5-7d80cbb361ae.png) (`DMSCOIN.transfer`)

e.g. `npx eth-reveal -h 0x7a8d26e929dba1146cb3eb3ef5ed48883d2460a365f0e7bab2acecbbbdf47f05` (`Synthetix.burnSynths`)

![image](https://user-images.githubusercontent.com/799038/80411232-d26db380-8899-11ea-84cd-5fa81de2560d.png)
