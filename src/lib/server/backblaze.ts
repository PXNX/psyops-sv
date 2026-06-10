// src/lib/server/backblaze.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { files } from "./schema";
import { db, isMockMode } from "./db";
import { env } from "$env/dynamic/private";
import { eq } from "drizzle-orm/sql/expressions";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";

// Mock mode: local file storage
const MOCK_STORAGE_DIR = join(process.cwd(), ".mock-files");
const MOCK_API_URL = env.MOCK_API_URL || "http://localhost:3456";

function getS3Client(): S3Client | null {
	if (isMockMode) {
		// Ensure mock storage directory exists
		if (!existsSync(MOCK_STORAGE_DIR)) {
			mkdirSync(MOCK_STORAGE_DIR, { recursive: true });
		}
		return null;
	}

	const BACKBLAZE_KEY_ID = env.BACKBLAZE_KEY_ID;
	const BACKBLAZE_APPLICATION_KEY = env.BACKBLAZE_APPLICATION_KEY;
	const BACKBLAZE_REGION = env.BACKBLAZE_REGION;
	const BACKBLAZE_ENDPOINT = env.BACKBLAZE_ENDPOINT;

	if (!BACKBLAZE_KEY_ID || !BACKBLAZE_APPLICATION_KEY || !BACKBLAZE_ENDPOINT || !BACKBLAZE_REGION) {
		throw new Error("Backblaze environment variables are required (set USE_MOCK=true for mock mode)");
	}

	return new S3Client({
		endpoint: BACKBLAZE_ENDPOINT,
		region: BACKBLAZE_REGION,
		credentials: {
			accessKeyId: BACKBLAZE_KEY_ID,
			secretAccessKey: BACKBLAZE_APPLICATION_KEY
		},
		forcePathStyle: true
	});
}

const s3Client = getS3Client();
const BACKBLAZE_BUCKET_NAME = env.BACKBLAZE_BUCKET_NAME || "mock-bucket";

export interface UploadResult {
	success: boolean;
	key: string;
	error?: string;
}

// Fixed image dimensions - all images converted to 96x96 WebP
const IMAGE_SIZE = 96;
const WEBP_QUALITY = 85;

/**
 * Convert image to 96x96 WebP format
 * @param buffer - Original image buffer
 * @returns Processed WebP image buffer
 */
async function processImageToWebP(buffer: Buffer): Promise<Buffer> {
	return await sharp(buffer)
		.resize(IMAGE_SIZE, IMAGE_SIZE, {
			fit: "cover",
			position: "center",
			withoutEnlargement: false
		})
		.webp({ quality: WEBP_QUALITY })
		.toBuffer();
}

/**
 * Upload a file buffer to Backblaze B2 (converted to 96x96 WebP)
 * In mock mode, saves to local filesystem instead.
 * @param buffer - File buffer to upload
 * @param fileName - Original filename (for reference)
 * @returns Upload result with storage key
 */
export async function uploadFile(buffer: Buffer, fileName: string): Promise<UploadResult> {
	try {
		const uniqueKey = `${randomUUID()}.webp`;

		if (isMockMode) {
			// Mock mode: save to local filesystem without image processing
			const filePath = join(MOCK_STORAGE_DIR, uniqueKey);
			const dir = dirname(filePath);
			if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
			writeFileSync(filePath, buffer);
			return { success: true, key: uniqueKey };
		}

		// Production: process and upload to S3
		const processedBuffer = await processImageToWebP(buffer);

		const command = new PutObjectCommand({
			Bucket: BACKBLAZE_BUCKET_NAME,
			Key: uniqueKey,
			Body: processedBuffer,
			ContentType: "image/webp",
			CacheControl: "public, max-age=31536000, immutable",
			Metadata: {
				originalName: fileName,
				uploadedAt: new Date().toISOString(),
				resized: `${IMAGE_SIZE}x${IMAGE_SIZE}`
			}
		});

		await s3Client!.send(command);

		return {
			success: true,
			key: uniqueKey
		};
	} catch (error) {
		console.error("Upload failed:", error);
		return {
			success: false,
			key: "",
			error: error instanceof Error ? error.message : "Unknown error"
		};
	}
}

/**
 * Upload a file directly from FormData (converted to 96x96 WebP)
 * @param file - File from form input
 * @returns Upload result with storage key
 */
export async function uploadFileFromForm(file: File): Promise<UploadResult> {
	if (!file || file.size === 0) {
		return {
			success: false,
			key: "",
			error: "No file provided or file is empty"
		};
	}

	// Validate file size (5MB limit for original)
	const maxSize = 5 * 1024 * 1024;
	if (file.size > maxSize) {
		return {
			success: false,
			key: "",
			error: "File size exceeds 5MB limit"
		};
	}

	// Validate that it's an image
	if (!file.type.startsWith("image/")) {
		return {
			success: false,
			key: "",
			error: "File must be an image"
		};
	}

	// Convert to buffer
	const buffer = Buffer.from(await file.arrayBuffer());

	return uploadFile(buffer, file.name);
}

export async function getPresignedUploadUrl(key: string): Promise<string> {
	if (isMockMode) {
		return `${MOCK_API_URL}/mock-files/${key}`;
	}

	const command = new PutObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key,
		ContentType: "image/webp",
		CacheControl: "public, max-age=31536000, immutable"
	});

	return await getSignedUrl(s3Client!, command, { expiresIn: 3600 });
}

/**
 * Get signed download URL with extended expiration for caching
 * In mock mode, returns a local URL served by the mock server.
 * @param key - File key in B2
 * @param expiresIn - Expiration time in seconds (default: 7 days for better caching)
 * @returns Signed URL
 */
export async function getSignedDownloadUrl(
	key: string,
	expiresIn: number = 604800 // 7 days
): Promise<string> {
	if (isMockMode) {
		return `${MOCK_API_URL}/mock-files/${key}`;
	}

	const command = new GetObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key,
		ResponseCacheControl: `public, max-age=${expiresIn}, immutable`
	});

	return await getSignedUrl(s3Client!, command, { expiresIn });
}

/**
 * Get signed download URL with short expiration (for sensitive content)
 * @param key - File key in B2
 * @returns Signed URL with 1 hour expiration
 */
export async function getSignedDownloadUrlShort(key: string): Promise<string> {
	if (isMockMode) {
		return `${MOCK_API_URL}/mock-files/${key}`;
	}

	const command = new GetObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key,
		ResponseCacheControl: "public, max-age=3600"
	});

	return await getSignedUrl(s3Client!, command, { expiresIn: 3600 });
}

export async function getLogoUrl(logoId: number | null | undefined): Promise<string | null> {
	if (!logoId) return null;

	const logoFile = await db.query.files.findFirst({
		where: eq(files.id, logoId!)
	});

	if (!logoFile) return null;

	try {
		return await getSignedDownloadUrl(logoFile.key);
	} catch {
		return null;
	}
}

import { DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Delete a file from Backblaze B2 (or local filesystem in mock mode)
 * @param key - File key to delete
 * @returns True if deletion was successful
 */
export async function deleteFile(key: string): Promise<boolean> {
	try {
		if (isMockMode) {
			const filePath = join(MOCK_STORAGE_DIR, key);
			if (existsSync(filePath)) unlinkSync(filePath);
			return true;
		}

		const command = new DeleteObjectCommand({
			Bucket: BACKBLAZE_BUCKET_NAME,
			Key: key
		});

		await s3Client!.send(command);
		return true;
	} catch (error) {
		console.error("Delete failed:", error);
		return false;
	}
}
