

This repository contains an API for generating and serving Ethereum "blockie" identicons. The identicons can be generated as SVG or PNG images. The API also supports fetching ENS (Ethereum Name Service) avatars if available for a given Ethereum address. 🌈

## Features ✨

- Generate Ethereum "blockie" identicons as SVG or PNG
- Fetch ENS avatars for Ethereum addresses
- Redirect to ENS avatar URL if available
- Customizable identicon colors and styles
- Supports Ethereum addresses and ENS names as input
- Efficient caching mechanism for improved performance

## API Endpoints 🚀

The main API endpoint is:

```
/avatar/:address
```

Where `:address` can be an Ethereum address or an ENS name. The identicon type (SVG or PNG) can be specified by appending the desired format to the URL, for example:

```
/avatar/0x1234567890123456789012345678901234567890.png
/avatar/myname.eth.svg
```

If an ENS avatar is available for the provided Ethereum address or ENS name, the API will redirect to the avatar URL.

## Caching Mechanism 🚀

The API now implements an efficient caching mechanism to improve performance and reduce unnecessary computations:

- Resolved Ethereum addresses and ENS names are cached
- Generated SVG and PNG identicons are cached
- Cache expiration is set to 24 hours by default
- Firebase Realtime Database is used for persistent caching

This caching system significantly reduces response times for frequently requested addresses and identicons.

## Technologies Used 🛠️

- Firebase Functions for serverless deployment
- Firebase Realtime Database for caching
- Ethers.js for interacting with the Ethereum blockchain
- Axios for making HTTP requests
- Various utility libraries for generating identicons and handling colors

## Getting Started 🚀

To run the API locally or deploy it to Firebase, follow these steps:

1. Clone the repository
2. Install dependencies with `npm install` or `yarn install`
3. Configure Firebase project and credentials
4. Set environment variables for Ethereum network and Alchemy API key
5. Run locally with `npm run serve` or deploy to Firebase with `npm run deploy`

## Testing 🧪

The project includes both unit tests and integration tests:

- Run unit tests with `npm run test:unit`
- Run integration tests with `npm run test:integration`
- Run all tests with `npm test`

## Contributing 🤝

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License 📄

This project is open-source and available under the [MIT License](LICENSE).

---

Feel free to customize and expand upon this README to provide more details and instructions specific to your project. Let me know if you have any further questions! 😊
