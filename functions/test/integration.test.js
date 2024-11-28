const assert = require('assert');
const admin = require('firebase-admin');
const test = require('firebase-functions-test')();

const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

describe('Integration Tests', () => {
  before(async () => {
    await db.collection('ensCache').doc('test.eth').set({
      address: '0x1234567890123456789012345678901234567890',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  after(async () => {
    await db.collection('ensCache').doc('test.eth').delete();
  });

  it('should return cached SVG identicon for previously resolved address', async () => {
    const response = await axios.get('http://localhost:5001/avatar-party/us-central1/avatar/a/test.eth.svg');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['content-type'], 'image/svg+xml');
  });

  it('should return cached PNG identicon for previously resolved address', async () => {
    const response = await axios.get('http://localhost:5001/avatar-party/us-central1/avatar/a/test.eth.png');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['content-type'], 'image/png');
  });

  it('should resolve new address and cache it', async () => {
    const response = await axios.get('http://localhost:5001/avatar-party/us-central1/avatar/a/newtest.eth.svg');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['content-type'], 'image/svg+xml');

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

    const response = await axios.get('http://localhost:5001/avatar-party/us-central1/avatar/a/expiretest.eth.svg');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['content-type'], 'image/svg+xml');

    const cacheDoc = await db.collection('ensCache').doc('expiretest.eth').get();
    assert.strictEqual(cacheDoc.exists, true);
    assert.strictEqual(cacheDoc.data().address, '0x2222222222222222222222222222222222222222');
  });

  it('should verify improved response times for cached results', async () => {
    const startTime = Date.now();
    await axios.get('http://localhost:5001/avatar-party/us-central1/avatar/a/test.eth.svg');
    const firstResponseTime = Date.now() - startTime;

    const cachedStartTime = Date.now();
    await axios.get('http://localhost:5001/avatar-party/us-central1/avatar/a/test.eth.svg');
    const cachedResponseTime = Date.now() - cachedStartTime;

    assert(cachedResponseTime < firstResponseTime, 'Cached response time should be faster than first response time');
  });
});
