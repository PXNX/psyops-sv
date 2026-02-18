// Moderation service
import type { Database } from '../../db';
import { generalReports, userWarnings, chatRestrictions } from '../../schema';
import { eq } from 'drizzle-orm';

export class ModerationService {
    constructor(private db: typeof import('../../db').db) { }

    async createReport(data: typeof generalReports.$inferInsert) {
        const [report] = await this.db.insert(generalReports).values(data).returning();
        return report;
    }

    async getReportById(reportId: number) {
        const result = await this.db.select().from(generalReports).where(eq(generalReports.id, reportId));
        return result[0] || null;
    }

    async resolveReport(
        reportId: number,
        reviewedBy: string,
        status: 'resolved' | 'dismissed',
        reviewNote?: string,
        actionTaken?: string
    ) {
        await this.db
            .update(generalReports)
            .set({
                status: status as any,
                reviewedBy,
                reviewedAt: new Date(),
                reviewNote,
                actionTaken: actionTaken as any
            })
            .where(eq(generalReports.id, reportId));
    }

    async warnUser(userId: string, reason: string, description: string, issuedBy: string) {
        const [warning] = await this.db
            .insert(userWarnings)
            .values({
                userId,
                reason: reason as any,
                description,
                issuedBy
            })
            .returning();
        return warning;
    }

    async restrictUser(
        userId: string,
        reason: string,
        restrictedBy: string,
        expiresAt?: Date,
        isPermanent: boolean = false
    ) {
        const [restriction] = await this.db
            .insert(chatRestrictions)
            .values({
                userId,
                reason,
                restrictedBy,
                expiresAt,
                isPermanent
            })
            .returning();
        return restriction;
    }

    async getUserRestriction(userId: string) {
        const result = await this.db
            .select()
            .from(chatRestrictions)
            .where(eq(chatRestrictions.userId, userId));
        return result[0] || null;
    }
}
