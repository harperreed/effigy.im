const crypto = require("node:crypto");
const { CONTENT_TYPES, AVATAR_TYPES } = require("./constants");
const renderSVG = require("./blockiesSVG");
const renderPNG = require("./blockiesPNG");
const { getStorage } = require("firebase-admin/storage");

/**
 * Generates avatar content based on type and address
 * @param {string} type - Avatar type (svg/png)
 * @param {string} addressSeed - Ethereum address to use as seed
 * @returns {Object} Generated avatar data including body, filename, and content type
 */
exports.generateAvatar = (type, addressSeed) => {
    let iconBody;
    let filename;
    let contentType;

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
        etag,
    };
};

/**
 * Sets response headers for avatar delivery
 * @param {Object} response - HTTP response object
 * @param {Object} avatarData - Generated avatar data
 */
exports.setAvatarHeaders = (response, avatarData) => {
    const { filename, contentType, etag } = avatarData;
    response.setHeader("Content-Type", contentType);
    response.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    response.setHeader("ETag", etag);
};

/**
 * Uploads generated avatar to Firebase Storage
 * @param {string} cacheKey - The key to use for caching the avatar
 * @param {Object} avatarData - Generated avatar data
 */
exports.uploadAvatarToStorage = async (cacheKey, avatarData) => {
    const bucket = getStorage().bucket();
    const file = bucket.file(`avatars/${cacheKey}`);

    try {
        await file.save(avatarData.body, {
            metadata: {
                contentType: avatarData.contentType,
            },
        });
        console.log(`Avatar uploaded to Firebase Storage with key: ${cacheKey}`);
    } catch (error) {
        console.error("Error uploading avatar to Firebase Storage:", error);
        throw new Error("Failed to upload avatar to Firebase Storage");
    }
};
