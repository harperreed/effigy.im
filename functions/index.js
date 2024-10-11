const functions = require('firebase-functions');
const {onRequest} = require("firebase-functions/v2/https");
const ethers = require('ethers')
const {defineString} = require("firebase-functions/params");
const { utils } = require('ethers');

const { AlchemyProvider, ApiKeyCredential } = require('@ethersproject/providers');

const { AssetId } = require("caip");
const axios = require('axios').default;

const renderSVG = require('./lib/blockiesSVG');
const renderPNG = require('./lib/blockiesPNG');

const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.database();

// Cache expiration time (in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

/* Davatars is great */
const erc721Abi = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 _tokenId) external view returns (string)',
];

const erc1155Abi = [
  'function balanceOf(address _owner, uint256 _id) view returns (uint256)',
  'function uri(uint256 _id) view returns (string)',
];

// Function to get cached data
async function getCachedData(key) {
  const snapshot = await db.ref(`cache/${key}`).once('value');
  const data = snapshot.val();
  if (data && Date.now() - data.timestamp < CACHE_EXPIRATION) {
    return data.value;
  }
  return null;
}

// Function to set cached data
async function setCachedData(key, value) {
  await db.ref(`cache/${key}`).set({
    value: value,
    timestamp: Date.now()
  });
}

function parseURL(url) {
  // ... (unchanged)
}

function throwErrorResponse(response, statusCode, error, message) {
  // ... (unchanged)
}

function getProvider() {
  // ... (unchanged)
}

async function getEthereumAddress(addressString) {
  // Check cache first
  const cachedAddress = await getCachedData(`address:${addressString}`);
  if (cachedAddress) {
    console.log(`Using cached address for ${addressString}: ${cachedAddress}`);
    return cachedAddress;
  }

  let address;

  // Check if the address string includes '.eth' to handle ENS names
  if (addressString.includes(".eth")) {
    // Get Ethereum provider instance
    const provider = getProvider();
    // Resolve ENS name to Ethereum address
    address = await provider.resolveName(addressString);
    // Log the resolved address for debugging purposes
    console.log(`Resolved ENS name ${addressString} to address ${address}`);
  } else {
    // If not an ENS name, use the address string as is
    address = addressString;
  }

  // Validate and normalize the Ethereum address using ethers.js utility
  const ethereumAddress = ethers.getAddress(address);

  // Cache the resolved address
  await setCachedData(`address:${addressString}`, ethereumAddress);

  // Log the normalized Ethereum address for debugging purposes
  console.log(`Normalized Ethereum address: ${ethereumAddress}`);

  // Return the normalized Ethereum address
  return ethereumAddress;
}

async function crawlTokenUri(tokenUri) {
  // ... (unchanged)
}

async function grabImageUriContract(type, address, tokenId, ownerAddress) {
  // ... (unchanged)
}

// ... (rest of the file remains unchanged)

async function getENSAvatar(addressString) {
  try {
    // Initialize provider to interact with Ethereum blockchain
    const provider = getProvider();
    // Lookup the ENS name corresponding to the provided Ethereum address
    const ensName = await provider.lookupAddress(addressString);
    // Get a resolver for the ENS name to interact with its records
    const resolver = await provider.getResolver(ensName);
    // Retrieve the 'avatar' text record from the ENS resolver
    const avatarText = await resolver.getText('avatar');

    // Initialize variable to hold the final avatar URL
    let avatarUrl;

    // Check if the avatar text indicates an EIP-155 asset
    if (avatarText.includes("eip155:")) {
      // Parse the asset ID from the avatar text
      const assetId = new AssetId(avatarText);
      // Attempt to retrieve the image URI associated with the token
      const tokenImageUri = await grabImageUriContract(assetId.assetName.namespace, assetId.assetName.reference, assetId.tokenId, addressString);
      // If a token image URI is found, use it as the avatar URL
      if (tokenImageUri) {
        avatarUrl = tokenImageUri;
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
    if (avatarUrl.startsWith("https://") || avatarUrl.startsWith("http://")) {
      // No transformation needed for HTTP(S) URLs
    } else if (avatarUrl.startsWith("ipfs://")) {
      // Convert IPFS URIs to a web-accessible URL using a public gateway
      const CID = avatarUrl.substring("ipfs://".length);
      avatarUrl = `https://ipfs.infura.io/ipfs/${CID}`;
    } else if (avatarUrl.startsWith("ipns://")) {
      // Convert IPNS URIs to a web-accessible URL using a public gateway
      avatarUrl = avatarUrl.replace("ipns://", "https://ipfs.infura.io/ipns/");
    } else if (avatarUrl.startsWith("ar://")) {
      // Convert Arweave URIs to a web-accessible URL
      avatarUrl = avatarUrl.replace("ar://", "https://arweave.net/");
    }

    // Log the resolved ENS avatar URL
    console.log("Resolved ENS avatar:", avatarUrl);
    // Return the web-accessible avatar URL
    return avatarUrl;
  } catch (error) {
    // Log any errors encountered during the process
    console.error("Failed to retrieve ENS avatar:", error);
    // Return undefined to indicate that no avatar could be retrieved
    return undefined;
  }
}


// exports.avatar = functions.https.onRequest(async (request, response) => {
exports.avatar = onRequest({cors: true}, async (request, response) => {
  // Attempt to parse the URL to extract relevant parameters
  let urlParams, ethereumAddress;
  try {
    urlParams = parseURL(request.url);
    console.log(`URL parameters parsed successfully: Address - ${urlParams.addressFromUrl}, Type - ${urlParams.type}`);
  } catch (error) {
    console.error("Error parsing URL:", error);
    return throwErrorResponse(response, 404, "Invalid url format", "The URL provided does not match expected formats.");
  }

  let type = urlParams.type; // Default type is 'svg', can be overridden based on URL
  const addressFromUrl = urlParams.addressFromUrl; // Extracted Ethereum address or ENS name from URL

  // Attempt to resolve ENS or validate Ethereum address
  try {
    ethereumAddress = await getEthereumAddress(addressFromUrl);
    console.log(`Ethereum address resolved or validated successfully: ${ethereumAddress}`);
  } catch (error) {
    console.error("Error resolving Ethereum address:", error);
    return throwErrorResponse(response, 500, "Invalid ethereum address", "Could not resolve to a valid Ethereum address.");
  }

  // Attempt to fetch ENS avatar if available
  const ensAvatar = await getENSAvatar(ethereumAddress);
  console.log(ensAvatar ? `ENS avatar found: ${ensAvatar}` : "No ENS avatar found, proceeding with blockies generation.");

  // If an ENS avatar is found, override the type to 'ens'
  if (ensAvatar) {
    type = "ens";
  }

  const addressSeed = ethereumAddress.toLowerCase(); // Seed for generating blockies
  let filename, contentType, iconBody, etag;

  // Render avatar based on type or redirect if ENS avatar is found
  try {
    switch (type) {
      case 'svg':
        iconBody = renderSVG({
          seed: addressSeed,
        });
        filename = `${ethereumAddress}.svg`;
        contentType = 'image/svg+xml';
        etag = require('crypto').createHash('md5').update(iconBody).digest('hex');
        console.log(`SVG avatar generated for ${ethereumAddress}`);
        break;
      case 'png':
        iconBody = renderPNG({
          seed: addressSeed,
        });
        filename = `${ethereumAddress}.png`;
        contentType = 'image/png';
        etag = require('crypto').createHash('md5').update(iconBody).digest('hex');
        console.log(`PNG avatar generated for ${ethereumAddress}`);
        break;
      case 'ens':
        // Redirect to ENS avatar URL if available
        console.log(`Redirecting to ENS avatar URL: ${ensAvatar}`);
        response.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
        response.redirect(ensAvatar);
        return;
      default:
        console.error(`Invalid type: ${type}`);
        return throwErrorResponse(response, 500, "invalid type", `The requested type '${type}' is not supported.`);
    }

    // Check if client's ETag matches the current ETag
    if (request.headers['if-none-match'] === etag) {
      console.log("ETag matches - sending 304 Not Modified");
      response.status(304).end();
      return;
    }

    // Configure response headers and send the generated avatar
    response.setHeader('Content-Type', contentType);
    response.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    response.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    response.setHeader("ETag", etag);
    response.send(iconBody);
  } catch (error) {
    console.error("Error rendering avatar:", error);
    return throwErrorResponse(response, 500, "Error rendering", "An error occurred while rendering the avatar.");
  }
});
