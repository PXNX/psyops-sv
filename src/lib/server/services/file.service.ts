// File service - handles file uploads and logo management
import { db } from '../db';
import { files } from '../schema';
import { uploadFileFromForm, deleteFile } from '../backblaze';
import { eq } from 'drizzle-orm';

export class FileService {
    constructor(private db: typeof import('../db').db) { }

    // ============ File Operations ============

    async getFileById(fileId: number) {
        const result = await this.db.select().from(files).where(eq(files.id, fileId));
        return result[0] || null;
    }

    async createFile(data: typeof files.$inferInsert) {
        const [file] = await this.db.insert(files).values(data).returning();
        return file;
    }

    async deleteFileById(fileId: number) {
        const file = await this.getFileById(fileId);
        if (!file) return;

        // Delete from storage
        await deleteFile(file.key);

        // Delete from database
        await this.db.delete(files).where(eq(files.id, fileId));
    }

    // ============ Logo Upload/Management ============

    /**
     * Upload a new logo and create a file record
     */
    async uploadLogo(logoFile: File | undefined, uploadedBy: string): Promise<number | null> {
        if (!logoFile || logoFile.size === 0) {
            return null;
        }

        // Upload to Backblaze
        const uploadResult = await uploadFileFromForm(logoFile);

        if (!uploadResult.success) {
            throw new Error('Failed to upload logo');
        }

        // Create file record in database
        const [fileRecord] = await this.db
            .insert(files)
            .values({
                key: uploadResult.key,
                fileName: logoFile.name,
                contentType: 'image/webp',
                sizeBytes: logoFile.size,
                uploadedBy: uploadedBy
            })
            .returning();

        return fileRecord.id;
    }

    /**
     * Delete an old logo file from both database and storage
     */
    async deleteOldLogo(oldLogoId: number | null | undefined): Promise<void> {
        if (!oldLogoId) return;

        try {
            // Get the file record to find the key
            const fileRecord = await this.db.query.files.findFirst({
                where: eq(files.id, oldLogoId)
            });

            if (!fileRecord) return;

            // Delete from Backblaze storage
            await deleteFile(fileRecord.key);

            // Delete from database
            await this.db.delete(files).where(eq(files.id, oldLogoId));
        } catch (error) {
            // Log error but don't fail the transaction
            // Old files can be cleaned up manually if needed
            console.error('Failed to delete old logo:', error);
        }
    }

    /**
     * Delete an old logo file within a transaction
     */
    async deleteOldLogoInTransaction(tx: any, oldLogoId: number | null | undefined): Promise<void> {
        if (!oldLogoId) return;

        try {
            // Get the file record to find the key
            const fileRecord = await this.db.query.files.findFirst({
                where: eq(files.id, oldLogoId)
            });

            if (!fileRecord) return;

            // Delete from Backblaze storage (outside transaction)
            await deleteFile(fileRecord.key);

            // Delete from database within transaction
            await tx.delete(files).where(eq(files.id, oldLogoId));
        } catch (error) {
            // Log error but don't fail the transaction
            console.error('Failed to delete old logo:', error);
        }
    }

    /**
     * Upload a new logo within a transaction and create a file record
     */
    async uploadLogoInTransaction(
        tx: any,
        logoFile: File | undefined,
        uploadedBy: string
    ): Promise<number | null> {
        if (!logoFile || logoFile.size === 0) {
            return null;
        }

        // Upload to Backblaze (outside transaction - file storage is separate)
        const uploadResult = await uploadFileFromForm(logoFile);

        if (!uploadResult.success) {
            throw new Error('Failed to upload logo');
        }

        // Create file record in database within transaction
        const [fileRecord] = await tx
            .insert(files)
            .values({
                key: uploadResult.key,
                fileName: logoFile.name,
                contentType: 'image/webp',
                sizeBytes: logoFile.size,
                uploadedBy: uploadedBy
            })
            .returning();

        return fileRecord.id;
    }

    /**
     * Upload a new logo and optionally delete the old one within a transaction
     */
    async replaceLogoInTransaction(
        tx: any,
        logoFile: File | undefined,
        uploadedBy: string,
        oldLogoId: number | null | undefined
    ): Promise<number | null> {
        // Upload new logo first
        const newLogoId = await this.uploadLogoInTransaction(tx, logoFile, uploadedBy);

        // If upload was successful and there was an old logo, delete it
        if (newLogoId && oldLogoId) {
            await this.deleteOldLogoInTransaction(tx, oldLogoId);
        }

        return newLogoId;
    }

    /**
     * Helper to conditionally include logo field in update object
     */
    includeLogoUpdate(logoFileId: number | undefined): { logo: number } | {} {
        return logoFileId ? { logo: logoFileId } : {};
    }

    /**
     * Full logo update workflow - upload file and return update object
     */
    async processLogoUpdate(
        logoFile: File | undefined,
        uploadedBy: string
    ): Promise<{ logo: number } | {}> {
        const logoFileId = await this.uploadLogo(logoFile, uploadedBy);
        return this.includeLogoUpdate(logoFileId);
    }

    /**
     * Full logo update workflow within a transaction
     */
    async processLogoUpdateInTransaction(
        tx: any,
        logoFile: File | undefined,
        uploadedBy: string
    ): Promise<{ logo: number } | {}> {
        const logoFileId = await this.uploadLogoInTransaction(tx, logoFile, uploadedBy);
        return this.includeLogoUpdate(logoFileId);
    }
}
