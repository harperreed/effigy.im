const ethers = require("ethers");
const axios = require("axios");

const { grabImageUriContract } = require("../index");

// Mock the getProvider function
jest.mock("../index", () => ({
	getProvider: jest.fn(() => ({
		// Add mock provider methods as needed
	})),
	grabImageUriContract: jest.requireActual("../index").grabImageUriContract,
}));

// Mock axios
jest.mock("axios");

describe("Token Contract Interactions", () => {
	let mockContract;
	let mockProvider;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Setup mock contract
		mockContract = {
			ownerOf: jest.fn(),
			balanceOf: jest.fn(),
			tokenURI: jest.fn(),
			uri: jest.fn(),
		};

		// Mock ethers.Contract
		jest.spyOn(ethers, "Contract").mockImplementation(() => mockContract);
	});

	describe("ERC721 Tests", () => {
		const tokenId = "1";
		const ownerAddress = "0x1234567890123456789012345678901234567890";
		const contractAddress = "0x0987654321098765432109876543210987654321";

		test("should verify token ownership successfully", async () => {
			mockContract.ownerOf.mockResolvedValue(ownerAddress);
			mockContract.tokenURI.mockResolvedValue("https://example.com/token/1");

			axios.get.mockResolvedValue({
				data: { image: "https://example.com/image/1" },
			});

			const result = await grabImageUriContract(
				"erc721",
				contractAddress,
				tokenId,
				ownerAddress,
			);

			expect(mockContract.ownerOf).toHaveBeenCalledWith(tokenId);
			expect(result).toBe("https://example.com/image/1");
		});

		test("should throw error when token not owned", async () => {
			mockContract.ownerOf.mockResolvedValue("0xdifferentaddress");

			await expect(
				grabImageUriContract("erc721", contractAddress, tokenId, ownerAddress),
			).rejects.toThrow("Token not owned by this address");
		});
	});

	describe("ERC1155 Tests", () => {
		const tokenId = "1";
		const ownerAddress = "0x1234567890123456789012345678901234567890";
		const contractAddress = "0x0987654321098765432109876543210987654321";

		test("should verify token balance successfully", async () => {
			mockContract.balanceOf.mockResolvedValue(1);
			mockContract.uri.mockResolvedValue("https://example.com/token/1");

			axios.get.mockResolvedValue({
				data: { image: "https://example.com/image/1" },
			});

			const result = await grabImageUriContract(
				"erc1155",
				contractAddress,
				tokenId,
				ownerAddress,
			);

			expect(mockContract.balanceOf).toHaveBeenCalledWith(
				ownerAddress,
				tokenId,
			);
			expect(result).toBe("https://example.com/image/1");
		});

		test("should throw error when token balance is zero", async () => {
			mockContract.balanceOf.mockResolvedValue(0);

			await expect(
				grabImageUriContract("erc1155", contractAddress, tokenId, ownerAddress),
			).rejects.toThrow("Token not owned by this address");
		});
	});

	describe("Error Handling", () => {
		test("should throw error for invalid token type", async () => {
			await expect(
				grabImageUriContract("invalid", "address", "1", "owner"),
			).rejects.toThrow("Unsupported token type: invalid");
		});

		test("should handle malformed token URI", async () => {
			mockContract.ownerOf.mockResolvedValue(
				"0x1234567890123456789012345678901234567890",
			);
			mockContract.tokenURI.mockResolvedValue("invalid-uri");

			axios.get.mockRejectedValue(new Error("Invalid URI"));

			await expect(
				grabImageUriContract(
					"erc721",
					"0x1234567890123456789012345678901234567890",
					"1",
					"0x1234567890123456789012345678901234567890",
				),
			).rejects.toThrow("Invalid URI");
		});

		test("should handle missing image in metadata", async () => {
			mockContract.ownerOf.mockResolvedValue(
				"0x1234567890123456789012345678901234567890",
			);
			mockContract.tokenURI.mockResolvedValue("https://example.com/token/1");

			axios.get.mockResolvedValue({
				data: {
					/* no image field */
				},
			});

			const result = await grabImageUriContract(
				"erc721",
				"0x1234567890123456789012345678901234567890",
				"1",
				"0x1234567890123456789012345678901234567890",
			);

			expect(result).toBeUndefined();
		});
	});
});
