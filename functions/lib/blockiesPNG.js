/**
 * A module to generate PNG ethereum "blockie" identicon
 *
 * @version 0.02
 * @author Harper <harper@modest.com>
 * @link https://effigy.im
 * @license https://opensource.org/licenses/MIT MIT License
 *
 * Based on https://github.com/MyCryptoHQ/ethereum-blockies-base64
 * Updated to use sharp for faster image processing
 */

const sharp = require('sharp');
const hsl2rgb = require('./hsl2rgb');
const blockiesCommon = require('./blockiesCommon');

function createColor() {
  const h = Math.floor(blockiesCommon.rand() * 360);
  const s = blockiesCommon.rand() * 60 + 40;
  const l = (blockiesCommon.rand() + blockiesCommon.rand() + blockiesCommon.rand() + blockiesCommon.rand()) * 25;

  return [h / 360, s / 100, l / 100];
}

function createImageData(size) {
  const width = size;
  const height = size;
  const dataWidth = Math.ceil(width / 2);
  const mirrorWidth = width - dataWidth;

  const data = [];
  for (let y = 0; y < height; y++) {
    let row = [];
    for (let x = 0; x < dataWidth; x++) {
      row[x] = Math.floor(blockiesCommon.rand() * 2.3);
    }
    const r = row.slice(0, mirrorWidth).reverse();
    row = row.concat(r);
    data.push(...row);
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
  }, opts);
}

async function render(opts) {
  opts = buildOptions(opts);

  const imageData = createImageData(opts.size);
  const width = Math.sqrt(imageData.length);
  const scaledSize = opts.size * opts.scale;

  const bgcolor = hsl2rgb(...opts.bgcolor).map(c => Math.round(c * 255));
  const color = hsl2rgb(...opts.color).map(c => Math.round(c * 255));
  const spotcolor = hsl2rgb(...opts.spotcolor).map(c => Math.round(c * 255));

  const rawImageData = Buffer.alloc(scaledSize * scaledSize * 4);

  for (let i = 0; i < imageData.length; i++) {
    const row = Math.floor(i / width);
    const col = i % width;
    const pngColor = imageData[i] === 0 ? bgcolor : (imageData[i] === 1 ? color : spotcolor);

    for (let sy = 0; sy < opts.scale; sy++) {
      for (let sx = 0; sx < opts.scale; sx++) {
        const dataIndex = ((row * opts.scale + sy) * scaledSize + (col * opts.scale + sx)) * 4;
        rawImageData[dataIndex] = pngColor[0];
        rawImageData[dataIndex + 1] = pngColor[1];
        rawImageData[dataIndex + 2] = pngColor[2];
        rawImageData[dataIndex + 3] = 255; // Alpha channel
      }
    }
  }

  const image = sharp(rawImageData, {
    raw: {
      width: scaledSize,
      height: scaledSize,
      channels: 4
    }
  });

  return await image.png().toBuffer();
}

module.exports = render;