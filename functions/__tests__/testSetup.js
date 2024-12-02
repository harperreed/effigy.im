const firebasemock = require("firebase-mock");
const mockauth = new firebasemock.MockFirebase();
const mockfirestore = new firebasemock.MockFirestore();
const mocksdk = firebasemock.MockFirebaseSdk(
	null,
	() => mockauth,
	() => mockfirestore,
);

// Initialize the mock app
const mockapp = mocksdk.initializeApp();

// Function to initialize test data
const initializeMockData = async () => {
	const addressesRef = mockfirestore.collection("addresses");

	// Add test data
	await addressesRef.doc("vitalik.eth").set({
		address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
		timestamp: new Date(),
	});

	await addressesRef.doc("nick.eth").set({
		address: "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5",
		timestamp: new Date(),
	});
};

module.exports = {
	mockfirestore,
	mockauth,
	mocksdk,
	mockapp,
	initializeMockData,
};
