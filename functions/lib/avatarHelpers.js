const crypto = require("crypto");
const { CONTENT_TYPES, AVATAR_TYPES } = require("./constants");
const renderSVG = require("./blockiesSVG");
const renderPNG = require("./blockiesPNG");

/**
 * Generates avatar content based on type and address
 * @param {string} type - Avatar type (svg/png)
 * @param {string} addressSeed - Ethereum address to use as seed
 * @returns {Object} Generated avatar data including body, filename, and content type
 */
exports.generateAvatar = function(type, addressSeed) {
  let iconBody, filename, contentType;

  switch (type) {
    case AVATAR_TYPES.SVG:
      iconBody = renderSVG({ seed: addressSeed });
      filename = `${addressSeed}.svg`;
      contentType = CONTENT_TYPES.SVG;
      break;
    case AVATAR_TYPES.PNG:
      iconBody = renderPNG({ seed: addressSeed });
      filename = `${addressSeed}.png`;
      contentType = CONTENT_TYPES.PNG;
      break;
    default:
      throw new Error(`Unsupported avatar type: ${type}`);
  }

  const etag = crypto.createHash("md5").update(iconBody).digest("hex");

  return {
    body: iconBody,
    filename,
    contentType,
    etag
  };
};

/**
 * Sets response headers for avatar delivery
 * @param {Object} response - HTTP response object
 * @param {Object} avatarData - Generated avatar data
 */
exports.setAvatarHeaders = function(response, avatarData) {
  const { filename, contentType, etag } = avatarData;
  response.setHeader("Content-Type", contentType);
  response.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  response.setHeader("ETag", etag);
};
