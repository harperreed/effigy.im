---
title: "Home"
date: 2021-06-20T05:31:18Z
draft: false
---

This is a simple service that will return an **identicon** of an ethereum address. You can use this to power avatars in your webapp/dapp/web3 experience. If the address has set an ENS text record for an avater, effigy.im will redirect and use that. 

Think of *effigy* as a simple [gravatar](https://en.gravatar.com/) for ethereum.

## Usage

To use the service you just need to use the url in an image like so:

    <img src="https://effigy.im/a/[ethereumAddress|ensName].[png|svg]">

#### Using ethereum addresses

| Avatar URL | Image |
-------------------------|:-------------------------:
| `https://effigy.im/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.png`     | ![](/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.png)   |
| `https://effigy.im/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.svg`     | ![](/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.svg)   |

#### You can also use ENS names:

| Avatar URL | Image |
-------------------------|:-------------------------:
| `https://effigy.im/a/vitalik.eth.png`     | ![](/a/vitalik.eth.png)   |
| `https://effigy.im/a/vitalik.eth.svg`     | ![](/a/vitalik.eth.svg)   |

#### If there is an avatar url in the ENS data, effigy will use that instead:

The only caveat is that it will return the same filetype as the ENS stored avatar - even if you specify `png` as the type. This will redirect the request to the avatar URL specified in the ENS avatar record. This supports pulling verified NFTs from the ENS avatar ([more info here](https://medium.com/the-ethereum-name-service/step-by-step-guide-to-setting-an-nft-as-your-ens-profile-avatar-3562d39567fc)).

| Avatar URL | Image |
-------------------------|:-------------------------:
| `https://effigy.im/a/brantly.eth.svg`     | ![](/a/brantly.eth.svg)   |
| `https://effigy.im/a/huh.eth.png`     | ![](/a/huh.eth.png)   |
| `https://effigy.im/a/galligan.eth.png`     | ![](/a/galligan.eth.png)   |
| `https://effigy.im/a/harper.eth.png`     | ![](/a/harper.eth.png)   |

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