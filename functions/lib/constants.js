const long_days = 30;
const short_hours = 7;

exports.CACHE_CONTROL = {
    LONG: `public, max-age=${86400 * long_days}, s-maxage=${86400 * long_days}`, 
    SHORT: `public, max-age=${3600 * short_hours}, s-maxage=${3600 * short_hours}`,
};

exports.CONTENT_TYPES = {
    SVG: "image/svg+xml",
    PNG: "image/png",
    JSON: "application/json",
};

exports.AVATAR_TYPES = {
    SVG: "svg",
    PNG: "png",
};
