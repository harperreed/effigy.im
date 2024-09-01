const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const bucketName = 'your-blockie-bucket-name'; // Replace with your actual bucket name

async function blockieExists(address, type) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(`${address}.${type}`);
  const [exists] = await file.exists();
  return exists;
}

async function uploadBlockie(address, type, content) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(`${address}.${type}`);
  await file.save(content, {
    metadata: {
      contentType: type === 'svg' ? 'image/svg+xml' : 'image/png',
      cacheControl: 'public, max-age=86400, s-maxage=86400',
    },
  });
}

function getBlockieUrl(address, type) {
  return `https://storage.googleapis.com/${bucketName}/${address}.${type}`;
}

module.exports = {
  blockieExists,
  uploadBlockie,
  getBlockieUrl,
};