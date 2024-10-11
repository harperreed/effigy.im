const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const admin = require('firebase-admin');

// Import the functions to test
const { getEthereumAddress } = require('../index');
const renderSVG = require('../lib/blockiesSVG');
const renderPNG = require('../lib/blockiesPNG');

describe('Caching Tests', () => {
  let dbStub;

  before(() => {
    // Initialize Firebase app if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    
    // Stub the Firebase Realtime Database
    dbStub = sinon.stub(admin, 'database').returns({
      ref: sinon.stub().returns({
        once: sinon.stub().resolves({
          val: sinon.stub()
        }),
        set: sinon.stub().resolves()
      })
    });
  });

  after(() => {
    // Restore the stubbed methods
    dbStub.restore();
  });

  describe('getEthereumAddress', () => {
    it('should return cached address if available', async () => {
      const cachedAddress = '0x1234567890123456789012345678901234567890';
      dbStub.database().ref().once().resolves({
        val: sinon.stub().returns({ value: cachedAddress, timestamp: Date.now() })
      });

      const result = await getEthereumAddress('test.eth');
      expect(result).to.equal(cachedAddress);
    });

    it('should resolve and cache new address if not in cache', async () => {
      // Simulate cache miss
      dbStub.database().ref().once().resolves({
        val: sinon.stub().returns(null)
      });

      const result = await getEthereumAddress('newtest.eth');
      expect(result).to.be.a('string');
      expect(result).to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('renderSVG', () => {
    it('should return cached SVG if available', async () => {
      const cachedSVG = '<svg>Cached SVG</svg>';
      dbStub.database().ref().once().resolves({
        val: sinon.stub().returns(cachedSVG)
      });

      const result = await renderSVG({ seed: 'test-seed' });
      expect(result).to.equal(cachedSVG);
    });

    it('should generate and cache new SVG if not in cache', async () => {
      // Simulate cache miss
      dbStub.database().ref().once().resolves({
        val: sinon.stub().returns(null)
      });

      const result = await renderSVG({ seed: 'new-test-seed' });
      expect(result).to.be.a('string');
      expect(result).to.include('<svg');
    });
  });

  describe('renderPNG', () => {
    it('should return cached PNG if available', async () => {
      const cachedPNG = Buffer.from('Cached PNG');
      dbStub.database().ref().once().resolves({
        val: sinon.stub().returns(cachedPNG.toString('base64'))
      });

      const result = await renderPNG({ seed: 'test-seed' });
      expect(Buffer.isBuffer(result)).to.be.true;
      expect(result.toString()).to.equal(cachedPNG.toString());
    });

    it('should generate and cache new PNG if not in cache', async () => {
      // Simulate cache miss
      dbStub.database().ref().once().resolves({
        val: sinon.stub().returns(null)
      });

      const result = await renderPNG({ seed: 'new-test-seed' });
      expect(Buffer.isBuffer(result)).to.be.true;
    });
  });
});