const proxyquire = require('proxyquire');
const { 
  mockfirestore, 
  mocksdk, 
  initializeMockData 
} = require('./testSetup');

// Mock provider with test implementation
const mockProvider = {
  resolveName: jest.fn().mockImplementation(async (ensName) => {
    const normalizedName = ensName.toLowerCase();
    if (normalizedName === "vitalik.eth") {
      return "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    }
    if (normalizedName === "nick.eth") {
      return "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5";
    }
    throw new Error("ENS name not found");
  }),
  getBlockNumber: jest.fn().mockResolvedValue(1234567)
};

// Mock the provider
jest.mock("@ethersproject/providers", () => ({
  AlchemyProvider: jest.fn().mockImplementation(() => ({
    resolveName: jest.fn().mockImplementation(async (ensName) => {
      const normalizedName = ensName.toLowerCase();
      if (normalizedName === "vitalik.eth") {
        return "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
      }
      if (normalizedName === "nick.eth") {
        return "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5";
      }
      throw new Error("ENS name not found");
    }),
  })),
}));

// Get the functions we want to test
const functions = proxyquire('../index', {
  'firebase-admin': mocksdk,
  '@ethersproject/providers': {
    AlchemyProvider: jest.fn().mockImplementation(() => mockProvider),
    CloudflareProvider: jest.fn().mockImplementation(() => mockProvider)
  }
});

// Inject our mock firestore
functions.setFirestore(mockfirestore);

const { getEthereumAddress } = functions;

// Increase timeout for all tests in this describe block
describe("getEthereumAddress", () => {
  jest.setTimeout(30000); // 30 second timeout
  beforeEach(async () => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Clear Firestore data and reinitialize in one batch
    mockfirestore.autoFlush();
    const batch = mockfirestore.batch();
    
    // Clear existing data
    const snapshot = await mockfirestore.collection('addresses').get();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Initialize fresh test data
    await initializeMockData();
    await batch.commit();
  });

	test("resolves valid Ethereum address", async () => {
		const address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
		const result = await getEthereumAddress(address);
		expect(result).toBe(address);
	});

	test("resolves ENS name to address", async () => {
		const result = await getEthereumAddress("vitalik.eth");
		expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
	});

	test("handles checksum addresses", async () => {
		const lowercase = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
		const checksum = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
		const result = await getEthereumAddress(lowercase);
		expect(result).toBe(checksum);
	});

	test("handles invalid Ethereum addresses", async () => {
		await expect(getEthereumAddress("0xinvalid")).rejects.toThrow();
	});

	test("handles non-existent ENS names", async () => {
		await expect(getEthereumAddress("nonexistent.eth")).rejects.toThrow();
	});

	test("handles malformed ENS names", async () => {
		await expect(getEthereumAddress(".eth")).rejects.toThrow();
	});

	test("handles empty input", async () => {
		await expect(getEthereumAddress("")).rejects.toThrow();
	});

	test("handles case sensitivity in ENS names", async () => {
		const result = await getEthereumAddress("VITALIK.eth");
		expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
	});
});
