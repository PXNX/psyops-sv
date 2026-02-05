// src/lib/server/logo-utils.ts
import { db } from "$lib/server/db";
import { files } from "$lib/server/schema";
import { uploadFileFromForm, deleteFile } from "$lib/server/backblaze";
import { eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

/**
 * Upload a new logo and create a file record
 * @param logoFile - The logo file to upload
 * @param uploadedBy - Account ID of the uploader
 * @returns File ID of the uploaded logo, or null if no file provided
 */
export async function uploadLogo(logoFile: File | undefined, uploadedBy: string): Promise<number | null> {
	if (!logoFile || logoFile.size === 0) {
		return null;
	}

	// Upload to Backblaze
	const uploadResult = await uploadFileFromForm(logoFile);

	if (!uploadResult.success) {
		throw new Error("Failed to upload logo");
	}

	// Create file record in database
	const [fileRecord] = await db
		.insert(files)
		.values({
			key: uploadResult.key,
			fileName: logoFile.name,
			contentType: "image/webp",
			sizeBytes: logoFile.size,
			uploadedBy: uploadedBy
		})
		.returning();

	return fileRecord.id;
}

/**
 * Delete an old logo file from both database and storage
 * @param oldLogoId - File ID of the old logo to delete
 */
export async function deleteOldLogo(oldLogoId: number | null | undefined): Promise<void> {
	if (!oldLogoId) return;

	try {
		// Get the file record to find the key
		const fileRecord = await db.query.files.findFirst({
			where: eq(files.id, oldLogoId)
		});

		if (!fileRecord) return;

		// Delete from Backblaze storage
		await deleteFile(fileRecord.key);

		// Delete from database
		await db.delete(files).where(eq(files.id, oldLogoId));
	} catch (error) {
		// Log error but don't fail the transaction
		// Old files can be cleaned up manually if needed
		console.error("Failed to delete old logo:", error);
	}
}

/**
 * Delete an old logo file within a transaction
 * @param tx - Database transaction
 * @param oldLogoId - File ID of the old logo to delete
 */
export async function deleteOldLogoInTransaction(tx: any, oldLogoId: number | null | undefined): Promise<void> {
	if (!oldLogoId) return;

	try {
		// Get the file record to find the key
		const fileRecord = await db.query.files.findFirst({
			where: eq(files.id, oldLogoId)
		});

		if (!fileRecord) return;

		// Delete from Backblaze storage (outside transaction)
		await deleteFile(fileRecord.key);

		// Delete from database within transaction
		await tx.delete(files).where(eq(files.id, oldLogoId));
	} catch (error) {
		// Log error but don't fail the transaction
		console.error("Failed to delete old logo:", error);
	}
}

/**
 * Upload a new logo within a transaction and create a file record
 * @param tx - Database transaction
 * @param logoFile - The logo file to upload
 * @param uploadedBy - Account ID of the uploader
 * @returns File ID of the uploaded logo, or null if no file provided
 */
export async function uploadLogoInTransaction(
	tx: any, // Type would be: Parameters<Parameters<typeof db.transaction>[0]>[0]
	logoFile: File | undefined,
	uploadedBy: string
): Promise<number | null> {
	if (!logoFile || logoFile.size === 0) {
		return null;
	}

	// Upload to Backblaze (outside transaction - file storage is separate)
	const uploadResult = await uploadFileFromForm(logoFile);

	if (!uploadResult.success) {
		throw new Error("Failed to upload logo");
	}

	// Create file record in database within transaction
	const [fileRecord] = await tx
		.insert(files)
		.values({
			key: uploadResult.key,
			fileName: logoFile.name,
			contentType: "image/webp",
			sizeBytes: logoFile.size,
			uploadedBy: uploadedBy
		})
		.returning();

	return fileRecord.id;
}

/**
 * Upload a new logo and optionally delete the old one within a transaction
 * @param tx - Database transaction
 * @param logoFile - The logo file to upload
 * @param uploadedBy - Account ID of the uploader
 * @param oldLogoId - File ID of the old logo to delete (optional)
 * @returns File ID of the uploaded logo, or null if no file provided
 */
export async function replaceLogoInTransaction(
	tx: any,
	logoFile: File | undefined,
	uploadedBy: string,
	oldLogoId: number | null | undefined
): Promise<number | null> {
	// Upload new logo first
	const newLogoId = await uploadLogoInTransaction(tx, logoFile, uploadedBy);

	// If upload was successful and there was an old logo, delete it
	if (newLogoId && oldLogoId) {
		await deleteOldLogoInTransaction(tx, oldLogoId);
	}

	return newLogoId;
}

/**
 * Helper to conditionally include logo field in update object
 * @param logoFileId - The new logo file ID, or undefined to keep existing
 * @returns Object with logo field if logoFileId is provided, empty object otherwise
 */
export function includeLogoUpdate(logoFileId: number | undefined): { logo: number } | {} {
	return logoFileId ? { logo: logoFileId } : {};
}

/**
 * Full logo update workflow - upload file and return update object
 * @param logoFile - The logo file to upload
 * @param uploadedBy - Account ID of the uploader
 * @returns Object containing logo field if file was uploaded, empty object otherwise
 */
export async function processLogoUpdate(
	logoFile: File | undefined,
	uploadedBy: string
): Promise<{ logo: number } | {}> {
	const logoFileId = await uploadLogo(logoFile, uploadedBy);
	return includeLogoUpdate(logoFileId);
}

/**
 * Full logo update workflow within a transaction
 * @param tx - Database transaction
 * @param logoFile - The logo file to upload
 * @param uploadedBy - Account ID of the uploader
 * @returns Object containing logo field if file was uploaded, empty object otherwise
 */
export async function processLogoUpdateInTransaction(
	tx: any,
	logoFile: File | undefined,
	uploadedBy: string
): Promise<{ logo: number } | {}> {
	const logoFileId = await uploadLogoInTransaction(tx, logoFile, uploadedBy);
	return includeLogoUpdate(logoFileId);
}
