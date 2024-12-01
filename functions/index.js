const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const ethers = require("ethers");
const { defineString } = require("firebase-functions/params");
const { utils } = require("ethers");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const app = initializeApp();
let db;
try {
    db = getFirestore(app);
} catch (error) {
    console.warn('Failed to initialize default Firestore:', error);
    db = null;
}

// Allow injection of database for testing
exports.setFirestore = (firestore) => {
    db = firestore;
};

const {
    AlchemyProvider,
    CloudflareProvider,
    ApiKeyCredential,
} = require("@ethersproject/providers");

const { AssetId } = require("caip");
const axios = require("axios").default;

const renderSVG = require("./lib/blockiesSVG");
const renderPNG = require("./lib/blockiesPNG");

/* Davatars is great */
const erc721Abi = [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 _tokenId) external view returns (string)",
];

const erc1155Abi = [
    "function balanceOf(address _owner, uint256 _id) view returns (uint256)",
    "function uri(uint256 _id) view returns (string)",
];

// Export the function so it can be tested
exports.parseURL = function parseURL(url) {
    // Remove the initial part of the URL to get the relevant parts
    const cleanedUrl = url.replace("/a/", "");
    // Split the URL by '.' to separate different parts
    const urlParts = cleanedUrl.split(".");
    const urlPartsLen = urlParts.length;

    // Initialize default values
    let addressFromUrl = "";
    let type = "svg"; // Default type

    // Check if the URL ends with 'eth' (case insensitive) to handle ENS domains
    if (urlPartsLen > 2 && urlParts[urlPartsLen - 2].toLowerCase() === "eth") {
        // If the format is 'name.eth.svg' or similar
        addressFromUrl = urlParts.slice(0, urlPartsLen - 1).join(".");
        type = urlParts[urlPartsLen - 1].toLowerCase();
    } else if (
        urlPartsLen > 1 &&
        urlParts[urlPartsLen - 1].toLowerCase() === "eth"
    ) {
        // If the format is 'name.eth'
        addressFromUrl = cleanedUrl;
    } else {
        // Handle other formats, assuming the first part is the address
        addressFromUrl = urlParts[0];
        if (urlParts[1]) {
            type = urlParts[1].toLowerCase(); // Set type if available, convert to lowercase
        }
    }

    return {
        addressFromUrl,
        type,
    };
};

/**
 * Sends a standardized error response
 * @param {object} response - The response object provided by the HTTP trigger.
 * @param {number} statusCode - HTTP status code to return.
 * @param {string} error - A short error code/string.
 * @param {string} message - A descriptive message about the error.
 */
function throwErrorResponse(response, statusCode, error, message) {
    // Setting the response headers
    response.setHeader("Content-Type", "application/json");
    response.set("Cache-Control", "public, max-age=1800, s-maxage=3600");
    // Sending the error response with the provided status code
    response.status(statusCode).send(
        JSON.stringify({
            error: error,
            message: message,
        }),
    );
}

// Allow injection of provider for testing
let _provider = null;
exports.setProvider = (provider) => {
    _provider = provider;
};

async function getProvider() {
    // If provider is injected (for testing), return it
    if (_provider) {
        return _provider;
    }

    // Fetch the Ethereum network configuration from Firebase functions configuration
    const network = process.env.ETHEREUM_NETWORK;
    console.log(network);

    // Define provider options, using ApiKeyCredential for Alchemy
    const alchemyApiKey = process.env.ALCHEMY_KEY;

    try {
        // Try Alchemy provider first
        const alchemyProvider = new AlchemyProvider(network, alchemyApiKey);
        await alchemyProvider.getBlockNumber(); // Test provider is working
        console.log("Alchemy provider initialized successfully.");
        return alchemyProvider;
    } catch (error) {
        console.log("Failed to initialize Alchemy provider, falling back to Cloudflare:", error);
        // Fall back to Cloudflare provider
        try {
            const cloudflareProvider = new CloudflareProvider();
            console.log("Cloudflare provider initialized successfully."); 
            return cloudflareProvider;
        } catch (error) {
            console.error("Failed to initialize both Alchemy and Cloudflare providers:", error);
            throw new Error('Failed to initialize any provider');
        }
    }
}

async function grabCachedAddress(addressString) {
    if (!addressString) {
        console.log('No address string provided to grabCachedAddress');
        return null;
    }

    try {
        // Normalize address string
        const normalizedAddress = addressString.toLowerCase().trim();
        console.log(`Looking up cached address for: ${normalizedAddress}`);

        const docRef = await db
            .collection("addresses")
            .doc(normalizedAddress)
            .get();

        if (!docRef.exists) {
            console.log(`No cached address found for: ${normalizedAddress}`);
            return null;
        }

        const data = docRef.data();
        if (!data || !data.address) {
            console.warn(`Invalid data format in cache for address: ${normalizedAddress}`);
            return null;
        }

        // Check if cache is stale (older than 24 hours)
        const lastChecked = data.lastChecked?.toDate();
        if (lastChecked && Date.now() - lastChecked > 24 * 60 * 60 * 1000) {
            console.log(`Cached address is stale for: ${normalizedAddress}`);
            return null;
        }

        console.log(`Successfully retrieved cached address: ${data.address}`);
        return data.address;

    } catch (error) {
        console.error('Error retrieving cached address:', error);
        return null;
    }
}

async function cacheAddress(addressString, ethereumAddress) {
    try {
        if (!addressString || !ethereumAddress) {
            console.error('Missing required parameters for cacheAddress');
            throw new Error('Missing required parameters: addressString and ethereumAddress are required');
        }

        // Normalize input addresses
        const normalizedAddressString = addressString.toLowerCase().trim();
        const normalizedEthereumAddress = ethereumAddress.toLowerCase().trim();

        console.log(`Caching address mapping: ${normalizedAddressString} -> ${normalizedEthereumAddress}`);

        const timestamp = new Date();
        await db.collection("addresses").doc(normalizedAddressString).set({
            address: normalizedEthereumAddress,
            originalAddressString: addressString,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastChecked: timestamp
        }, { merge: true });

        console.log(`Successfully cached address for ${normalizedAddressString}`);

    } catch (error) {
        console.error('Error caching address:', error);
        throw new Error(`Failed to cache address: ${error.message}`);
    }
}

// Export the function so it can be tested
exports.getEthereumAddress = async function getEthereumAddress(addressString) {
    let address;

    // throw new Error('Address not found in database');
    //
    const cachedAddress = await grabCachedAddress(addressString);
    if (cachedAddress) {
        console.log(`Found cached address: ${cachedAddress}`);
        return cachedAddress;
    } else {
        console.log(`Address not found in database`);
    }

    // Check if the address string includes '.eth' to handle ENS names
    if (addressString.includes(".eth")) {
        // Get Ethereum provider instance
        address = await lookupENS(addressString);
    } else {
        // If not an ENS name, use the address string as is
        address = addressString;
    }

    // Validate and normalize the Ethereum address using ethers.js utility
    const ethereumAddress = ethers.getAddress(address);

    // Cache the resolved Ethereum address for future lookups
    await cacheAddress(addressString, ethereumAddress);

    // Log the normalized Ethereum address for debugging purposes
    console.log(`Normalized Ethereum address: ${ethereumAddress}`);

    // Return the normalized Ethereum address
    return ethereumAddress;
};

/**
 * Fetches the token metadata from a given URI.
 *
 * This function takes a tokenURI as input, performs an HTTP GET request to fetch the token metadata,
 * and returns the parsed JSON object. It uses Axios for the HTTP request.
 *
 * @param {string} tokenUri - The URI of the token metadata to fetch.
 * @returns {Promise<Object>} A promise that resolves to the parsed token metadata object.
 */
async function crawlTokenUri(tokenUri) {
    try {
        // Perform a GET request to the token URI
        const response = await axios.get(tokenUri);
        // Parse and return the JSON response
        const tokenMetadata = response.data;
        console.log("Token metadata fetched successfully:", tokenMetadata);
        return tokenMetadata;
    } catch (error) {
        // Log and rethrow any errors encountered during the fetch operation
        console.error(
            "Failed to fetch token metadata from URI:",
            tokenUri,
            error,
        );
        throw error;
    }
}

// Export the function so it can be tested
exports.grabImageUriContract = async function grabImageUriContract(
    type,
    address,
    tokenId,
    ownerAddress,
) {
    const provider = await getProvider();

    let abi;
    let tokenUri;

    // Determine ABI based on token type
    if (type === "erc721") {
        abi = erc721Abi;
    } else if (type === "erc1155") {
        abi = erc1155Abi;
    } else {
        throw new Error(`Unsupported token type: ${type}`);
    }

    // Create contract instance
    const contract = new ethers.Contract(address, abi, provider);

    // Verify token ownership
    if (type === "erc721") {
        const owner = await contract.ownerOf(tokenId);
        if (owner.toLowerCase() !== ownerAddress.toLowerCase()) {
            throw new Error("Token not owned by this address");
        }
    } else if (type === "erc1155") {
        const balance = await contract.balanceOf(ownerAddress, tokenId);
        if (balance === 0) {
            throw new Error("Token not owned by this address");
        }
    }

    // Fetch token URI
    if (type === "erc721") {
        tokenUri = await contract.tokenURI(tokenId);
    } else if (type === "erc1155") {
        tokenUri = await contract.uri(tokenId);
    }

    // Retrieve and return token metadata image URI
    const tokenMetadata = await crawlTokenUri(tokenUri);
    if ("image" in tokenMetadata) {
        console.log(`Image URI fetched successfully: ${tokenMetadata.image}`);
        return tokenMetadata.image;
    } else {
        console.warn("No image found in token metadata");
        return undefined;
    }
};

exports.avatar = onRequest({ cors: true }, async (request, response) => {
    const { generateAvatar, setAvatarHeaders } = require("./lib/avatarHelpers");
    const { CACHE_CONTROL, AVATAR_TYPES } = require("./lib/constants");

    try {
        // Parse URL and validate address
        const urlParams = exports.parseURL(request.url);
        console.log(
            `URL parameters parsed: Address - ${urlParams.addressFromUrl}, Type - ${urlParams.type}`,
        );

        const ethereumAddress = await exports.getEthereumAddress(
            urlParams.addressFromUrl,
        );
        console.log(`Ethereum address resolved: ${ethereumAddress}`);

        // Generate avatar
        const type = urlParams.type;
        const addressSeed = ethereumAddress.toLowerCase();

        const avatarData = generateAvatar(type, addressSeed);

        // Handle ETag caching
        if (request.headers["if-none-match"] === avatarData.etag) {
            console.log("ETag matches - sending 304 Not Modified");
            response.status(304).end();
            return;
        }

        // Set headers and send response
        setAvatarHeaders(response, avatarData);
        response.set("Cache-Control", CACHE_CONTROL.LONG);
        response.send(avatarData.body);
    } catch (error) {
        console.error("Error handling avatar request:", error);

        const statusCode = error.message.includes("Invalid url format")
            ? 404
            : 500;
        const errorCode = error.message.includes("Invalid url format")
            ? "invalid_url"
            : "server_error";

        throwErrorResponse(
            response,
            statusCode,
            errorCode,
            error.message ||
                "An error occurred while processing the avatar request",
        );
    }
});
