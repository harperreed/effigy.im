const { parseURL } = require("../index");

describe("parseURL", () => {
	test("parses standard Ethereum address with svg extension", () => {
		const result = parseURL(
			"/a/0x1234567890123456789012345678901234567890.svg",
		);
		expect(result).toEqual({
			addressFromUrl: "0x1234567890123456789012345678901234567890",
			type: "svg",
		});
	});

	test("parses standard Ethereum address with png extension", () => {
		const result = parseURL(
			"/a/0x1234567890123456789012345678901234567890.png",
		);
		expect(result).toEqual({
			addressFromUrl: "0x1234567890123456789012345678901234567890",
			type: "png",
		});
	});

	test("parses basic ENS domain", () => {
		const result = parseURL("/a/vitalik.eth");
		expect(result).toEqual({
			addressFromUrl: "vitalik.eth",
			type: "svg",
		});
	});

	test("parses ENS subdomain", () => {
		const result = parseURL("/a/xyz.abc.eth.png");
		expect(result).toEqual({
			addressFromUrl: "xyz.abc.eth",
			type: "png",
		});
	});

	test("handles missing extension", () => {
		const result = parseURL("/a/0x1234567890123456789012345678901234567890");
		expect(result).toEqual({
			addressFromUrl: "0x1234567890123456789012345678901234567890",
			type: "svg",
		});
	});

	test("handles case sensitivity", () => {
		const result = parseURL("/a/ViTaLik.ETH.PNG");
		expect(result).toEqual({
			addressFromUrl: "ViTaLik.ETH",
			type: "png",
		});
	});

	test("handles special characters in ENS names", () => {
		const result = parseURL("/a/my-cool-name.eth");
		expect(result).toEqual({
			addressFromUrl: "my-cool-name.eth",
			type: "svg",
		});
	});
});
