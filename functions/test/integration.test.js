const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const admin = require('firebase-admin');
const functions = require('firebase-functions-test')();

// Import the Cloud Function
const { avatar } = require('../index');

describe('Avatar Function Integration Tests', () => {
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
    functions.cleanup();
  });

  describe('SVG Endpoint', () => {
    it('should return SVG for a valid Ethereum address', async () => {
      const req = {

        url: '/a/0x1234567890123456789012345678901234567890.svg',
        headers: {}
      };
      const res = {
        setHeader: sinon.stub(),
        set: sinon.stub(),
        send: sinon.stub(),
        status: sinon.stub().returns({ send: sinon.stub() })
      };

      await avatar(req, res);

      expect(res.setHeader.calledWith('Content-Type', 'image/svg+xml')).to.be.true;
      expect(res.send.calledOnce).to.be.true;
      expect(res.send.firstCall.args[0]).to.include('<svg');
    });

    it('should use cached SVG on subsequent requests', async () => {
      const cachedSVG = '<svg>Cached SVG</svg>';
      dbStub.database().ref().once().resolves({
        val: sinon.stub().returns({ value: cachedSVG, timestamp: Date.now() })
      });

      const req = {
        url: '/a/0x1234567890123456789012345678901234567890.svg',
        headers: {}
      };
      const res = {
        setHeader: sinon.stub(),
        set: sinon.stub(),
        send: sinon.stub(),
        status: sinon.stub().returns({ send: sinon.stub() })
      };

      await avatar(req, res);

      expect(res.send.calledWith(cachedSVG)).to.be.true;
    });
  });

  describe('PNG Endpoint', () => {
    it('should return PNG for a valid Ethereum address', async () => {
      const req = {
        url: '/a/0x1234567890123456789012345678901234567890.png',
        headers: {}
      };
      const res = {
        setHeader: sinon.stub(),
        set: sinon.stub(),
        send: sinon.stub(),
        status: sinon.stub().returns({ send: sinon.stub() })
      };

      await avatar(req, res);

      expect(res.setHeader.calledWith('Content-Type', 'image/png')).to.be.true;
      expect(res.send.calledOnce).to.be.true;
      expect(Buffer.isBuffer(res.send.firstCall.args[0])).to.be.true;
    });

    it('should use cached PNG on subsequent requests', async () => {
      const cachedPNG = Buffer.from('Cached PNG');
      dbStub.database().ref().once().resolves({
        val: sinon.stub().returns({ value: cachedPNG.toString('base64'), timestamp: Date.now() })
      });

      const req = {
        url: '/a/0x1234567890123456789012345678901234567890.png',
        headers: {}
      };
      const res = {
        setHeader: sinon.stub(),
        set: sinon.stub(),
        send: sinon.stub(),
        status: sinon.stub().returns({ send: sinon.stub() })
      };

      await avatar(req, res);

      expect(res.send.calledWith(sinon.match((arg) => arg.toString() === cachedPNG.toString()))).to.be.true;
    });
  });
});