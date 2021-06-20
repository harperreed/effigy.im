const functions = require('firebase-functions');
const ethers = require('ethers')

const renderSVG = require('./lib/blockiesSVG');
const renderPNG = require('./lib/blockiesPNG');


function parseURL(url) {

  const urlParts = url.replace("/a/", "").split(".");
  const addressFromUrl = urlParts[0];
  let type = "svg"
  if (urlParts[1]) {
    type = urlParts[1];
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

exports.avatar = functions.https.onRequest((request, response) => {

  let errorState = false;
  let params, address;
  try {
    params = parseURL(request.url);
  } catch (error) {
    console.error(error);
    return throwErrorResponse(response, 404, "Invalid url");
  }

  const type = params.type;
  const addressFromUrl = params.addressFromUrl;

  try {
    address = ethers.utils.getAddress(addressFromUrl);
  } catch (error) {
    console.error(error);
    return throwErrorResponse(response, 500, "Invalid ethereum address");
  }

  const addressSeed = address.toLowerCase();

  let filename, contentType;


  try {
    switch (type) {
      case 'svg':
        var iconBody = renderSVG({ // All options are optional
          seed: addressSeed, // seed used to generate icon data, default: random
        })
        filename = `${address}.svg`
        contentType = 'image/svg+xml'
        break;
      case 'png':
        var iconBody = renderPNG({ // All options are optional
          seed: addressSeed, // seed used to generate icon data, default: random
        })
        filename = `${address}.png`
        contentType = 'image/png'
        break;
      default:
    }

    response.setHeader('Content-Type', contentType);
    response.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    response.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    response.send(iconBody);
    return;
  } catch (error) {
    console.error(error);
    return throwErrorResponse(response, "Error rendering")

  }

});