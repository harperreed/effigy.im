const { generateAvatar, uploadAvatarToStorage } = require("../lib/avatarHelpers");
const { getStorage } = require("firebase-admin/storage");

jest.mock("firebase-admin/storage", () => {
    const mBucket = {
        file: jest.fn(() => ({
            save: jest.fn(),
            exists: jest.fn(() => [false]),
            download: jest.fn(() => ["mocked content"]),
        })),
    };
    return {
        getStorage: jest.fn(() => ({
            bucket: jest.fn(() => mBucket),
        })),
    };
});

describe("Avatar Helpers", () => {
    describe("generateAvatar", () => {
        test("generates SVG avatar", () => {
            const addressSeed = "0x1234567890abcdef";
            const avatarData = generateAvatar("svg", addressSeed);
            expect(avatarData).toHaveProperty("body");
            expect(avatarData).toHaveProperty("filename", `${addressSeed}.svg`);
            expect(avatarData).toHaveProperty("contentType", "image/svg+xml");
        });

        test("generates PNG avatar", () => {
            const addressSeed = "0x1234567890abcdef";
            const avatarData = generateAvatar("png", addressSeed);
            expect(avatarData).toHaveProperty("body");
            expect(avatarData).toHaveProperty("filename", `${addressSeed}.png`);
            expect(avatarData).toHaveProperty("contentType", "image/png");
        });

        test("throws error for unsupported avatar type", () => {
            const addressSeed = "0x1234567890abcdef";
            expect(() => generateAvatar("unsupported", addressSeed)).toThrow("Unsupported avatar type: unsupported");
        });
    });

    describe("uploadAvatarToStorage", () => {
        test("uploads avatar to Firebase Storage", async () => {
            const cacheKey = "0x1234567890abcdef-svg";
            const avatarData = {
                body: "mocked content",
                contentType: "image/svg+xml",
            };

            await uploadAvatarToStorage(cacheKey, avatarData);

            const bucket = getStorage().bucket();
            const file = bucket.file(`avatars/${cacheKey}`);
            expect(file.save).toHaveBeenCalledWith(avatarData.body, {
                metadata: {
                    contentType: avatarData.contentType,
                },
            });
        });

        test("throws error if upload fails", async () => {
            const cacheKey = "0x1234567890abcdef-svg";
            const avatarData = {
                body: "mocked content",
                contentType: "image/svg+xml",
            };

            const bucket = getStorage().bucket();
            const file = bucket.file(`avatars/${cacheKey}`);
            file.save.mockImplementationOnce(() => {
                throw new Error("Upload failed");
            });

            await expect(uploadAvatarToStorage(cacheKey, avatarData)).rejects.toThrow("Failed to upload avatar to Firebase Storage");
        });
    });
});
