const assert = require('assert');
const admin = require('firebase-admin');
const test = require('firebase-functions-test')();

const { getEthereumAddress, getENSAvatar } = require('../index');

admin.initializeApp();
const db = admin.firestore();

describe('Caching Tests', () => {
  before(async () => {
    await db.collection('ensCache').doc('test.eth').set({
      address: '0x1234567890123456789012345678901234567890',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  after(async () => {
    await db.collection('ensCache').doc('test.eth').delete();
  });

  it('should return cached address for previously resolved ENS name', async () => {
    const address = await getEthereumAddress('test.eth');
    assert.strictEqual(address, '0x1234567890123456789012345678901234567890');
  });

  it('should resolve new ENS name and cache it', async () => {
    const address = await getEthereumAddress('newtest.eth');
    assert.strictEqual(address, '0x0987654321098765432109876543210987654321');

    const cacheDoc = await db.collection('ensCache').doc('newtest.eth').get();
    assert.strictEqual(cacheDoc.exists, true);
    assert.strictEqual(cacheDoc.data().address, '0x0987654321098765432109876543210987654321');
  });

  it('should refresh cache after expiration', async () => {
    const oldTimestamp = new Date();
    oldTimestamp.setDate(oldTimestamp.getDate() - 2); // 2 days ago

    await db.collection('ensCache').doc('expiretest.eth').set({
      address: '0x1111111111111111111111111111111111111111',
      timestamp: oldTimestamp
    });

    const address = await getEthereumAddress('expiretest.eth');
    assert.strictEqual(address, '0x2222222222222222222222222222222222222222');

    const cacheDoc = await db.collection('ensCache').doc('expiretest.eth').get();
    assert.strictEqual(cacheDoc.exists, true);
    assert.strictEqual(cacheDoc.data().address, '0x2222222222222222222222222222222222222222');
  });
});
