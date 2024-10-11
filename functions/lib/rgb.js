/**
 * RGB color utilities
 */

// Existing HSL to RGB conversion function
function hsl2rgb(h, s, l){
  // ... [existing implementation]
}

/**
 * Generates a random RGB color
 * @returns {Array} An array of three integers (0-255) representing R, G, and B values
 */
function createRandomRGBColor() {
  return [
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256)
  ];
}

module.exports = {
  hsl2rgb,
  createRandomRGBColor
};