// Mock file storage - stores files on local filesystem instead of S3/Backblaze
// Provides the same interface as the real backblaze module

import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";

export interface UploadResult {
    success: boolean;
    key: string;
    error?: string;
}

// Default storage directory
const DEFAULT_STORAGE_DIR = join(
    process.cwd(),
    "packages",
    "rest-mock",
    ".mock-files",
);

export class MockFileStorage {
    private storageDir: string;
    private fileIndex: Map<string, { fileName: string; contentType: string; sizeBytes: number; data: Buffer }>;

    constructor(storageDir?: string) {
        this.storageDir = storageDir ?? DEFAULT_STORAGE_DIR;
        this.fileIndex = new Map();

        // Ensure storage directory exists
        if (!existsSync(this.storageDir)) {
            mkdirSync(this.storageDir, { recursive: true });
        }
    }

    async uploadFile(
        buffer: Buffer,
        fileName: string,
        contentType = "image/webp",
    ): Promise<UploadResult> {
        try {
            const key = `${randomUUID()}.webp`;
            const filePath = join(this.storageDir, key);

            // Ensure directory exists
            const dir = dirname(filePath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }

            // Write file to disk (no image processing in mock)
            writeFileSync(filePath, buffer);

            // Store metadata in memory
            this.fileIndex.set(key, {
                fileName,
                contentType,
                sizeBytes: buffer.length,
                data: buffer,
            });

            return { success: true, key };
        } catch (error) {
            return {
                success: false,
                key: "",
                error:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async uploadFileFromForm(file: {
        name: string;
        size: number;
        type: string;
        arrayBuffer(): Promise<ArrayBuffer>;
    }): Promise<UploadResult> {
        if (!file || file.size === 0) {
            return { success: false, key: "", error: "No file provided" };
        }

        if (file.size > 5 * 1024 * 1024) {
            return {
                success: false,
                key: "",
                error: "File size exceeds 5MB limit",
            };
        }

        if (!file.type.startsWith("image/")) {
            return {
                success: false,
                key: "",
                error: "File must be an image",
            };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        return this.uploadFile(buffer, file.name, file.type);
    }

    getFileUrl(key: string): string {
        // Return a local URL that the mock server can serve
        return `/mock-files/${key}`;
    }

    async getSignedDownloadUrl(key: string, _expiresIn = 604800): Promise<string> {
        return this.getFileUrl(key);
    }

    async getSignedDownloadUrlShort(key: string): Promise<string> {
        return this.getFileUrl(key);
    }

    getFileBuffer(key: string): Buffer | null {
        // Try from memory index first
        const indexed = this.fileIndex.get(key);
        if (indexed) return indexed.data;

        // Try from disk
        const filePath = join(this.storageDir, key);
        if (existsSync(filePath)) {
            return readFileSync(filePath);
        }

        return null;
    }

    async deleteFile(key: string): Promise<boolean> {
        try {
            const filePath = join(this.storageDir, key);
            if (existsSync(filePath)) {
                unlinkSync(filePath);
            }
            this.fileIndex.delete(key);
            return true;
        } catch {
            return false;
        }
    }

    // Create a placeholder image buffer (1x1 pixel PNG)
    static createPlaceholderImage(): Buffer {
        // Minimal valid PNG (1x1 transparent pixel)
        return Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
            0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
            0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
            0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
            0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
            0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
        ]);
    }

    reset(): void {
        this.fileIndex.clear();
    }
}

// Singleton
let _instance: MockFileStorage | null = null;

export function getMockStorage(storageDir?: string): MockFileStorage {
    if (!_instance) {
        _instance = new MockFileStorage(storageDir);
    }
    return _instance;
}

export function createMockStorage(storageDir?: string): MockFileStorage {
    return new MockFileStorage(storageDir);
}
