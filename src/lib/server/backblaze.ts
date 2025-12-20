// src/lib/server/backblaze.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { randomUUID } from "crypto";
import {
	BACKBLAZE_KEY_ID,
	BACKBLAZE_APPLICATION_KEY,
	BACKBLAZE_BUCKET_NAME,
	BACKBLAZE_REGION,
	BACKBLAZE_ENDPOINT
} from "$env/static/private";

// Initialize S3 Client
const s3Client = new S3Client({
	endpoint: BACKBLAZE_ENDPOINT,
	region: BACKBLAZE_REGION,
	credentials: {
		accessKeyId: BACKBLAZE_KEY_ID,
		secretAccessKey: BACKBLAZE_APPLICATION_KEY
	},
	forcePathStyle: true
});

/**
 * Upload image to Backblaze B2
 * Converts PNG/JPG/JPEG/WEBP to WebP 96x96
 */
export async function uploadImage(file: File) {
	try {
		// 1. Convert file to buffer
		const buffer = Buffer.from(await file.arrayBuffer());

		// 2. Process image: resize to 96x96 and convert to WebP
		const processedBuffer = await sharp(buffer)
			.resize(96, 96, {
				fit: "cover",
				position: "center"
			})
			.webp({ quality: 90 })
			.toBuffer();

		// 3. Generate unique filename
		const key = `${randomUUID()}.webp`;

		console.log(`ℹ️ Uploading: ${key} (${processedBuffer.length} bytes)`);

		// 4. Upload to B2
		const command = new PutObjectCommand({
			Bucket: BACKBLAZE_BUCKET_NAME,
			Key: key,
			Body: processedBuffer,
			ContentType: "image/webp"
		});

		console.log(command);

		await s3Client.send(command);

		console.log(`✓ Uploaded: ${key} (${processedBuffer.length} bytes)`);
		return { success: true, key };
	} catch (error) {
		console.error("Upload failed:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Upload failed"
		};
	}
}

/**
 * Get signed URL for downloading file
 */
export async function getDownloadUrl(key: string, expiresIn: number = 604800) {
	const command = new GetObjectCommand({
		Bucket: BACKBLAZE_BUCKET_NAME,
		Key: key
	});

	return await getSignedUrl(s3Client, command, { expiresIn });
}
