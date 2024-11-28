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

const blockiesCommon = require("./blockiesCommon");
const hsl2rgb = require("./hsl2rgb");

function createColor() {
	//saturation is the whole color spectrum
	const h = Math.floor(blockiesCommon.rand() * 360);
	//saturation goes from 40 to 100, it avoids greyish colors
	const s = blockiesCommon.rand() * 60 + 40;
	//lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
	const l =
		(blockiesCommon.rand() +
			blockiesCommon.rand() +
			blockiesCommon.rand() +
			blockiesCommon.rand()) *
		25;

	return hsl2rgb(h / 360, s / 100, l / 100);
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
	if (!opts.seed) {
		throw new Error("No seed provided");
	}

	if (opts.size && (opts.size < 1 || !Number.isInteger(opts.size))) {
		throw new Error("Size must be a positive integer");
	}

	if (opts.scale && (opts.scale < 1 || !Number.isInteger(opts.scale))) {
		throw new Error("Scale must be a positive integer");
	}

	const newOpts = {};
	newOpts.seed = opts.seed;
	blockiesCommon.randomizeSeed(newOpts.seed);

	newOpts.size = opts.size || 8;
	newOpts.scale = opts.scale || 4;
	newOpts.color = opts.color || createColor();
	newOpts.bgcolor = opts.bgcolor || createColor();
	newOpts.spotcolor = opts.spotcolor || createColor();

	return newOpts;
}

function renderIdenticon(opts) {
	opts = buildOptions(opts);
	const imageData = createImageData(opts.size);
	const width = Math.sqrt(imageData.length);

	const size = opts.size * opts.scale;

	let svg =
		'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
		size +
		" " +
		size +
		'" style="shape-rendering: crispEdges">';
	svg +=
		'<rect x="0" y="0" width="' +
		size +
		'" height="' +
		size +
		'" fill="rgb(' +
		opts.bgcolor.join(",") +
		')"/>';

	for (let i = 0; i < imageData.length; i++) {
		// if data is 0, leave the background
		if (imageData[i]) {
			const row = Math.floor(i / width);
			const col = i % width;

			// if data is 2, choose spot color, if 1 choose foreground
			const fill = imageData[i] == 1 ? opts.color : opts.spotcolor;

			svg +=
				'<rect x="' +
				col * opts.scale +
				'" y="' +
				row * opts.scale +
				'" width="' +
				opts.scale +
				'" height="' +
				opts.scale +
				'" fill="rgb(' +
				fill.join(",") +
				')"/>';
		}
	}
	return svg + "</svg>";
}

module.exports = renderIdenticon;
