This repository contains an API for generating and serving Ethereum "blockie" identicons. The identicons can be generated as SVG or PNG images. The API also supports fetching ENS (Ethereum Name Service) avatars if available for a given Ethereum address. 🌈

## Features ✨

- Generate Ethereum "blockie" identicons as SVG or PNG
- Fetch ENS avatars for Ethereum addresses
- Redirect to ENS avatar URL if available
- Customizable identicon colors and styles
- Supports Ethereum addresses and ENS names as input

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

## Rate Limiting

To prevent abuse, the API is rate-limited. Each IP address is allowed up to 100 requests per 15 minutes. The rate limiting middleware automatically adds the following headers to the responses:

- `X-RateLimit-Limit`: The maximum number of requests that the client is allowed to make in the current window.
- `X-RateLimit-Remaining`: The number of requests remaining in the current window.
- `X-RateLimit-Reset`: The time at which the current rate limit window resets.

## Technologies Used 🛠️

- Firebase Functions for serverless deployment
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

## Contributing 🤝

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License 📄

This project is open-source and available under the [MIT License](LICENSE).

---

Feel free to customize and expand upon this README to provide more details and instructions specific to your project. Let me know if you have any further questions! 😊
