const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.database();

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

async function getCachedAddress(addressOrENS) {
  const ref = db.ref(`addressCache/${addressOrENS}`);
  const snapshot = await ref.once('value');
  const data = snapshot.val();

  if (data && Date.now() - data.timestamp < CACHE_DURATION) {
    return data.address;
  }

  return null;
}

async function setCachedAddress(addressOrENS, resolvedAddress) {
  const ref = db.ref(`addressCache/${addressOrENS}`);
  await ref.set({
    address: resolvedAddress,
    timestamp: Date.now()
  });
}

module.exports = {
  getCachedAddress,
  setCachedAddress
};