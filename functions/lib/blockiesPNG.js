/**
 * A class to generate PNG ethereum "blockie" identicon
 *
 * @version 0.01
 * @author Harper <harper@modest.com>
 * @link https://effigy.im
 * @license https://opensource.org/licenses/MIT MIT License
 * 
 * Mostly based on https://github.com/MyCryptoHQ/ethereum-blockies-base64
 *
 */

const pnglib = require('./pnglib');
const hsl2rgb = require('./hsl2rgb');
const blockiesCommon = require('./blockiesCommon');

// Import Firestore to check cache before generating identicons
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

function createColor() {
  //saturation is the whole color spectrum
  const h = Math.floor(blockiesCommon.rand() * 360);
  //saturation goes from 40 to 100, it avoids greyish colors
  const s = blockiesCommon.rand() * 60 + 40;
  //lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
  const l = (blockiesCommon.rand() + blockiesCommon.rand() + blockiesCommon.rand() + blockiesCommon.rand()) * 25;

  return [h / 360, s / 100, l / 100];
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
    const r = row.slice(0, mirrorWidth).reverse();
    row = row.concat(r);

    for (let i = 0; i < row.length; i++) {
      data.push(row[i]);
    }
  }

  return data;
}

function buildOptions(opts) {
  if (!opts.seed) {
    throw new Error('No seed provided');
  }


  blockiesCommon.randomizeSeed(opts.seed);

  return Object.assign({
    size: 8,
    scale: 16,
    color: createColor(),
    bgcolor: createColor(),
    spotcolor: createColor(),
  }, opts)
}



// Modifies the passed PNG to fill in a specified rectangle
function fillRect(png, x, y, w, h, color) {
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      png.buffer[png.index(x + i, y + j)] = color;
    }
  }
}

async function render(opts) {
  opts = buildOptions(opts);

  const imageData = createImageData(opts.size);
  const width = Math.sqrt(imageData.length);

  // Check cache before generating identicons
  const cacheDoc = await db.collection('identiconCache').doc(opts.seed).get();
  if (cacheDoc.exists) {
    const cacheData = cacheDoc.data();
    const cacheTimestamp = cacheData.timestamp.toDate();
    const now = new Date();
    const cacheAge = (now - cacheTimestamp) / 1000; // Cache age in seconds

    // Return cached results if available and not expired
    if (cacheAge < 86400) { // 24 hours
      console.log(`Cache hit: ${opts.seed} identicon retrieved from cache`);
      return Buffer.from(cacheData.iconBody, 'base64');
    } else {
      console.log(`Cache expired for ${opts.seed}`);
    }
  }

  const p = new pnglib(opts.size * opts.scale, opts.size * opts.scale, 3);
  const bgcolor = p.color(...hsl2rgb(...opts.bgcolor));
  const color = p.color(...hsl2rgb(...opts.color));
  const spotcolor = p.color(...hsl2rgb(...opts.spotcolor));

  for (let i = 0; i < imageData.length; i++) {
    const row = Math.floor(i / width);
    const col = i % width;
    // if data is 0, leave the background
    if (imageData[i]) {
      // if data is 2, choose spot color, if 1 choose foreground
      const pngColor = imageData[i] == 1 ? color : spotcolor;
      fillRect(p, col * opts.scale, row * opts.scale, opts.scale, opts.scale, pngColor);
    }
  }

  const iconBody = p.getBase64();
  const buf = Buffer.from(iconBody, 'base64');

  // Store generated identicons in the cache
  await db.collection('identiconCache').doc(opts.seed).set({
    type: 'png',
    iconBody: iconBody,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return buf;
}

module.exports = render;
