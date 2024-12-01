---
title: "Home"
date: 2021-06-20T05:31:18Z
draft: false
---

This is a simple service that will return an **identicon** of an ethereum address. You can use this to power avatars in your webapp/dapp/web3 experience.

Think of *effigy* as a simple [gravatar](https://en.gravatar.com/) for ethereum.

## Usage

To use the service you just need to use the url in an image like so:

    <img src="https://effigy.im/a/[ethereumAddress].[png|svg]">

#### Using ethereum addresses

| Avatar URL | Image |
-------------------------|:-------------------------:
| `https://effigy.im/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.png`     | ![](/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.png)   |
| `https://effigy.im/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.svg`     | ![](/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.svg)   |

* * * * *

**TODO:**

- [ ] Better caching
- [ ] Add support for other ens domain names

* * * * *

Inspired and influenced by:

- [MyCryptoHQ/ethereum-blockies-base64](https://github.com/MyCryptoHQ/ethereum-blockies-base64)
- [@davatar/react](https://www.npmjs.com/package/@davatar/react)
- [download13/blockies](https://github.com/download13/blockies)
- [PR by @qwtel](https://github.com/download13/blockies/pull/12)
- [gravatar](https://en.gravatar.com/)

Feel free to help make this better by submitting a pull request or sending me a note.

-   [Submit an issue to make effigy.im better](https://github.com/harperreed/effigy.im/issues)
-   [Check out effigy.im on github](https://github.com/harperreed/effigy.im)
-   [HMU on twitter: @harper](https://twitter.com/harper)
-   [Send me a note: harper@modest.com](mailto:harper@modest.com)
