// src/routes/+page.server.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import {
	BACKBLAZE_KEY_ID,
	BACKBLAZE_APPLICATION_KEY,
	BACKBLAZE_BUCKET_NAME,
	BACKBLAZE_REGION,
	BACKBLAZE_ENDPOINT
} from "$env/static/private";

// Initialize S3 client for Backblaze B2
const s3Client = new S3Client({
	region: BACKBLAZE_REGION,
	endpoint: BACKBLAZE_ENDPOINT,
	credentials: {
		accessKeyId: BACKBLAZE_KEY_ID,
		secretAccessKey: BACKBLAZE_APPLICATION_KEY
	}
});

export const actions = {
	upload: async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get("file") as File;

			if (!file) {
				return fail(400, { error: "No file provided" });
			}

			// Validate file type
			if (!file.type.startsWith("image/")) {
				return fail(400, { error: "File must be an image" });
			}

			// Generate unique filename
			const timestamp = Date.now();
			const randomString = Math.random().toString(36).substring(2, 15);
			const fileExtension = file.name.split(".").pop();
			const fileName = `${timestamp}-${randomString}.${fileExtension}`;

			// Convert file to buffer
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Upload to Backblaze B2
			const command = new PutObjectCommand({
				Bucket: BACKBLAZE_BUCKET_NAME,
				Key: fileName,
				Body: buffer,
				ContentType: file.type
				//	ContentLength: buffer.length
			});

			await s3Client.send(command);

			// Construct the public URL
			const fileUrl = `${BACKBLAZE_ENDPOINT}/${BACKBLAZE_BUCKET_NAME}/${fileName}`;

			return {
				success: true,
				url: fileUrl,
				fileName: fileName
			};
		} catch (err) {
			console.error("Upload error:", err);
			return fail(500, { error: "Failed to upload file" });
		}
	}
} satisfies Actions;
