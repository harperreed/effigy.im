const functions = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const ethers = require("ethers");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const app = initializeApp();
let db;
try {
    db = getFirestore(app);
} catch (error) {
    console.warn("Failed to initialize default Firestore:", error);
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

    const cloudflareProvider = new CloudflareProvider();
    console.log("Cloudflare provider initialized successfully.");
    return cloudflareProvider;
}

async function grabCachedAddress(addressString) {
    if (!addressString) {
        console.log("No address string provided to grabCachedAddress");
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
            console.warn(
                `Invalid data format in cache for address: ${normalizedAddress}`,
            );
            return null;
        }

        // Check if cache is stale (older than 24 hours)
        const lastChecked = data.lastChecked?.toDate();
        if (
            lastChecked &&
            Date.now() - lastChecked > 365 * 24 * 60 * 60 * 1000
        ) {
            console.log(`Cached address is stale for: ${normalizedAddress}`);
            return null;
        }

        console.log(`Successfully retrieved cached address: ${data.address}`);
        return data.address;
    } catch (error) {
        console.error("Error retrieving cached address:", error);
        return null;
    }
}

async function cacheAddress(addressString, ethereumAddress) {
    try {
        if (!addressString || !ethereumAddress) {
            console.error("Missing required parameters for cacheAddress");
            throw new Error(
                "Missing required parameters: addressString and ethereumAddress are required",
            );
        }

        // Normalize input addresses
        const normalizedAddressString = addressString.toLowerCase().trim();
        const normalizedEthereumAddress = ethereumAddress.toLowerCase().trim();

        console.log(
            `Caching address mapping: ${normalizedAddressString} -> ${normalizedEthereumAddress}`,
        );

        const timestamp = new Date();
        await db.collection("addresses").doc(normalizedAddressString).set(
            {
                address: normalizedEthereumAddress,
                originalAddressString: addressString,
                createdAt: timestamp,
                updatedAt: timestamp,
                lastChecked: timestamp,
            },
            { merge: true },
        );

        console.log(
            `Successfully cached address for ${normalizedAddressString}`,
        );
    } catch (error) {
        console.error("Error caching address:", error);
        throw new Error(`Failed to cache address: ${error.message}`);
    }
}

// Utility function to validate Ethereum addresses
function isValidEthereumAddress(address) {
    try {
        ethers.utils.getAddress(address);
        return true;
    } catch (e) {
        return false;
    }
}

// Utility function to validate ENS names
function isValidENSName(name) {
    const ensRegex = /^[a-zA-Z0-9-]+\.eth$/;
    return ensRegex.test(name);
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

async function getOrGenerateAvatar(address, type) {
    const cacheKey = `${address}-${type}`;
    const bucket = getStorage().bucket();
    const file = bucket.file(`avatars/${cacheKey}`);

    try {
        const [exists] = await file.exists();
        if (exists) {
            console.log(`Cache hit for ${cacheKey}`);
            const [contents] = await file.download();
            return contents;
        } else {
            console.log(`Cache miss for ${cacheKey}`);
            const { generateAvatar } = require("./lib/avatarHelpers");
            const avatarData = generateAvatar(type, address);
            await file.save(avatarData.body, {
                metadata: {
                    contentType: avatarData.contentType,
                },
            });
            return avatarData.body;
        }
    } catch (error) {
        console.error("Error in getOrGenerateAvatar:", error);
        throw new Error("Failed to get or generate avatar");
    }
}

exports.avatar = onRequest(
    {
        cors: true,
        maxInstances: 5,
        timeoutSeconds: 10,
        memory: "128MB",
    },
    async (request, response) => {
        const {
            generateAvatar,
            setAvatarHeaders,
        } = require("./lib/avatarHelpers");
        const { CACHE_CONTROL, AVATAR_TYPES } = require("./lib/constants");

        try {
            // Parse URL and validate address
            const urlParams = exports.parseURL(request.url);
            console.log(
                `URL parameters parsed: Address - ${urlParams.addressFromUrl}, Type - ${urlParams.type}`,
            );

            // Early validation of address format
            if (
                !isValidEthereumAddress(urlParams.addressFromUrl) &&
                !isValidENSName(urlParams.addressFromUrl)
            ) {
                throw new Error("Invalid address format");
            }

            const ethereumAddress = await exports.getEthereumAddress(
                urlParams.addressFromUrl,
            );
            console.log(`Ethereum address resolved: ${ethereumAddress}`);

            // Generate or retrieve avatar
            const type = urlParams.type;
            const addressSeed = ethereumAddress.toLowerCase();

            const avatarBody = await getOrGenerateAvatar(addressSeed, type);

            // Handle ETag caching
            const { etag, contentType } = generateAvatar(type, addressSeed);
            if (request.headers["if-none-match"] === etag) {
                console.log("ETag matches - sending 304 Not Modified");
                response.status(304).end();
                return;
            }

            // Set headers and send response
            response.setHeader("Content-Type", contentType);
            response.setHeader("ETag", etag);
            response.set("Cache-Control", CACHE_CONTROL.LONG);
            response.send(avatarBody);
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
    },
);
