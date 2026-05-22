import { describe, it, expect, beforeEach, afterEach } from "@rstest/core";
import { createMockStorage, MockFileStorage } from "../mock-storage.js";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEST_STORAGE_DIR = join(process.cwd(), ".test-mock-files");

describe("MockFileStorage", () => {
    let storage: MockFileStorage;

    beforeEach(() => {
        // Clean up test directory
        if (existsSync(TEST_STORAGE_DIR)) {
            rmSync(TEST_STORAGE_DIR, { recursive: true });
        }
        storage = createMockStorage(TEST_STORAGE_DIR);
    });

    afterEach(() => {
        if (existsSync(TEST_STORAGE_DIR)) {
            rmSync(TEST_STORAGE_DIR, { recursive: true });
        }
    });

    describe("File Upload", () => {
        it("should upload a file and return a key", async () => {
            const buffer = Buffer.from("test image data");
            const result = await storage.uploadFile(buffer, "test.png");

            expect(result.success).toBe(true);
            expect(result.key).toBeTruthy();
            expect(result.key).toMatch(/\.webp$/);
        });

        it("should write file to storage directory", async () => {
            const buffer = Buffer.from("test image data");
            const result = await storage.uploadFile(buffer, "test.png");

            const filePath = join(TEST_STORAGE_DIR, result.key);
            expect(existsSync(filePath)).toBe(true);
        });

        it("should generate unique keys for different uploads", async () => {
            const buffer = Buffer.from("test");
            const result1 = await storage.uploadFile(buffer, "a.png");
            const result2 = await storage.uploadFile(buffer, "b.png");

            expect(result1.key).not.toBe(result2.key);
        });
    });

    describe("File Upload from Form", () => {
        it("should reject empty files", async () => {
            const file = {
                name: "empty.png",
                size: 0,
                type: "image/png",
                arrayBuffer: async () => new ArrayBuffer(0),
            };

            const result = await storage.uploadFileFromForm(file);
            expect(result.success).toBe(false);
            expect(result.error).toContain("No file provided");
        });

        it("should reject files over 5MB", async () => {
            const file = {
                name: "huge.png",
                size: 6 * 1024 * 1024,
                type: "image/png",
                arrayBuffer: async () => new ArrayBuffer(6 * 1024 * 1024),
            };

            const result = await storage.uploadFileFromForm(file);
            expect(result.success).toBe(false);
            expect(result.error).toContain("5MB");
        });

        it("should reject non-image files", async () => {
            const file = {
                name: "doc.pdf",
                size: 100,
                type: "application/pdf",
                arrayBuffer: async () => new ArrayBuffer(100),
            };

            const result = await storage.uploadFileFromForm(file);
            expect(result.success).toBe(false);
            expect(result.error).toContain("image");
        });

        it("should accept valid image files", async () => {
            const data = new Uint8Array([1, 2, 3, 4, 5]);
            const file = {
                name: "valid.png",
                size: data.length,
                type: "image/png",
                arrayBuffer: async () => data.buffer,
            };

            const result = await storage.uploadFileFromForm(file);
            expect(result.success).toBe(true);
        });
    });

    describe("File URLs", () => {
        it("should generate mock download URLs", async () => {
            const url = await storage.getSignedDownloadUrl("test-key.webp");
            expect(url).toBe("/mock-files/test-key.webp");
        });

        it("should generate short download URLs", async () => {
            const url = await storage.getSignedDownloadUrlShort("test-key.webp");
            expect(url).toBe("/mock-files/test-key.webp");
        });
    });

    describe("File Retrieval", () => {
        it("should retrieve uploaded file buffer", async () => {
            const originalData = Buffer.from("test file content");
            const result = await storage.uploadFile(
                originalData,
                "test.png",
            );

            const retrieved = storage.getFileBuffer(result.key);
            expect(retrieved).not.toBeNull();
            expect(retrieved!.toString()).toBe("test file content");
        });

        it("should return null for non-existent files", () => {
            const result = storage.getFileBuffer("nonexistent.webp");
            expect(result).toBeNull();
        });
    });

    describe("File Deletion", () => {
        it("should delete an uploaded file", async () => {
            const buffer = Buffer.from("test");
            const result = await storage.uploadFile(buffer, "test.png");

            const deleted = await storage.deleteFile(result.key);
            expect(deleted).toBe(true);

            const filePath = join(TEST_STORAGE_DIR, result.key);
            expect(existsSync(filePath)).toBe(false);
        });

        it("should handle deleting non-existent files gracefully", async () => {
            const deleted = await storage.deleteFile("nonexistent.webp");
            expect(deleted).toBe(true);
        });
    });

    describe("Placeholder Image", () => {
        it("should create a valid PNG placeholder", () => {
            const placeholder = MockFileStorage.createPlaceholderImage();
            expect(placeholder).toBeInstanceOf(Buffer);
            expect(placeholder.length).toBeGreaterThan(0);
            // Check PNG magic bytes
            expect(placeholder[0]).toBe(0x89);
            expect(placeholder[1]).toBe(0x50); // P
            expect(placeholder[2]).toBe(0x4e); // N
            expect(placeholder[3]).toBe(0x47); // G
        });
    });
});
