/**
 * A class to generate SVG ethereum "blockie" identicon
 *
 * @version 0.02
 * @author Harper <harper@modest.com>
 * @link https://effigy.im
 * @license https://opensource.org/licenses/MIT MIT License
 *
 * Largely based on https://github.com/download13/blockies/pull/12
 * and, of course, https://github.com/download13/blockies
 *
 * Updated to use RGB colors instead of HSL
 */

const blockiesCommon = require('./blockiesCommon');
const { createRandomRGBColor } = require('./rgb');
const { createRandomRGBColor } = require('./rgb');

function createColor() {
    const [r, g, b] = createRandomRGBColor();
    return `rgb(${r},${g},${b})`;
}

// ... [rest of the file remains unchanged]

function renderIdenticon(opts) {
    opts = buildOptions(opts);
    const imageData = createImageData(opts.size);
    const width = Math.sqrt(imageData.length);

    const size = opts.size * opts.scale;

    let svg = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" style="shape-rendering: crispEdges">';
    svg += '<rect x="0" y="0" width="' + size + '" height="' + size + '" fill="' + opts.bgcolor + '"/>';

    for (let i = 0; i < imageData.length; i++) {
        // if data is 0, leave the background
        if (imageData[i]) {
            const row = Math.floor(i / width);
            const col = i % width;

            // if data is 2, choose spot color, if 1 choose foreground
            const fill = (imageData[i] == 1) ? opts.color : opts.spotcolor;

            svg += '<rect x="' + col * opts.scale + '" y="' + row * opts.scale + '" width="' + opts.scale + '" height="' + opts.scale + '" fill="' + fill + '"/>';
        }
    }
    return svg + '</svg>';
}

module.exports = renderIdenticon;