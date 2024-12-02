# effigy.im 🎭

[![GitHub](https://img.shields.io/github/license/harperreed/effigy.im?style=flat-square)](https://github.com/harperreed/effigy.im/blob/main/LICENSE)

This repository contains the source code and documentation for [effigy.im](https://effigy.im), a service that generates Ethereum "blockie" identicons for Ethereum addresses. 🌈

## Features ✨

- Generate identicons as SVG or PNG images 🖼️
- Support for Ethereum addresses 🔖
- Customizable identicon styles and colors 🎨

## Usage 🚀

To generate an identicon, simply use the following URL format:

```
https://effigy.im/a/[ethereumAddress].[png|svg]
```

Replace `[ethereumAddress]` with the desired Ethereum address, and specify the desired image format (`png` or `svg`).

To use the service in an image tag, use the following format:

```html
<img src="https://effigy.im/a/[ethereumAddress].[png|svg]">
```

### Examples

- Ethereum address (PNG): `https://effigy.im/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.png`
- Ethereum address (SVG): `https://effigy.im/a/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045.svg`

## Repository Structure 📂

The repository is organized as follows:

- `functions/`: Contains the Firebase Functions code for generating identicons and handling requests 🔥
- `site/`: Contains the source code for the effigy.im website, built with Hugo 🌐
- `LICENSE`: The license file for the project 📜
- `README.md`: This readme file 📖

## Contributing 🤝

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request. 😊

## Inspiration and Influences

This project was inspired and influenced by:

- [MyCryptoHQ/ethereum-blockies-base64](https://github.com/MyCryptoHQ/ethereum-blockies-base64)
- [download13/blockies](https://github.com/download13/blockies)
- [PR by @qwtel](https://github.com/download13/blockies/pull/12)

Feel free to help make this better by submitting a pull request or sending me a note.

- [effigy.im on github](https://github.com/harperreed/effigy.im)
- [Send me a note: harper@modest.com](mailto:harper@modest.com)

## License 📄

This project is open-source and available under the [MIT License](LICENSE).

---

Made with ❤️ by [@harperreed](https://github.com/harperreed) / [@harper](https://twitter.com/harper) / [harper.eth](https://art.pizza/harper.eth)
