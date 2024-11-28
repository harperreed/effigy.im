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


/* Davatars is great */
const erc721Abi = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 _tokenId) external view returns (string)',
];

const erc1155Abi = [
  'function balanceOf(address _owner, uint256 _id) view returns (uint256)',
  'function uri(uint256 _id) view returns (string)',
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
  } else if (urlPartsLen > 1 && urlParts[urlPartsLen - 1].toLowerCase() === "eth") {
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
    type
  };
}

/**
 * Sends a standardized error response
 * @param {object} response - The response object provided by the HTTP trigger.
 * @param {number} statusCode - HTTP status code to return.
 * @param {string} error - A short error code/string.
 * @param {string} message - A descriptive message about the error.
 */
function throwErrorResponse(response, statusCode, error, message) {
  // Setting the response headers
  response.setHeader('Content-Type', 'application/json');
  response.set("Cache-Control", "public, max-age=1800, s-maxage=3600");
  // Sending the error response with the provided status code
  response.status(statusCode).send(JSON.stringify({
    "error": error,
    "message": message
  }));
}

function getProvider() {
  // Fetch the Ethereum network configuration from Firebase functions configuration
  // const network = functions.config().ethereum.network;
  const network = process.env.ETHEREUM_NETWORK;
  console.log(network)

  // Define provider options, using ApiKeyCredential for Alchemy
  // const alchemyApiKey  = functions.config().alchemy.key;
  const alchemyApiKey = process.env.ALCHEMY_KEY;

  // Initialize the Ethereum provider using Alchemy
  const provider = new AlchemyProvider(network, alchemyApiKey);


  // Check and log the initialization status of the provider
  if (provider) {
    console.log("Ethereum provider initialized successfully.");
    return provider;
  } else {
    console.error("Failed to initialize the Ethereum provider.");
    return undefined;
  }
}

// Export the function so it can be tested
exports.getEthereumAddress = async function getEthereumAddress(addressString) {
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

  // Log the normalized Ethereum address for debugging purposes
  console.log(`Normalized Ethereum address: ${ethereumAddress}`);

  // Return the normalized Ethereum address
  return ethereumAddress;
}

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
    console.error("Failed to fetch token metadata from URI:", tokenUri, error);
    throw error;
  }
}


async function grabImageUriContract(type, address, tokenId, ownerAddress) {
  const provider = getProvider();

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
  if ('image' in tokenMetadata) {
    console.log(`Image URI fetched successfully: ${tokenMetadata.image}`);
    return tokenMetadata.image;
  } else {
    console.warn("No image found in token metadata");
    return undefined;
  }
}

// Export the function so it can be tested
exports.getENSAvatar = async function getENSAvatar(addressString) {
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
    if (avatarText && avatarText.includes("eip155:")) {
      try {
        // Parse the asset ID from the avatar text
        const assetId = new AssetId(avatarText);
        // Extract token type from namespace (erc721 or erc1155)
        const tokenType = assetId.assetName.namespace.toLowerCase();
        // Get contract address from reference
        const contractAddress = assetId.assetName.reference;
        // Get token ID
        const tokenId = assetId.tokenId;
        
        // Attempt to retrieve the image URI associated with the token
        const tokenImageUri = await grabImageUriContract(tokenType, contractAddress, tokenId, addressString);
        // If a token image URI is found, use it as the avatar URL
        if (tokenImageUri) {
          avatarUrl = tokenImageUri;
        }
      } catch (error) {
        console.error("Error processing EIP-155 avatar:", error);
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
