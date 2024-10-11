const renderIdenticon = require('../lib/blockiesSVG');

describe('blockiesSVG', () => {
  test('renderIdenticon generates SVG with RGB colors', () => {
    const svg = renderIdenticon({ seed: 'test' });
    
    // Check if the SVG string contains RGB color values
    expect(svg).toMatch(/fill="rgb\(\d+,\d+,\d+\)"/);
    
    // Check if the SVG is well-formed
    expect(svg).toMatch(/<svg.*<\/svg>/);
  });
});

describe('createColor', () => {
  // We need to modify blockiesSVG.js to export createColor for testing
  const { createColor } = require('../lib/blockiesSVG');
  
  test('createColor returns valid RGB string', () => {
    const color = createColor();
    expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });
});

describe('createRandomRGBColor', () => {
  const { createRandomRGBColor } = require('../lib/rgb');
  
  test('createRandomRGBColor returns array of 3 numbers between 0 and 255', () => {
    const color = createRandomRGBColor();
    expect(color).toHaveLength(3);
    color.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
    });
  });
});