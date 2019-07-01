# Eth-Reveal

[![CircleCI](https://circleci.com/gh/justinjmoses/eth-reveal.svg?style=svg)](https://circleci.com/gh/justinjmoses/eth-reveal)
[![npm version](https://badge.fury.io/js/eth-reveal.svg)](https://badge.fury.io/js/eth-reveal)

Dive into Ethereum transactions from the CLI or via a module.

Use it live in Codepen: https://codepen.io/justinjmoses/full/vwexLj

## Features

- Decodes methods, parmas and logs (with formatted dates and numbers) using ABI from Etherscan (if any)
- Looks for `target` of contract if any (i.e. a `Proxy`) and adds that ABI as well
- Shows errors and revert reasons

## Browser API

```html
<script src="https://cdn.jsdelivr.net/npm/eth-reveal/dist/main.js"></script>
<script>
	// assumes browser supports modern JS (can use Babel preprocesser for this, see settings in Codepen linked above)
	(async () => {
		const { reveal } = window;
		const {
			to,
			from,
			contract,
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
		} = await reveal({
			hash: '0x92031f1cafad71bdfaa2d326b222972df2c2dcdc2931b5e8c1a32bda2dc7b2c8',
			etherscanKey: 'demo', // optionally for better ES performance
		});
	})();
</script>
```

## Node API

```javascript
const reveal = require('eth-reveal');

(async () => {
	const {
		to,
		from,
		contract,
		method,
		decodedLogs,
		gasUsed,
		status,
		errorMessage,
		revertReason,
		value,
	} = await reveal({
		hash: '0x92031f1cafad71bdfaa2d326b222972df2c2dcdc2931b5e8c1a32bda2dc7b2c8',
		etherscanKey: process.env.ETHERSCAN_API_KEY, // optionally for better ES performance
	});
})();
```

## CLI Usage:

`npx eth-reveal -h [hash]`

e.g. `npx eth-reveal -h 0x92031f1cafad71bdfaa2d326b222972df2c2dcdc2931b5e8c1a32bda2dc7b2c8`

![image](https://user-images.githubusercontent.com/799038/57975573-a1061b80-7999-11e9-8223-1a96da51f40a.png)

e.g. `npx eth-reveal -h 0xa9cfa1dc823f35e230ba1b785f359df0fa3056fe6b3689516216f3c6fc7599ac`

![image](https://user-images.githubusercontent.com/799038/57975584-ce52c980-7999-11e9-80dc-1078b525d2e9.png)

e.g. `npx eth-reveal -h 0x7f370b9f6647762d1a04f55b6a34195da98b749da01bed58d600c87658cf7b90`

![image](https://user-images.githubusercontent.com/799038/57975591-e62a4d80-7999-11e9-82a5-7d80cbb361ae.png)
