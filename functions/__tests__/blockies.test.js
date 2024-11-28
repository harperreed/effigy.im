const renderPNG = require("../lib/blockiesPNG");
const renderSVG = require("../lib/blockiesSVG");
const wasmModule = require("../lib/pixelOperations.wasm");

describe("Blockies Image Generation", () => {
	beforeAll(async () => {
		await wasmModule.initialize();
	});

	describe("SVG Generation", () => {
		test("generates consistent SVG for same seed", () => {
			const svg1 = renderSVG({ seed: "test123", size: 8, scale: 4 });
			const svg2 = renderSVG({ seed: "test123", size: 8, scale: 4 });
			expect(svg1).toBe(svg2);
		});

		test("generates different SVG for different seeds", () => {
			const svg1 = renderSVG({ seed: "test123", size: 8, scale: 4 });
			const svg2 = renderSVG({ seed: "test456", size: 8, scale: 4 });
			expect(svg1).not.toBe(svg2);
		});

		test("respects size parameter", () => {
			const svg = renderSVG({ seed: "test123", size: 16, scale: 4 });
			expect(svg).toMatch(/viewBox="0 0 64 64"/);
		});

		test("respects scale parameter", () => {
			const svg = renderSVG({ seed: "test123", size: 8, scale: 8 });
			expect(svg).toMatch(/viewBox="0 0 64 64"/);
		});

		test("generates valid SVG markup", () => {
			const svg = renderSVG({ seed: "test123" });
			expect(svg).toMatch(/^<svg.*<\/svg>$/);
			expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
		});
	});

	describe("PNG Generation", () => {
		test("generates consistent PNG for same seed", () => {
			const png1 = renderPNG({ seed: "test123", size: 8, scale: 4 });
			const png2 = renderPNG({ seed: "test123", size: 8, scale: 4 });
			expect(Buffer.compare(png1, png2)).toBe(0);
		});

		test("generates different PNG for different seeds", () => {
			const png1 = renderPNG({ seed: "test123", size: 8, scale: 4 });
			const png2 = renderPNG({ seed: "test456", size: 8, scale: 4 });
			expect(Buffer.compare(png1, png2)).not.toBe(0);
		});

		test("returns Buffer instance", () => {
			const png = renderPNG({ seed: "test123" });
			expect(Buffer.isBuffer(png)).toBe(true);
		});

		test("generates PNG with correct dimensions", () => {
			const size = 8;
			const scale = 4;
			const png = renderPNG({ seed: "test123", size, scale });
			expect(png.length).toBeGreaterThan(0);
		});
	});

	describe("Error Handling", () => {
		test("throws error when no seed provided for SVG", () => {
			expect(() => renderSVG({})).toThrow();
		});

		test("throws error when no seed provided for PNG", () => {
			expect(() => renderPNG({})).toThrow();
		});

		test("handles invalid size parameter", () => {
			expect(() => renderSVG({ seed: "test", size: -1 })).toThrow();
			expect(() => renderPNG({ seed: "test", size: -1 })).toThrow();
		});
	});

	describe("WebAssembly Integration", () => {
		test("initializes WebAssembly module", async () => {
			await expect(wasmModule.initialize()).resolves.not.toThrow();
		});
	});
});
