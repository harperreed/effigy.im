const { AssetId } = require("caip");
const { getENSAvatar } = require("../index.js");

// Mock the provider and other dependencies
jest.mock("@ethersproject/providers", () => ({
	AlchemyProvider: jest.fn().mockImplementation(() => ({
		lookupAddress: jest.fn().mockImplementation(async (address) => {
			if (address === "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045") {
				return "vitalik.eth";
			}
			throw new Error("Address not found");
		}),
		getResolver: jest.fn().mockImplementation(async (name) => ({
			getText: jest.fn().mockImplementation(async (key) => {
				if (name === "vitalik.eth") {
					switch (key) {
						case "avatar":
							// Different avatar URLs for different test cases
							if (process.env.TEST_AVATAR_TYPE === "ipfs") {
								return "ipfs://QmQsaxGxkKMXxvV1aBB7Dk2eSqNMGrGYzvMJNrGffu8iw3";
							} else if (process.env.TEST_AVATAR_TYPE === "ipns") {
								return "ipns://k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nk5vv";
							} else if (process.env.TEST_AVATAR_TYPE === "arweave") {
								return "ar://_YXq8jxJ7lBsUZfUKgfbBTuR0UWEHFKd_wHvIyEUr0s";
							} else if (process.env.TEST_AVATAR_TYPE === "http") {
								return "https://example.com/avatar.png";
							} else if (process.env.TEST_AVATAR_TYPE === "eip155") {
								return "eip155:1/erc721:0x123456789/1";
							}
							return undefined;
					}
				}
				return undefined;
			}),
		})),
	})),
}));

// Mock ethers
jest.mock("ethers", () => ({
	getAddress: jest.fn((addr) => addr),
	Contract: jest.fn().mockImplementation(() => ({
		ownerOf: jest
			.fn()
			.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
		tokenURI: jest.fn().mockResolvedValue("https://example.com/token/1"),
	})),
}));

// Mock axios for HTTP requests
jest.mock("axios", () => ({
	default: {
		get: jest.fn().mockImplementation(async (url) => {
			if (url.includes("token")) {
				return { data: { image: "https://example.com/nft-image.png" } };
			}
			throw new Error("Failed to fetch");
		}),
	},
}));

describe("getENSAvatar", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		delete process.env.TEST_AVATAR_TYPE;
	});

	test("resolves IPFS avatar URL", async () => {
		process.env.TEST_AVATAR_TYPE = "ipfs";
		const result = await getENSAvatar(
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		);
		expect(result).toBe(
			"https://ipfs.infura.io/ipfs/QmQsaxGxkKMXxvV1aBB7Dk2eSqNMGrGYzvMJNrGffu8iw3",
		);
	});

	test("resolves IPNS avatar URL", async () => {
		process.env.TEST_AVATAR_TYPE = "ipns";
		const result = await getENSAvatar(
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		);
		expect(result).toBe(
			"https://ipfs.infura.io/ipns/k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nk5vv",
		);
	});

	test("resolves Arweave avatar URL", async () => {
		process.env.TEST_AVATAR_TYPE = "arweave";
		const result = await getENSAvatar(
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		);
		expect(result).toBe(
			"https://arweave.net/_YXq8jxJ7lBsUZfUKgfbBTuR0UWEHFKd_wHvIyEUr0s",
		);
	});

	test("resolves HTTP/HTTPS avatar URL", async () => {
		process.env.TEST_AVATAR_TYPE = "http";
		const result = await getENSAvatar(
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		);
		expect(result).toBe("https://example.com/avatar.png");
	});

	test("handles missing avatar record", async () => {
		const result = await getENSAvatar(
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		);
		expect(result).toBeUndefined();
	});

	test("handles invalid address", async () => {
		const result = await getENSAvatar("0xinvalid");
		expect(result).toBeUndefined();
	});

	test("handles network errors", async () => {
		// Mock provider to throw network error
		const provider = require("@ethersproject/providers");
		provider.AlchemyProvider.mockImplementationOnce(() => ({
			lookupAddress: jest.fn().mockRejectedValue(new Error("Network error")),
			getResolver: jest.fn(),
		}));

		const result = await getENSAvatar(
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		);
		expect(result).toBeUndefined();
	});

	test("resolves EIP-155 asset avatar", async () => {
		// Mock ethers Contract
		const mockContract = {
			ownerOf: jest
				.fn()
				.mockResolvedValue("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"),
			tokenURI: jest.fn().mockResolvedValue("https://example.com/token/1"),
		};

		const ethers = require("ethers");
		ethers.Contract = jest.fn().mockImplementation(() => mockContract);

		process.env.TEST_AVATAR_TYPE = "eip155";
		const result = await getENSAvatar(
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		);
		expect(result).toBe("https://example.com/nft-image.png");
	});

	test("handles malformed avatar text records", async () => {
		// Mock resolver to return malformed avatar text
		const provider = require("@ethersproject/providers");
		provider.AlchemyProvider.mockImplementationOnce(() => ({
			lookupAddress: jest.fn().mockResolvedValue("vitalik.eth"),
			getResolver: jest.fn().mockResolvedValue({
				getText: jest.fn().mockResolvedValue("malformed://avatar/url"),
			}),
		}));

		const result = await getENSAvatar(
			"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		);
		expect(result).toBe("malformed://avatar/url");
	});

	test("caches ENS lookup responses", async () => {
		process.env.TEST_AVATAR_TYPE = "http";
		const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

		// First call to populate the cache
		const firstResult = await getENSAvatar(address);
		expect(firstResult).toBe("https://example.com/avatar.png");

		// Modify the mock to return a different value
		const provider = require("@ethersproject/providers");
		provider.AlchemyProvider.mockImplementationOnce(() => ({
			lookupAddress: jest.fn().mockResolvedValue("vitalik.eth"),
			getResolver: jest.fn().mockResolvedValue({
				getText: jest.fn().mockResolvedValue("https://example.com/new-avatar.png"),
			}),
		}));

		// Second call should return the cached value
		const secondResult = await getENSAvatar(address);
		expect(secondResult).toBe("https://example.com/avatar.png");
	});
});
