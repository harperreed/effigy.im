/**
 * A class to generate SVG ethereum "blockie" identicon
 *
 * @version 0.01
 * @author Harper <harper@modest.com>
 * @link https://effigy.im
 * @license https://opensource.org/licenses/MIT MIT License
 *
 * Largely based on https://github.com/download13/blockies/pull/12
 * and, of course, https://github.com/download13/blockies
 * 
 * 
 */

const blockiesCommon = require('./blockiesCommon');

function createColor() {
    //saturation is the whole color spectrum
    const h = Math.floor(blockiesCommon.rand() * 360);
    //saturation goes from 40 to 100, it avoids greyish colors
    const s = ((blockiesCommon.rand() * 60) + 40) + '%';
    //lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
    const l = ((blockiesCommon.rand() + blockiesCommon.rand() + blockiesCommon.rand() + blockiesCommon.rand()) * 25) + '%';

    return 'hsl(' + h + ',' + s + ',' + l + ')';
}

function createImageData(size) {
    const width = size; // Only support square icons for now
    const height = size;

    const dataWidth = Math.ceil(width / 2);
    const mirrorWidth = width - dataWidth;

    const data = [];
    for (let y = 0; y < height; y++) {
        let row = [];
        for (let x = 0; x < dataWidth; x++) {
            // this makes foreground and background color to have a 43% (1/2.3) probability
            // spot color has 13% chance
            row[x] = Math.floor(blockiesCommon.rand() * 2.3);
        }
        const r = row.slice(0, mirrorWidth);
        r.reverse();
        row = row.concat(r);

        for (let i = 0; i < row.length; i++) {
            data.push(row[i]);
        }
    }

    return data;
}


function buildOptions(opts) {
    const newOpts = {};

    newOpts.seed = opts.seed || Math.floor((Math.random() * Math.pow(10, 16))).toString(16);

    blockiesCommon.randomizeSeed(newOpts.seed);

    newOpts.size = opts.size || 8;
    newOpts.scale = opts.scale || 4;
    newOpts.color = opts.color || createColor();
    newOpts.bgcolor = opts.bgcolor || createColor();
    newOpts.spotcolor = opts.spotcolor || createColor();

    return newOpts;
}

const admin = require('firebase-admin');
const db = admin.database();

async function getCachedSVG(seed) {
  const snapshot = await db.ref(`cache/svg/${seed}`).once('value');
  return snapshot.val();
}

async function setCachedSVG(seed, svg) {
  await db.ref(`cache/svg/${seed}`).set(svg);
}

async function renderIdenticon(opts) {
  opts = buildOptions(opts);

  // Check cache first
  const cachedSVG = await getCachedSVG(opts.seed);
  if (cachedSVG) {
    console.log(`Using cached SVG for seed: ${opts.seed}`);
    return cachedSVG;
  }

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

  const finalSVG = svg + '</svg>';

  // Cache the generated SVG
  await setCachedSVG(opts.seed, finalSVG);

  return finalSVG;
}

module.exports = renderIdenticon;