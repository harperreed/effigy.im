const functions = require('firebase-functions');
const ethers = require('ethers')

const renderSVG = require('./lib/blockiesSVG');
const renderPNG = require('./lib/blockiesPNG');

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

  const options = {
    infura: functions.config().infura.projectid,
    alchemy: functions.config().alchemy.key,
    pocket: functions.config().pocket.key,
  }

  const provider = ethers.getDefaultProvider(network, options);

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

async function getENSAvatar(addressString) {
  try {
    const provider = getProvider();
    const ensName = await provider.lookupAddress(addressString);
    const resolver = await provider.getResolver(ensName);
    const avatarUrl = await resolver.getText('avatar')
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

  if (ensAvatar){
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