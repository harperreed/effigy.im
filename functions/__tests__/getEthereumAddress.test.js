const { ethers } = require('ethers');
const { getEthereumAddress } = require('../index');

// Mock the provider
jest.mock('@ethersproject/providers', () => ({
  AlchemyProvider: jest.fn().mockImplementation(() => ({
    resolveName: jest.fn().mockImplementation(async (ensName) => {
      // Mock ENS resolution
      if (ensName === 'vitalik.eth') {
        return '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      }
      if (ensName === 'nick.eth') {
        return '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5';
      }
      throw new Error('ENS name not found');
    })
  }))
}));

describe('getEthereumAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('resolves valid Ethereum address', async () => {
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const result = await getEthereumAddress(address);
    expect(result).toBe(address);
  });

  test('resolves ENS name to address', async () => {
    const result = await getEthereumAddress('vitalik.eth');
    expect(result).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  });

  test('handles checksum addresses', async () => {
    const lowercase = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
    const checksum = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const result = await getEthereumAddress(lowercase);
    expect(result).toBe(checksum);
  });

  test('handles invalid Ethereum addresses', async () => {
    await expect(getEthereumAddress('0xinvalid')).rejects.toThrow();
  });

  test('handles non-existent ENS names', async () => {
    await expect(getEthereumAddress('nonexistent.eth')).rejects.toThrow();
  });

  test('handles malformed ENS names', async () => {
    await expect(getEthereumAddress('.eth')).rejects.toThrow();
  });

  test('handles empty input', async () => {
    await expect(getEthereumAddress('')).rejects.toThrow();
  });

  test('handles case sensitivity in ENS names', async () => {
    const result = await getEthereumAddress('VITALIK.eth');
    expect(result).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  });
});
