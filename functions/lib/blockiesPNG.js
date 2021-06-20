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

function render(opts) {
  opts = buildOptions(opts);

  const imageData = createImageData(opts.size);
  const width = Math.sqrt(imageData.length);

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
  // return p.getDump()
  // return p.getBase64()
  // let buff = Buffer(p.getBase64(), 'base64');
  // let text = buff.toString('ascii');
  // return text
  // return `${}`;
  var buf = Buffer.from(p.getBase64(), 'base64');
  return buf
}


module.exports = render;