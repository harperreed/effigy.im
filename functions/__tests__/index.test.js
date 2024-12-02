const { getOrGenerateAvatar } = require("../index");
const { getStorage } = require("firebase-admin/storage");
const { generateAvatar } = require("../lib/avatarHelpers");

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

jest.mock("../lib/avatarHelpers", () => ({
    generateAvatar: jest.fn(() => ({
        body: "generated content",
        contentType: "image/svg+xml",
    })),
}));

describe("getOrGenerateAvatar", () => {
    test("returns cached avatar if it exists", async () => {
        const cacheKey = "0x1234567890abcdef-svg";
        const bucket = getStorage().bucket();
        const file = bucket.file(`avatars/${cacheKey}`);
        file.exists.mockResolvedValueOnce([true]);
        file.download.mockResolvedValueOnce(["cached content"]);

        const result = await getOrGenerateAvatar("0x1234567890abcdef", "svg");

        expect(result).toBe("cached content");
        expect(file.exists).toHaveBeenCalled();
        expect(file.download).toHaveBeenCalled();
        expect(generateAvatar).not.toHaveBeenCalled();
    });

    test("generates and caches avatar if it does not exist", async () => {
        const cacheKey = "0x1234567890abcdef-svg";
        const bucket = getStorage().bucket();
        const file = bucket.file(`avatars/${cacheKey}`);
        file.exists.mockResolvedValueOnce([false]);

        const result = await getOrGenerateAvatar("0x1234567890abcdef", "svg");

        expect(result).toBe("generated content");
        expect(file.exists).toHaveBeenCalled();
        expect(file.download).not.toHaveBeenCalled();
        expect(generateAvatar).toHaveBeenCalledWith("svg", "0x1234567890abcdef");
        expect(file.save).toHaveBeenCalledWith("generated content", {
            metadata: {
                contentType: "image/svg+xml",
            },
        });
    });

    test("throws error if there is an issue with Firebase Storage", async () => {
        const cacheKey = "0x1234567890abcdef-svg";
        const bucket = getStorage().bucket();
        const file = bucket.file(`avatars/${cacheKey}`);
        file.exists.mockImplementationOnce(() => {
            throw new Error("Storage error");
        });

        await expect(getOrGenerateAvatar("0x1234567890abcdef", "svg")).rejects.toThrow("Failed to get or generate avatar");
    });
});
