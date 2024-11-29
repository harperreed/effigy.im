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

async function getProvider() {
    // Fetch the Ethereum network configuration from Firebase functions configuration
    // const network = functions.config().ethereum.network;
    const network = process.env.ETHEREUM_NETWORK;
    console.log(network);

    // Define provider options, using ApiKeyCredential for Alchemy
    // const alchemyApiKey  = functions.config().alchemy.key;
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
            return undefined;
        }
    }
}

async function lookupENS(addressString) {
    try {
        if (!addressString) {
            console.error('No address string provided to lookupENS');
            throw new Error('Address string is required');
        }

        const provider = await getProvider();
        if (!provider) {
            console.error('Failed to get Ethereum provider');
            throw new Error('Provider initialization failed');
        }

        console.log(`Looking up ENS name: ${addressString}`);

        // Normalize address string
        const normalizedAddress = addressString.toLowerCase().trim();

        // Resolve ENS name to Ethereum address
        const address = await provider.resolveName(normalizedAddress);

        if (!address) {
            console.warn(`Could not resolve ENS name: ${normalizedAddress}`);
            return null;
        }

        console.log(`Successfully resolved ENS name ${normalizedAddress} to address ${address}`);
        return address;

    } catch (error) {
        console.error('Error in lookupENS:', error);
        throw new Error(`ENS lookup failed: ${error.message}`);
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

async function cacheEnsAvatar(address, avatarUrl) {
    try {
        if (!address || !avatarUrl) {
            console.error('Missing required parameters for cacheEnsAvatar');
            throw new Error('Both address and avatarUrl are required');
        }

        // Normalize and validate address
        const normalizedAddress = address.toLowerCase().trim();
        if (!normalizedAddress.match(/^0x[a-f0-9]{40}$/i)) {
            console.error('Invalid Ethereum address format:', address);
            throw new Error('Invalid Ethereum address format');
        }

        console.log(`Caching ENS avatar for address: ${normalizedAddress}`);
        console.log(`Avatar URL: ${avatarUrl}`);

        const timestamp = new Date();
        const docData = {
            avatarUrl: avatarUrl,
            originalAddress: address,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastChecked: timestamp
        };

        await db.collection("ens_avatars")
            .doc(normalizedAddress)
            .set(docData, { merge: true });

        console.log(`Successfully cached ENS avatar for ${normalizedAddress}`);

    } catch (error) {
        console.error('Error caching ENS avatar:', error);
        throw new Error(`Failed to cache ENS avatar: ${error.message}`);
    }
}

async function grabCachedEnsAvatar(address) {
    if (!address) {
        console.warn("No address provided to grabCachedEnsAvatar");
        return null;
    }

    try {
        // Normalize address to lowercase
        const normalizedAddress = address.toLowerCase().trim();

        const docRef = await db
            .collection("ens_avatars")
            .doc(normalizedAddress)
            .get();

        if (!docRef.exists) {
            return null;
        }

        const data = docRef.data();

        // Check if data exists and has avatarUrl property
        if (!data || typeof data.avatarUrl === "undefined") {
            console.warn(
                `Invalid data format for ENS avatar cache: ${normalizedAddress}`,
            );
            return null;
        }

        // Check if cache is stale (older than 24 hours)
        const updatedAt = data.updatedAt?.toDate();
        if (updatedAt && Date.now() - updatedAt > 24 * 60 * 60 * 1000) {
            console.log(
                `Cached ENS avatar is stale for address: ${normalizedAddress}`,
            );
            return null;
        }

        return data.avatarUrl;
    } catch (error) {
        console.error("Error retrieving cached ENS avatar:", error);
        return null;
    }
}

// Export the function so it can be tested
exports.getENSAvatar = async function getENSAvatar(addressString) {
    try {
        const cachedAvatar = await grabCachedEnsAvatar(addressString);

        if (cachedAvatar) {
            console.log(`Found cached ENS avatar: ${cachedAvatar}`);
            return cachedAvatar;
        } else {
            console.log(`ENS avatar not found in database`);
        }

        // Initialize provider to interact with Ethereum blockchain
        const provider = await getProvider();
        // Lookup the ENS name corresponding to the provided Ethereum address
        const ensName = await provider.lookupAddress(addressString);
        // Get a resolver for the ENS name to interact with its records
        const resolver = await provider.getResolver(ensName);
        // Retrieve the 'avatar' text record from the ENS resolver
        const avatarText = await resolver.getText("avatar");

        // Initialize variable to hold the final avatar URL
        let avatarUrl;

        // Check if the avatar text indicates an EIP-155 asset
        if (avatarText && avatarText.includes("eip155:")) {
            try {
                // Parse the asset ID from the avatar text
                const assetId = new AssetId(avatarText);
                // Default to erc721 if not specified
                const tokenType = (
                    assetId.assetName.namespace || "erc721"
                ).toLowerCase();
                // Get contract address from reference
                const contractAddress = assetId.assetName.reference;
                // Get token ID
                const tokenId = assetId.tokenId;

                console.log(
                    `Processing EIP-155 avatar: type=${tokenType}, contract=${contractAddress}, tokenId=${tokenId}`,
                );

                // Attempt to retrieve the image URI associated with the token
                const tokenImageUri = await exports.grabImageUriContract(
                    tokenType,
                    contractAddress,
                    tokenId,
                    addressString,
                );
                // If a token image URI is found, use it as the avatar URL
                if (tokenImageUri) {
                    avatarUrl = tokenImageUri;
                    console.log(
                        `Successfully resolved token image URI: ${avatarUrl}`,
                    );
                }
            } catch (error) {
                console.error("Error processing EIP-155 avatar:", error);
                console.error(error.stack);
            }
        } else {
            // If the avatar text does not indicate an EIP-155 asset, use it directly as the URL
            avatarUrl = avatarText;
        }

        // Check if no avatar URL could be determined
        if (!avatarUrl) {
            throw new Error("No avatar found");
        }

        // Process various URI schemes to generate a web-accessible URL for the avatar
        if (
            avatarUrl.startsWith("https://") ||
            avatarUrl.startsWith("http://")
        ) {
            // No transformation needed for HTTP(S) URLs
        } else if (avatarUrl.startsWith("ipfs://")) {
            // Convert IPFS URIs to a web-accessible URL using a public gateway
            const CID = avatarUrl.substring("ipfs://".length);
            avatarUrl = `https://ipfs.infura.io/ipfs/${CID}`;
        } else if (avatarUrl.startsWith("ipns://")) {
            // Convert IPNS URIs to a web-accessible URL using a public gateway
            avatarUrl = avatarUrl.replace(
                "ipns://",
                "https://ipfs.infura.io/ipns/",
            );
        } else if (avatarUrl.startsWith("ar://")) {
            // Convert Arweave URIs to a web-accessible URL
            avatarUrl = avatarUrl.replace("ar://", "https://arweave.net/");
        }

        // Log the resolved ENS avatar URL
        console.log("Resolved ENS avatar:", avatarUrl);
        // Return the web-accessible avatar URL
        //

        // Cache the resolved ENS avatar URL for future lookups
        await cacheEnsAvatar(addressString, avatarUrl);

        return avatarUrl;
    } catch (error) {
        // Log any errors encountered during the process
        console.error("Failed to retrieve ENS avatar:", error);
        // Return undefined to indicate that no avatar could be retrieved
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

        // Check for ENS avatar
        const ensAvatar = await exports.getENSAvatar(ethereumAddress);
        if (ensAvatar) {
            console.log(`Redirecting to ENS avatar: ${ensAvatar}`);
            response.set("Cache-Control", CACHE_CONTROL.LONG);
            response.redirect(ensAvatar);
            return;
        }

        // Generate avatar if no ENS avatar found
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
