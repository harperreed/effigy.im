const functions = require('firebase-functions');
const ethers = require('ethers')
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


function parseURL(url) {

  let addressFromUrl;
  let type = "svg"

  const urlParts = url.replace("/a/", "").split(".");

  // Handle ENS domains
  if (urlParts[1] === "eth") {
    addressFromUrl = `${urlParts[0]}.${urlParts[1]}`
    if (urlParts[2]) {
      type = urlParts[2];
    }
  } else {
    addressFromUrl = urlParts[0];
    if (urlParts[1]) {
      type = urlParts[1];
    }
  }

  return {
    addressFromUrl,
    type
  }
}

function throwErrorResponse(response, error, message) {
  response.setHeader('Content-Type', 'application/json');
  response.set("Cache-Control", "public, max-age=1800, s-maxage=3600");
  response.send(JSON.stringify({
    "error": error,
    "message": message
  }));
  return
}

function getProvider() {
  const network = functions.config().ethereum.network

  // const options = {
  //   infura: functions.config().infura.projectid,
  //   alchemy: functions.config().alchemy.key,
  //   pocket: functions.config().pocket.key,
  // }


  // const provider = ethers.getDefaultProvider(network, options);
  // const provider = new ethers.providers.InfuraProvider(null, functions.config().infura.projectid);
  const provider = new ethers.providers.AlchemyProvider(null, functions.config().alchemy.key);

  if (provider) {
    return provider;
  } else {
    return undefined;
  }

}

async function getEthereumAddress(addressString) {

  if (addressString.includes(".eth")) {
    const provider = getProvider();
    address = await provider.resolveName(addressString)
  } else {
    address = addressString
  }

  ethereumAddress = ethers.utils.getAddress(address);

  return ethereumAddress;

}

async function crawlTokenUri(tokenUri) {
  const res = await axios(tokenUri);
  const tokenObj = await res.data;
  return tokenObj;
}


async function grabImageUriContract(type, address, tokenId, ownerAddress) {
  const provider = getProvider();

  let abi;

  if (type === "erc721") {
    abi = erc721Abi;
  } else if (type === "erc1155") {
    abi = erc1155Abi
  }

  const contract = new ethers.Contract(address, abi, provider);

  /* Verify token Ownership */
  if (type === "erc721") {
    const owner = await contract.ownerOf(tokenId);
    if (owner !== ownerAddress) {
      throw ("Token not owned by this address")
    }
  }else if (type === "erc1155") {
    const balance = await contract.balanceOf(ownerAddress, tokenId);
    if (balance === 0) {
      throw ("Token not owned by this address")
    }
  }

  const tokenUri = await contract.tokenURI(tokenId);

  /* get Images */
  
  if (type === "erc721") {
    const tokenUri = await contract.tokenURI(tokenId);
  } else if (type === "erc1155") {
    const tokenUri = await contract.uri(tokenId);
  }

  const token = await crawlTokenUri(tokenUri)

  if ('image' in token) {
    return token.image
  } else {
    return undefined
  }
}

async function getENSAvatar(addressString) {
  try {
    const provider = getProvider();
    const ensName = await provider.lookupAddress(addressString);
    const resolver = await provider.getResolver(ensName);
    const avatarText = await resolver.getText('avatar')

    let avatarUrl;

    let ensAvatarUrl;

    if (avatarText.includes("eip155:")) {
      /* Let's grab the tokenId from the avatar url */
      const assetId = new AssetId(avatarText);

      const tokenImageUri = await grabImageUriContract(assetId.assetName.namespace, assetId.assetName.reference, assetId.tokenId, addressString)
      if (tokenImageUri) {
        ensAvatarUrl = tokenImageUri;
      }
    } else {
      ensAvatarUrl = avatarText;
    }

    if (!ensAvatarUrl) {
      throw ("No avatar found")

    }


    if (ensAvatarUrl.includes("https://") || ensAvatarUrl.includes("http://")) {
      avatarUrl = ensAvatarUrl;
    } else if (ensAvatarUrl.includes("ipfs://")) {
      const CID = ensAvatarUrl.replace("ipfs://", "");
      const ipfsUrl = `https://ipfs.infura.io/ipfs/${CID}`
      avatarUrl = ipfsUrl;

    } else if (ensAvatarUrl.includes("ipns://")) {
      const ipnsUrl = ensAvatarUrl.replace("ipns://", "https://ipfs.infura.io/ipns/");
      avatarUrl = ipnsUrl;

    } else {
      avatarUrl = ensAvatarUrl;
    }


    console.log("resolved ens avatar: ", avatarUrl)
    return avatarUrl
  } catch (error) {
    console.warn(error)
    return undefined
  }
}


exports.avatar = functions.https.onRequest(async (request, response) => {

  let urlParams, ethereumAddress;
  try {
    urlParams = parseURL(request.url);
  } catch (error) {
    console.error(error);
    return throwErrorResponse(response, 404, "Invalid url format");
  }

  let type = urlParams.type;
  const addressFromUrl = urlParams.addressFromUrl;


  try {
    ethereumAddress = await getEthereumAddress(addressFromUrl)
  } catch (error) {
    console.error(error);
    return throwErrorResponse(response, 500, "Invalid ethereum address");
  }

  const ensAvatar = await getENSAvatar(ethereumAddress);

  if (ensAvatar) {
    type = "ens";
  }

  const addressSeed = ethereumAddress.toLowerCase();

  let filename, contentType;

  try {
    switch (type) {
      case 'svg':
        var iconBody = renderSVG({ // All options are optional
          seed: addressSeed, // seed used to generate icon data, default: random
        })
        filename = `${ethereumAddress}.svg`
        contentType = 'image/svg+xml'
        break;
      case 'png':
        var iconBody = renderPNG({ // All options are optional
          seed: addressSeed, // seed used to generate icon data, default: random
        })
        filename = `${ethereumAddress}.png`
        contentType = 'image/png'
        break;
      case 'ens':
        response.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
        response.redirect(ensAvatar);
        return
      default:
        console.error(`invalid type: ${type}`);
        return throwErrorResponse(response, 500, `invalid type: ${type}`)
    }

    console.log(`${ethereumAddress} ${type}`);
    response.setHeader('Content-Type', contentType);
    response.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    response.setHeader("Content-Disposition", `inline; filename=${filename}`);
    response.send(iconBody);
    return;
  } catch (error) {
    console.error(error);
    return throwErrorResponse(response, 500, "Error rendering")

  }

});