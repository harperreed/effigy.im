---
title: "Home"
date: 2021-06-20T05:31:18Z
draft: false
---


This is a simple service that will return a **identicon** of an ethereum address. You can use this to power avatars or whatever in your webapp

## Usage

To use the service you just need to use the url in an image like so:

    <img src="https://effigy.im/a/[ethereumAddress|ensName].[png|svg]">


#### Using ethereum addresses

    <img src="https://effigy.im/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.png">

That will render PNG:\
![](/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.png)

or

    <img src="https://effigy.im/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.svg">

That will render SVG:\
![](/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.svg)

#### You can also use ENS names:


    <img src="https://effigy.im/a/vitalik.eth.svg">

That will render the ens name identicon as SVG:\
![](/a/vitalik.eth.svg)


* * * * *

Inspired and influenced by:

- [MyCryptoHQ/ethereum-blockies-base64](https://github.com/MyCryptoHQ/ethereum-blockies-base64)
- [download13/blockies](https://github.com/download13/blockies)
- [PR by @qwtel](https://github.com/download13/blockies/pull/12)


Feel free to help make this better by submitting a pull request or sending me a note.

-   [effigy.im on github](https://github.com/harperreed/effigy.im)
-   [Send me a note: harper@modest.com](mailto:harper@modest.com)
