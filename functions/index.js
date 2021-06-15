const functions = require('firebase-functions');
const ethers = require('ethers')
const pnglib = require('./pnglib');
const hsl2rgb = require('./hsl2rgb');


const randseed = new Array(4); // Xorshift: [x, y, z, w] 32 bit values



function seedrand(seed) {
  for (let i = 0; i < randseed.length; i++) {
    randseed[i] = 0;
  }
  for (let i = 0; i < seed.length; i++) {
    randseed[i % 4] = (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i);
  }
}

function randSVG() {
  // based on Java's String.hashCode(), expanded to 4 32bit values
  const t = randseed[0] ^ (randseed[0] << 11);

  randseed[0] = randseed[1];
  randseed[1] = randseed[2];
  randseed[2] = randseed[3];
  randseed[3] = (randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8));

  return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
}

function createColorSVG() {
  //saturation is the whole color spectrum
  const h = Math.floor(randSVG() * 360);
  //saturation goes from 40 to 100, it avoids greyish colors
  const s = ((randSVG() * 60) + 40) + '%';
  //lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
  const l = ((randSVG() + randSVG() + randSVG() + randSVG()) * 25) + '%';

  return 'hsl(' + h + ',' + s + ',' + l + ')';
}

function createImageDataSVG(size) {
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
      row[x] = Math.floor(randSVG() * 2.3);
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

function randPNG() {
  // based on Java's String.hashCode(), expanded to 4 32bit values
  const t = randseed[0] ^ (randseed[0] << 11);

  randseed[0] = randseed[1];
  randseed[1] = randseed[2];
  randseed[2] = randseed[3];
  randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);

  return (randseed[3] >>> 0) / (1 << 31 >>> 0);
}

function createColorPNG() {
  //saturation is the whole color spectrum
  const h = Math.floor(randPNG() * 360);
  //saturation goes from 40 to 100, it avoids greyish colors
  const s = randPNG() * 60 + 40;
  //lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
  const l = (randPNG() + randPNG() + randPNG() + randPNG()) * 25 ;

  return [h / 360, s / 100, l / 100];
}

function createImageDataPNG(size) {
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
      row[x] = Math.floor(randPNG() * 2.3);
    }
    const r = row.slice(0, mirrorWidth).reverse();
    row = row.concat(r);

    for (let i = 0; i < row.length; i++) {
      data.push(row[i]);
    }
  }

  return data;
}

function buildOptsPNG(opts) {
  if (!opts.seed) {
    throw new Error('No seed provided');
  }

  seedrand(opts.seed);

  return Object.assign({
    size: 8,
    scale: 16,
    color: createColorPNG(),
    bgcolor: createColorPNG(),
    spotcolor: createColorPNG(),
  }, opts)
}

function buildOptsSVG(opts) {
  const newOpts = {};

  newOpts.seed = opts.seed || Math.floor((Math.random() * Math.pow(10, 16))).toString(16);

  seedrand(newOpts.seed);

  newOpts.size = opts.size || 8;
  newOpts.scale = opts.scale || 4;
  newOpts.color = opts.color || createColorSVG();
  newOpts.bgcolor = opts.bgcolor || createColorSVG();
  newOpts.spotcolor = opts.spotcolor || createColorSVG();

  return newOpts;
}

function renderSVG(opts) {
  opts = buildOptsSVG
(opts);
  const imageData = createImageDataSVG(opts.size);
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


// Modifies the passed PNG to fill in a specified rectangle
function fillRect(png, x, y, w, h, color) {
  for(let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      png.buffer[png.index(x + i, y + j)] = color;
    }
  }
}

function renderPNG(opts) {
  opts = buildOptsPNG(opts);

  const imageData = createImageDataPNG(opts.size);
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



exports.avatar = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {
    structuredData: true
  });
  const url = request.url;
  try {
 
    const urlParts = url.replace("/a/", "").split(".");
    console.log(urlParts)
    const addressFromUrl = urlParts[0];
    let type = "svg"
    if (urlParts[1]){
      type = urlParts[1];
    }
    console.log(type)
    const address = ethers.utils.getAddress(addressFromUrl);

    if (type === 'svg'){
      var iconSVG = renderSVG({ // All options are optional
        seed: address.toLowerCase(), // seed used to generate icon data, default: random
      }, );

      response.setHeader('Content-Type', 'image/svg+xml ');
      response.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
      response.setHeader("Content-Disposition", "attachment; filename=" + `${address}.svg`);      
      response.send(iconSVG);
    }else if (type === 'png'){
      var iconPNG = renderPNG({ // All options are optional
        seed: address.toLowerCase(), // seed used to generate icon data, default: random
      }, );

      response.setHeader('Content-Type', 'image/png');
      
      response.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
      response.setHeader("Content-Disposition", "attachment; filename=" + `${address}.png`);      
      response.send(iconPNG);
    }



  } catch (error) {
    response.setHeader('Content-Type', 'application/json');
    response.set("Cache-Control", "public, max-age=1800, s-maxage=3600");
    response.send(JSON.stringify({
      "error": 500,
      "message": "invalid ethereum address"
    }));
    return
  }
});
